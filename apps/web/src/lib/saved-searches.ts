import { createHash } from 'node:crypto';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { listings, savedSearches, searchNotifications, tenantRequests, users } from '../db/schema';
import { matchesListingFilters, searchListings, toSummary } from './search';
import { matchesTenantRequestFilters, searchTenantRequests } from './tenant-requests';
import type { ListingSearchFilters, ListingSummary } from '../types/listing';
import type { TenantRequestFilters } from './tenant-requests';
import { CATEGORY_LABELS, NEIGHBORHOOD_LABELS, RENT_TYPE_LABELS } from '../types/listing';
import { seekerProfileHref } from './urls';
import { shouldNotifyInApp } from './notification-preferences';

export type SavedSearchType = 'listings' | 'tenant_requests';

export interface SavedSearchRecord {
  id: string;
  type: SavedSearchType;
  name: string;
  filters: Record<string, unknown>;
  notifyEnabled: boolean;
  searchUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchNotificationRecord {
  id: string;
  savedSearchId: string;
  searchType: SavedSearchType;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

const PAGINATION_KEYS = new Set(['page', 'limit', 'view']);

export function normalizeFilters(filters: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (PAGINATION_KEYS.has(key)) continue;
    if (value === undefined || value === '' || value === false) continue;
    out[key] = value;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export function filtersHash(type: SavedSearchType, filters: Record<string, unknown>): string {
  return createHash('md5')
    .update(JSON.stringify({ type, filters: normalizeFilters(filters) }))
    .digest('hex');
}

export function buildSearchUrl(type: SavedSearchType, filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(normalizeFilters(filters))) {
    params.set(key, String(value));
  }
  const base = type === 'listings' ? '/offers' : '/requests';
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function generateSearchName(type: SavedSearchType, filters: Record<string, unknown>): string {
  const parts: string[] = [];
  const f = normalizeFilters(filters);

  if (type === 'listings') {
    const lf = f as ListingSearchFilters;
    if (lf.neighborhood) {
      parts.push(NEIGHBORHOOD_LABELS[lf.neighborhood as keyof typeof NEIGHBORHOOD_LABELS] ?? lf.neighborhood);
    }
    if (lf.category) parts.push(CATEGORY_LABELS[lf.category]);
    if (lf.rentType) parts.push(RENT_TYPE_LABELS[lf.rentType]);
    if (lf.maxPrice) parts.push(`max €${lf.maxPrice}`);
    if (lf.minRooms) parts.push(`${lf.minRooms}+ rooms`);
    if (lf.anmeldungAvailable) parts.push('Anmeldung');
    if (parts.length === 0) parts.push('All Berlin listings');
    return parts.join(' · ');
  }

  const tf = f as TenantRequestFilters;
  if (tf.neighborhood) {
    parts.push(NEIGHBORHOOD_LABELS[tf.neighborhood as keyof typeof NEIGHBORHOOD_LABELS] ?? tf.neighborhood);
  }
  if (tf.category) parts.push(CATEGORY_LABELS[tf.category]);
  if (tf.maxBudget) parts.push(`max €${tf.maxBudget}`);
  if (tf.anmeldungNeeded) parts.push('Anmeldung');
  if (tf.hasSchufa) parts.push('SCHUFA');
  if (parts.length === 0) parts.push('All seeker profiles');
  return parts.join(' · ');
}

async function getCurrentMatchingIds(type: SavedSearchType, filters: Record<string, unknown>): Promise<string[]> {
  if (type === 'listings') {
    const result = await searchListings({ ...(filters as ListingSearchFilters), page: 1, limit: 500 });
    return result.items.map((i) => i.id);
  }
  const result = await searchTenantRequests({ ...(filters as TenantRequestFilters), page: 1, limit: 500 });
  return result.items.map((i) => i.id);
}

function toSavedSearchRecord(row: typeof savedSearches.$inferSelect): SavedSearchRecord {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    filters: row.filters,
    notifyEnabled: row.notifyEnabled,
    searchUrl: buildSearchUrl(row.type, row.filters),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSavedSearches(userId: string): Promise<SavedSearchRecord[]> {
  const rows = await db.query.savedSearches.findMany({
    where: eq(savedSearches.userId, userId),
    orderBy: (table, { desc: d }) => [d(table.updatedAt)],
  });
  return rows.map(toSavedSearchRecord);
}

export async function createSavedSearch(
  userId: string,
  type: SavedSearchType,
  filters: Record<string, unknown>,
  name?: string,
) {
  const normalized = normalizeFilters(filters);
  const hash = filtersHash(type, normalized);
  const now = new Date();

  const existing = await db.query.savedSearches.findFirst({
    where: and(eq(savedSearches.userId, userId), eq(savedSearches.filterHash, hash)),
  });
  if (existing) {
    return { saved: toSavedSearchRecord(existing), created: false };
  }

  const lastKnownIds = await getCurrentMatchingIds(type, normalized);
  const id = nanoid();

  const [row] = await db
    .insert(savedSearches)
    .values({
      id,
      userId,
      type,
      name: name?.trim() || generateSearchName(type, normalized),
      filters: normalized,
      filterHash: hash,
      notifyEnabled: true,
      lastKnownIds,
      updatedAt: now,
    })
    .returning();

  return { saved: toSavedSearchRecord(row), created: true };
}

export async function updateSavedSearch(
  userId: string,
  id: string,
  patch: { notifyEnabled?: boolean; name?: string },
) {
  const row = await db.query.savedSearches.findFirst({
    where: and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)),
  });
  if (!row) return null;

  const [updated] = await db
    .update(savedSearches)
    .set({
      notifyEnabled: patch.notifyEnabled ?? row.notifyEnabled,
      name: patch.name?.trim() || row.name,
      updatedAt: new Date(),
    })
    .where(eq(savedSearches.id, id))
    .returning();

  return toSavedSearchRecord(updated);
}

export async function deleteSavedSearch(userId: string, id: string): Promise<boolean> {
  const row = await db.query.savedSearches.findFirst({
    where: and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)),
  });
  if (!row) return false;
  await db.delete(savedSearches).where(eq(savedSearches.id, id));
  return true;
}

