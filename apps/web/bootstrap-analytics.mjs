import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@clickhouse/client';
import postgres from 'postgres';

const rootDir = dirname(fileURLToPath(import.meta.url));

function getSchemaPath() {
  const fromEnv = process.env.CLICKHOUSE_SCHEMA_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const candidates = [
    join(rootDir, '../../clickhouse/schema.sql'),
    '/app/clickhouse/schema.sql',
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(`ClickHouse schema not found. Tried: ${candidates.join(', ')}`);
}

function createClickHouseClient() {
  const url = process.env.CLICKHOUSE_URL?.trim();
  if (!url) throw new Error('CLICKHOUSE_URL is required');

  const parsed = new URL(url);
  const username = decodeURIComponent(parsed.username || process.env.CLICKHOUSE_USER || 'default');
  const password = decodeURIComponent(parsed.password || process.env.CLICKHOUSE_PASSWORD || '');
  const database = process.env.CLICKHOUSE_DATABASE?.trim() || 'renting_berlin';

  return createClient({
    url: `${parsed.protocol}//${parsed.host}`,
    username,
    password,
    database,
  });
}

async function applySchema(ch) {
  const sql = readFileSync(getSchemaPath(), 'utf8');
  for (const statement of sql.split(';').map((part) => part.trim()).filter(Boolean)) {
    await ch.command({ query: statement });
  }
}

async function tableIsEmpty(ch, table) {
  const result = await ch.query({
    query: `SELECT 1 FROM ${table} LIMIT 1`,
    format: 'JSONEachRow',
  });
  const rows = await result.json();
  return rows.length === 0;
}

async function backfillListingEvents(ch, sql) {
  if (!(await tableIsEmpty(ch, 'listing_events'))) {
    console.log('[analytics-bootstrap] listing_events already populated — skipping backfill');
    return;
  }

  const listings = await sql`
    SELECT id, published_at
    FROM listings
    WHERE status = 'active'
      AND moderation_status = 'approved'
      AND published_at IS NOT NULL
  `;

  if (listings.length === 0) {
    console.log('[analytics-bootstrap] No active listings to backfill into listing_events');
    return;
  }

  await ch.insert({
    table: 'listing_events',
    values: listings.map((row) => ({
      listing_id: row.id,
      event_type: 'published',
      published_at: row.published_at,
    })),
    format: 'JSONEachRow',
  });
  console.log(`[analytics-bootstrap] Backfilled ${listings.length} listing_events rows`);
}

async function backfillSiteVisits(ch, sql) {
  if (!(await tableIsEmpty(ch, 'site_visits'))) {
    console.log('[analytics-bootstrap] site_visits already populated — skipping backfill');
    return;
  }

  let visits = [];
  try {
    visits = await sql`
      SELECT id, last_offers_visit_at
      FROM users
      WHERE last_offers_visit_at IS NOT NULL
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[analytics-bootstrap] site_visits backfill skipped (${message})`);
    return;
  }

  if (visits.length === 0) {
    console.log('[analytics-bootstrap] No stored offers visits to backfill into site_visits');
    return;
  }

  await ch.insert({
    table: 'site_visits',
    values: visits.map((row) => ({
      visitor_id: row.id,
      page: 'offers',
      visited_at: row.last_offers_visit_at,
    })),
    format: 'JSONEachRow',
  });
  console.log(`[analytics-bootstrap] Backfilled ${visits.length} site_visits rows`);
}

async function main() {
  const chUrl = process.env.CLICKHOUSE_URL?.trim();
  if (!chUrl) {
    console.log('[analytics-bootstrap] CLICKHOUSE_URL not set — skipping');
    return;
  }

  const dbUrl = process.env.DATABASE_URL?.trim();
  const ch = createClickHouseClient();

  console.log('[analytics-bootstrap] Applying ClickHouse schema…');
  await applySchema(ch);
  console.log('[analytics-bootstrap] ClickHouse schema applied');

  if (!dbUrl) {
    console.warn('[analytics-bootstrap] DATABASE_URL not set — skipping Postgres backfill');
    await ch.close();
    return;
  }

  const sql = postgres(dbUrl, { max: 1 });
  try {
    await backfillListingEvents(ch, sql);
    await backfillSiteVisits(ch, sql);
  } finally {
    await sql.end();
    await ch.close();
  }

  console.log('[analytics-bootstrap] Done');
}

main().catch((error) => {
  console.error('[analytics-bootstrap] Failed:', error);
  process.exit(1);
});
