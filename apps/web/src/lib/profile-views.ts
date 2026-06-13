import { desc, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { profileViews, tenantRequests, users } from '../db/schema';
import type { ProfileVisitor } from '../types/tenant-request';
import { getUserHandle } from './user-handle';

export async function recordProfileView(profileUserId: string, viewerId: string) {
  if (viewerId === profileUserId) return;

  const now = new Date();
  await db
    .insert(profileViews)
    .values({
      id: nanoid(),
      profileUserId,
      viewerId,
      firstViewedAt: now,
      lastViewedAt: now,
    })
    .onConflictDoUpdate({
      target: [profileViews.profileUserId, profileViews.viewerId],
      set: { lastViewedAt: now },
    });
}

export async function getProfileVisitors(profileUserId: string, ownerId: string): Promise<ProfileVisitor[]> {
  if (profileUserId !== ownerId) return [];

  const rows = await db
    .select({
      viewerId: profileViews.viewerId,
      viewerName: users.name,
      viewerImage: users.image,
      viewerHandle: users.handle,
      firstViewedAt: profileViews.firstViewedAt,
      lastViewedAt: profileViews.lastViewedAt,
    })
    .from(profileViews)
    .innerJoin(users, eq(profileViews.viewerId, users.id))
    .where(eq(profileViews.profileUserId, profileUserId))
    .orderBy(desc(profileViews.lastViewedAt));

  return rows.map((r) => ({
    viewerId: r.viewerId,
    viewerName: r.viewerName,
    viewerImage: r.viewerImage,
    viewerHandle: r.viewerHandle,
    firstViewedAt: r.firstViewedAt.toISOString(),
    lastViewedAt: r.lastViewedAt.toISOString(),
  }));
}

export async function getProfileViewCount(profileUserId: string, ownerId: string): Promise<number> {
  if (profileUserId !== ownerId) return 0;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(profileViews)
    .where(eq(profileViews.profileUserId, profileUserId));

  return count;
}

export async function getProfileViewsForAccount(userId: string): Promise<{
  handle: string | null;
  seekerTitle: string | null;
  visitors: ProfileVisitor[];
}> {
  const handle = await getUserHandle(userId);
  const requests = await db.query.tenantRequests.findMany({
    where: eq(tenantRequests.seekerId, userId),
    orderBy: (table, { desc: d }) => [d(table.updatedAt)],
    limit: 1,
  });
  const request = requests[0];

  if (!handle) {
    return { handle: null, seekerTitle: request?.title ?? null, visitors: [] };
  }

  const visitors = await getProfileVisitors(userId, userId);
  return {
    handle,
    seekerTitle: request?.title ?? null,
    visitors,
  };
}

/** @deprecated use getProfileViewsForAccount */
export async function getProfileViewsForSeeker(seekerId: string) {
  const data = await getProfileViewsForAccount(seekerId);
  return {
    profile: data.handle
      ? { handle: data.handle, title: data.seekerTitle ?? 'Your profile', id: seekerId }
      : null,
    visitors: data.visitors,
  };
}
