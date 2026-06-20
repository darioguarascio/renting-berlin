import { and, eq, gt, isNotNull, sql } from 'drizzle-orm';
import { db } from '../../db';
import { listings } from '../../db/schema';
import { clickhouseConfigured, getClickHouse } from '../clickhouse/client';
import { toClickHouseDateTime } from '../clickhouse/datetime';

export type ListingEventType = 'published' | 'unpublished';

let backfillPromise: Promise<void> | null = null;

async function countPublishedListingsSincePg(since: Date): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(
      and(
        eq(listings.status, 'active'),
        eq(listings.moderationStatus, 'approved'),
        isNotNull(listings.publishedAt),
        gt(listings.publishedAt, since),
      ),
    );
  return count;
}

async function countPublishedListingsSinceCh(since: Date): Promise<number | null> {
  const ch = await getClickHouse();
  if (!ch) return null;

  try {
    const result = await ch.query({
      query: `
        SELECT count() AS count
        FROM (
          SELECT listing_id
          FROM listing_events
          GROUP BY listing_id
          HAVING argMax(event_type, published_at) = 'published'
            AND maxIf(published_at, event_type = 'published') > {since:DateTime64(3, 'UTC')}
        )
      `,
      query_params: { since },
      format: 'JSONEachRow',
    });
    const rows = await result.json<{ count: string | number }>();
    return Number(rows[0]?.count ?? 0);
  } catch (error) {
    console.warn('[listings] ClickHouse count failed:', error);
    return null;
  }
}

async function backfillListingEventsIfNeeded(): Promise<void> {
  const ch = await getClickHouse();
  if (!ch) return;

  try {
    const check = await ch.query({
      query: 'SELECT 1 FROM listing_events LIMIT 1',
      format: 'JSONEachRow',
    });
    const existing = await check.json();
    if (existing.length > 0) return;

    const rows = await db.query.listings.findMany({
      where: and(
        eq(listings.status, 'active'),
        eq(listings.moderationStatus, 'approved'),
        isNotNull(listings.publishedAt),
      ),
      columns: { id: true, publishedAt: true },
    });
    if (rows.length === 0) return;

    await ch.insert({
      table: 'listing_events',
      values: rows.map((row) => ({
        listing_id: row.id,
        event_type: 'published',
        published_at: toClickHouseDateTime(row.publishedAt!),
      })),
      format: 'JSONEachRow',
    });
  } catch (error) {
    console.warn('[listings] ClickHouse backfill failed:', error);
  }
}

function ensureListingEventsBackfill(): Promise<void> {
  if (!backfillPromise) {
    backfillPromise = backfillListingEventsIfNeeded();
  }
  return backfillPromise;
}

export async function recordListingEvent(
  listingId: string,
  eventType: ListingEventType,
  publishedAt: Date = new Date(),
): Promise<void> {
  const ch = await getClickHouse();
  if (!ch) return;

  try {
    await ch.insert({
      table: 'listing_events',
      values: [
        {
          listing_id: listingId,
          event_type: eventType,
          published_at: toClickHouseDateTime(publishedAt),
        },
      ],
      format: 'JSONEachRow',
    });
  } catch (error) {
    console.warn('[listings] ClickHouse event mirror failed:', error);
  }
}

export async function countPublishedListingsSince(since: Date): Promise<number> {
  if (clickhouseConfigured()) {
    await ensureListingEventsBackfill();
    const chCount = await countPublishedListingsSinceCh(since);
    if (chCount !== null) return chCount;
  }

  return countPublishedListingsSincePg(since);
}
