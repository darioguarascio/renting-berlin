import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db';
import { listings, tenantRequests, users } from '../db/schema';
import { accountProfileHref } from './urls';

export interface UserPublicProfileInfo {
  handle: string | null;
  profileHref: string | null;
  hasSeekerProfile: boolean;
  activeListingCount: number;
}

export async function getUserPublicProfileInfos(
  userIds: string[],
): Promise<Map<string, UserPublicProfileInfo>> {
  const unique = [...new Set(userIds)];
  const result = new Map<string, UserPublicProfileInfo>();
  if (unique.length === 0) return result;

  const [userRows, seekerRows, listingCounts] = await Promise.all([
    db.query.users.findMany({
      where: inArray(users.id, unique),
      columns: { id: true, handle: true },
    }),
    db.query.tenantRequests.findMany({
      where: and(inArray(tenantRequests.seekerId, unique), eq(tenantRequests.status, 'active')),
      columns: { seekerId: true },
    }),
    db
      .select({ publisherId: listings.publisherId, count: sql<number>`count(*)::int` })
      .from(listings)
      .where(and(inArray(listings.publisherId, unique), eq(listings.status, 'active')))
      .groupBy(listings.publisherId),
  ]);

  const handleById = new Map(userRows.map((user) => [user.id, user.handle]));
  const seekerIds = new Set(seekerRows.map((row) => row.seekerId));
  const listingCountById = new Map(listingCounts.map((row) => [row.publisherId, row.count]));

  for (const id of unique) {
    const handle = handleById.get(id) ?? null;
    result.set(id, {
      handle,
      profileHref: handle ? accountProfileHref(handle) : null,
      hasSeekerProfile: seekerIds.has(id),
      activeListingCount: listingCountById.get(id) ?? 0,
    });
  }

  return result;
}