async function appendKnownId(savedSearchId: string, itemId: string, current: string[]) {
  if (current.includes(itemId)) return;
  await db
    .update(savedSearches)
    .set({
      lastKnownIds: [...current, itemId],
      updatedAt: new Date(),
    })
    .where(eq(savedSearches.id, savedSearchId));
}

export async function notifyNewListing(listingId: string) {
  const row = await db.query.listings.findFirst({ where: eq(listings.id, listingId) });
  if (!row || row.status !== 'active') return;

  const item = toSummary(row);
  const saved = await db.query.savedSearches.findMany({
    where: and(eq(savedSearches.type, 'listings'), eq(savedSearches.notifyEnabled, true)),
  });

  for (const search of saved) {
    const filters = search.filters as ListingSearchFilters;
    if (!matchesListingFilters(item, filters)) continue;
    if (search.lastKnownIds.includes(item.id)) continue;
    if (search.userId === row.publisherId) continue;
    if (!(await shouldNotifyInApp(search.userId, 'saved_searches'))) continue;

    await createSearchNotification({
      userId: search.userId,
      savedSearchId: search.id,
      searchType: 'listings',
      itemId: item.id,
      title: 'New listing matches your search',
      body: item.title,
      link: `/listings/${item.path}`,
    });
    await appendKnownId(search.id, item.id, search.lastKnownIds);
  }
}

export async function notifyNewTenantRequest(requestId: string) {
  const row = await db.query.tenantRequests.findFirst({ where: eq(tenantRequests.id, requestId) });
  if (!row || row.status !== 'active') return;

  const seeker = await db.query.users.findFirst({
    where: eq(users.id, row.seekerId),
    columns: { handle: true },
  });
  if (!seeker?.handle) return;

  const saved = await db.query.savedSearches.findMany({
    where: and(eq(savedSearches.type, 'tenant_requests'), eq(savedSearches.notifyEnabled, true)),
  });

  for (const search of saved) {
    const filters = search.filters as TenantRequestFilters;
    if (!matchesTenantRequestFilters(row, filters)) continue;
    if (search.lastKnownIds.includes(row.id)) continue;
    if (search.userId === row.seekerId) continue;
    if (!(await shouldNotifyInApp(search.userId, 'saved_searches'))) continue;

    await createSearchNotification({
      userId: search.userId,
      savedSearchId: search.id,
      searchType: 'tenant_requests',
      itemId: row.id,
      title: 'New seeker matches your search',
      body: row.title,
      link: seekerProfileHref(seeker.handle),
    });
    await appendKnownId(search.id, row.id, search.lastKnownIds);
  }
}

async function createSearchNotification(input: {
  userId: string;
  savedSearchId: string;
  searchType: SavedSearchType;
  itemId: string;
  title: string;
  body: string;
  link: string;
}) {
  try {
    await db.insert(searchNotifications).values({
      id: nanoid(),
      userId: input.userId,
      savedSearchId: input.savedSearchId,
      searchType: input.searchType,
      itemId: input.itemId,
      title: input.title,
      body: input.body,
      link: input.link,
    });
  } catch {
    // duplicate notification for same search+item
  }
}

export async function listSearchNotifications(userId: string, limit = 20): Promise<SearchNotificationRecord[]> {
  const rows = await db.query.searchNotifications.findMany({
    where: eq(searchNotifications.userId, userId),
    orderBy: (table, { desc: d }) => [d(table.createdAt)],
    limit,
  });
  return rows.map((r) => ({
    id: r.id,
    savedSearchId: r.savedSearchId,
    searchType: r.searchType,
    title: r.title,
    body: r.body,
    link: r.link,
    readAt: r.readAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getUnreadSearchNotificationCount(userId: string): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(searchNotifications)
    .where(and(eq(searchNotifications.userId, userId), isNull(searchNotifications.readAt)));
  return count;
}

export async function markSearchNotificationRead(userId: string, id: string) {
  await db
    .update(searchNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(searchNotifications.id, id), eq(searchNotifications.userId, userId)));
}

export async function markAllSearchNotificationsRead(userId: string) {
  await db
    .update(searchNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(searchNotifications.userId, userId), isNull(searchNotifications.readAt)));
}

export type { ListingSummary };
