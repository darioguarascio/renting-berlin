import { eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { tenantRequests, users } from '../db/schema';
import type { ProfileVisitor } from '../types/tenant-request';
import {
  getProfileVisitorCount,
  getProfileVisitorStats,
  recordViewEvent,
} from './analytics/view-events';
import { enqueueProfileViewEvent } from './profile-view-events';
import { getUserHandle } from './user-handle';

function profileViewsSyncEnabled(): boolean {
  return process.env.PROFILE_VIEWS_SYNC === '1';
}

import { notifyProfileViewEmail } from './user-notifications';

export async function recordProfileView(profileUserId: string, viewerId: string) {
  if (viewerId === profileUserId) return;

  if (profileViewsSyncEnabled()) {
    const isNew = await recordViewEvent('profile', profileUserId, viewerId);
    if (isNew) {
      void notifyProfileViewEmail({ profileUserId, viewerId }).catch(() => {});
    }
    return;
  }

  try {
    await enqueueProfileViewEvent(profileUserId, viewerId);
  } catch {
    const isNew = await recordViewEvent('profile', profileUserId, viewerId);
    if (isNew) {
      void notifyProfileViewEmail({ profileUserId, viewerId }).catch(() => {});
    }
  }
}

export async function getProfileVisitors(profileUserId: string, ownerId: string): Promise<ProfileVisitor[]> {
  if (profileUserId !== ownerId) return [];

  const stats = await getProfileVisitorStats(profileUserId);
  if (stats.length === 0) return [];

  const viewerIds = stats.map((row) => row.viewerId);
  const viewerRows = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
      handle: users.handle,
    })
    .from(users)
    .where(inArray(users.id, viewerIds));

  const viewersById = new Map(viewerRows.map((row) => [row.id, row]));

  return stats
    .map((stat) => {
      const viewer = viewersById.get(stat.viewerId);
      if (!viewer) return null;
      return {
        viewerId: stat.viewerId,
        viewerName: viewer.name,
        viewerImage: viewer.image,
        viewerHandle: viewer.handle,
        firstViewedAt: stat.firstViewedAt.toISOString(),
        lastViewedAt: stat.lastViewedAt.toISOString(),
      };
    })
    .filter((row): row is ProfileVisitor => row !== null);
}

export async function getProfileViewCount(profileUserId: string, ownerId: string): Promise<number> {
  if (profileUserId !== ownerId) return 0;
  return getProfileVisitorCount(profileUserId);
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
