import { createHash } from 'node:crypto';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { listings } from '../db/schema';
import { connectRedis, getRedis, REDIS_KEYS } from './redis';
import { recordListingEvent } from './analytics/listing-events';
import type { ListingSearchFilters, ListingSummary, SearchResult } from '../types/listing';
import { buildListingPath } from './urls';

function toSummary(row: typeof listings.$inferSelect): ListingSummary {
  return {
    id: row.id,
    slug: row.slug,
    shortCode: row.shortCode,
    path: buildListingPath(row.slug, row.shortCode),
    title: row.title,
    category: row.category,
    rentType: row.rentType,
    rentPerMonth: row.costs.rentPerMonth,
    sizeSqm: row.sizeSqm,
    rooms: row.rooms,
    floorLevel: row.floorLevel,
    neighborhood: row.neighborhood,
    availableFrom: row.availableFrom.toISOString(),
    availableTo: row.availableTo?.toISOString() ?? null,
    anmeldungAvailable: row.anmeldungAvailable,
    schufaRequired: row.schufaRequired,
    onlineViewingAvailable: row.onlineViewingAvailable,
    lat: row.lat,
    lng: row.lng,
    approximateLocation: row.approximateLocation,
    primaryPhotoUrl: row.photoUrls[0] ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function matchesListingFilters(item: ListingSummary, filters: ListingSearchFilters): boolean {
  if (filters.category && item.category !== filters.category) return false;
  if (filters.rentType && item.rentType !== filters.rentType) return false;
  if (filters.minPrice !== undefined && item.rentPerMonth < filters.minPrice) return false;
  if (filters.maxPrice !== undefined && item.rentPerMonth > filters.maxPrice) return false;
  if (filters.minSize !== undefined && item.sizeSqm < filters.minSize) return false;
  if (filters.maxSize !== undefined && item.sizeSqm > filters.maxSize) return false;
  if (filters.minRooms !== undefined && item.rooms < filters.minRooms) return false;
  if (filters.maxRooms !== undefined && item.rooms > filters.maxRooms) return false;
  if (filters.anmeldungAvailable && !item.anmeldungAvailable) return false;
  if (filters.schufaRequired !== undefined && item.schufaRequired !== filters.schufaRequired) return false;
  if (filters.neighborhood && item.neighborhood !== filters.neighborhood) return false;
  if (filters.availableFrom) {
    const from = new Date(filters.availableFrom);
    if (new Date(item.availableFrom) > from) return false;
  }
  if (filters.availableTo && item.availableTo) {
    const to = new Date(filters.availableTo);
    if (new Date(item.availableTo) < to) return false;
  }
  return true;
}

function cacheKey(filters: ListingSearchFilters): string {
  return createHash('md5').update(JSON.stringify(filters)).digest('hex');
}

export async function warmListingCache(): Promise<number> {
  await connectRedis();
  const redis = getRedis();
  const rows = await db.query.listings.findMany({
    where: and(eq(listings.status, 'active'), eq(listings.moderationStatus, 'approved')),
  });

  const pipeline = redis.pipeline();
  pipeline.del(REDIS_KEYS.listingsIndex);
  pipeline.del(REDIS_KEYS.geoIndex);

  for (const row of rows) {
    const summary = toSummary(row);
    pipeline.sadd(REDIS_KEYS.listingsIndex, row.id);
    pipeline.set(REDIS_KEYS.listingData(row.id), JSON.stringify(summary));
    pipeline.geoadd(REDIS_KEYS.geoIndex, row.lng, row.lat, row.id);
  }

  pipeline.set(REDIS_KEYS.listingsIndexReady, '1');
  await pipeline.exec();
  return rows.length;
}

let warmInFlight: Promise<number> | null = null;

function warmListingCacheOnce(): Promise<number> {
  if (!warmInFlight) {
    warmInFlight = warmListingCache().finally(() => {
      warmInFlight = null;
    });
  }
  return warmInFlight;
}

async function searchFromRedis(filters: ListingSearchFilters): Promise<ListingSummary[] | null> {
  try {
    await connectRedis();
    const redis = getRedis();
    // The index is maintained incrementally (by both the web app and workers), so
    // a single index op after a Redis flush/restart can leave a partial set that
    // would silently hide listings. Only trust the index once it has been fully
    // warmed; otherwise rebuild it in the background and serve from Postgres.
    const ready = await redis.get(REDIS_KEYS.listingsIndexReady);
    if (!ready) {
      void warmListingCacheOnce().catch(() => {});
      return null;
    }
    const ids = await redis.smembers(REDIS_KEYS.listingsIndex);
    if (ids.length === 0) return null;

    const pipeline = redis.pipeline();
    for (const id of ids) {
      pipeline.get(REDIS_KEYS.listingData(id));
    }
    const results = await pipeline.exec();
    if (!results) return null;

    const items: ListingSummary[] = [];
    for (const [err, data] of results) {
      if (err || !data) continue;
      items.push(JSON.parse(data as string));
    }
    return items.filter((item) => matchesListingFilters(item, filters));
  } catch {
    return null;
  }
}

async function searchFromPostgres(filters: ListingSearchFilters): Promise<ListingSummary[]> {
  const conditions = [eq(listings.status, 'active'), eq(listings.moderationStatus, 'approved')];

  if (filters.category) conditions.push(eq(listings.category, filters.category));
  if (filters.rentType) conditions.push(eq(listings.rentType, filters.rentType));
  if (filters.neighborhood) conditions.push(eq(listings.neighborhood, filters.neighborhood));
  if (filters.anmeldungAvailable) conditions.push(eq(listings.anmeldungAvailable, true));
  if (filters.schufaRequired !== undefined) {
    conditions.push(eq(listings.schufaRequired, filters.schufaRequired));
  }
  if (filters.minPrice !== undefined) {
    conditions.push(sql`(${listings.costs}->>'rentPerMonth')::int >= ${filters.minPrice}`);
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(sql`(${listings.costs}->>'rentPerMonth')::int <= ${filters.maxPrice}`);
  }
  if (filters.minSize !== undefined) conditions.push(gte(listings.sizeSqm, filters.minSize));
  if (filters.maxSize !== undefined) conditions.push(lte(listings.sizeSqm, filters.maxSize));
  if (filters.minRooms !== undefined) conditions.push(gte(listings.rooms, filters.minRooms));
  if (filters.maxRooms !== undefined) conditions.push(lte(listings.rooms, filters.maxRooms));
  if (filters.availableFrom) {
    conditions.push(lte(listings.availableFrom, new Date(filters.availableFrom)));
  }

  const rows = await db.query.listings.findMany({
    where: and(...conditions),
    orderBy: (table, { desc }) =>
      filters.sort === 'updated'
        ? [desc(table.updatedAt)]
        : [desc(table.publishedAt), desc(table.createdAt)],
  });

  return rows.map(toSummary).filter((item) => matchesListingFilters(item, filters));
}

export async function searchListings(filters: ListingSearchFilters = {}): Promise<SearchResult> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 12));
  const key = cacheKey({ ...filters, page, limit });

  try {
    await connectRedis();
    const redis = getRedis();
    const cached = await redis.get(REDIS_KEYS.searchCache(key));
    if (cached) return JSON.parse(cached);
  } catch {
    // fall through
  }

  let items = (await searchFromRedis(filters)) ?? (await searchFromPostgres(filters));
  if (filters.sort === 'updated') {
    items.sort(
      (a, b) =>
        new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime(),
    );
  } else {
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const paged = items.slice(offset, offset + limit);

  const result: SearchResult = { items: paged, total, page, limit, totalPages };

  try {
    const redis = getRedis();
    await redis.setex(REDIS_KEYS.searchCache(key), 60, JSON.stringify(result));
  } catch {
    // ignore cache write failures
  }

  return result;
}

export async function indexListing(id: string): Promise<void> {
  const row = await db.query.listings.findFirst({ where: eq(listings.id, id) });
  if (!row || row.status !== 'active' || row.moderationStatus !== 'approved') {
    await removeListingFromIndex(id);
    return;
  }

  await connectRedis();
  const redis = getRedis();
  const summary = toSummary(row);
  const pipeline = redis.pipeline();
  pipeline.sadd(REDIS_KEYS.listingsIndex, id);
  pipeline.set(REDIS_KEYS.listingData(id), JSON.stringify(summary));
  pipeline.geoadd(REDIS_KEYS.geoIndex, row.lng, row.lat, id);
  await pipeline.exec();
  await recordListingEvent(id, 'published', row.publishedAt ?? row.createdAt);
}

export async function removeListingFromIndex(id: string): Promise<void> {
  await connectRedis();
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.srem(REDIS_KEYS.listingsIndex, id);
  pipeline.del(REDIS_KEYS.listingData(id));
  pipeline.zrem(REDIS_KEYS.geoIndex, id);
  await pipeline.exec();
  await recordListingEvent(id, 'unpublished');
}

export { toSummary };
