import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ??
  (typeof import.meta !== 'undefined' && 'env' in import.meta
    ? (import.meta.env as Record<string, string | undefined>).DATABASE_URL
    : undefined);

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(connectionString, {
  max: process.env.NODE_ENV === 'test' ? 5 : 10,
  idle_timeout: process.env.NODE_ENV === 'test' ? 2 : undefined,
});

export const db = drizzle(client, { schema });

export async function closeDb(): Promise<void> {
  await client.end({ timeout: 5 });
}

export type Database = typeof db;
