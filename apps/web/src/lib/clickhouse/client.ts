import type { ClickHouseClient } from '@clickhouse/client';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let client: ClickHouseClient | null = null;
let schemaReady: Promise<void> | null = null;
let createClientFn: typeof import('@clickhouse/client').createClient | null = null;

async function loadCreateClient() {
  if (!createClientFn) {
    const mod = await import('@clickhouse/client');
    createClientFn = mod.createClient;
  }
  return createClientFn;
}

export function clickhouseConfigured(): boolean {
  return Boolean(process.env.CLICKHOUSE_URL?.trim());
}

function getDatabase(): string {
  return process.env.CLICKHOUSE_DATABASE?.trim() || 'renting_berlin';
}

async function createClickHouseClient(): Promise<ClickHouseClient> {
  const createClient = await loadCreateClient();
  const url = process.env.CLICKHOUSE_URL!.trim();
  const parsed = new URL(url);
  const username = decodeURIComponent(parsed.username || process.env.CLICKHOUSE_USER || 'default');
  const password = decodeURIComponent(parsed.password || process.env.CLICKHOUSE_PASSWORD || '');

  return createClient({
    url: `${parsed.protocol}//${parsed.host}`,
    username,
    password,
    database: getDatabase(),
  });
}

function getSchemaPath(): string {
  const fromEnv = process.env.CLICKHOUSE_SCHEMA_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const candidates = [
    join(process.cwd(), '../../clickhouse/schema.sql'),
    join(dirname(fileURLToPath(import.meta.url)), '../../../../clickhouse/schema.sql'),
    '/app/clickhouse/schema.sql',
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    `ClickHouse schema not found. Set CLICKHOUSE_SCHEMA_PATH or include clickhouse/schema.sql in the image. Tried: ${candidates.join(', ')}`,
  );
}

async function ensureSchema(ch: ClickHouseClient): Promise<void> {
  const schemaPath = getSchemaPath();
  const sql = readFileSync(schemaPath, 'utf8');
  const statements = sql
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await ch.command({ query: statement });
  }
}

export async function getClickHouse(): Promise<ClickHouseClient | null> {
  if (!clickhouseConfigured()) return null;

  if (!client) {
    try {
      client = await createClickHouseClient();
    } catch {
      return null;
    }
  }

  if (!schemaReady) {
    schemaReady = ensureSchema(client);
  }

  try {
    await schemaReady;
    return client;
  } catch {
    // ClickHouse unreachable or schema failed — reset and fall back to Postgres
    schemaReady = null;
    client = null;
    return null;
  }
}

export async function closeClickHouse(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    schemaReady = null;
  }
}
