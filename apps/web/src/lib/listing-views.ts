import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { tenantRequests, users } from '../db/schema';
import type { ProfileVisitor } from '../types/tenant-request';
import { getListingVisitorStats, recordViewEvent } from './analytics/view-events';

export async function recordListingView(listingId: string, viewerId: string) {
  await recordViewEvent('listing', listingId, viewerId);
}

export async function getListingVisitors(
  listingId: string,
  ownerId: string,
): Promise<ProfileVisitor[]> {
  const stats = await getListingVisitorStats(listingId);
  if (stats.length === 0) return [];

  const viewerIds = stats.map((row) => row.viewerId).filter((id) => id !== ownerId);
  if (viewerIds.length === 0) return [];

  const [viewerRows, seekerRows] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, image: users.image, handle: users.handle })
      .from(users)
      .where(inArray(users.id, viewerIds)),
    db
      .selectDistinct({ seekerId: tenantRequests.seekerId })
      .from(tenantRequests)
      .where(
        and(eq(tenantRequests.status, 'active'), inArray(tenantRequests.seekerId, viewerIds)),
      ),
  ]);

  const viewersById = new Map(viewerRows.map((row) => [row.id, row]));
  const seekerSet = new Set(seekerRows.map((r) => r.seekerId));

  return stats
    .filter((stat) => stat.viewerId !== ownerId)
    .map((stat) => {
      const viewer = viewersById.get(stat.viewerId);
      if (!viewer) return null;
      return {
        viewerId: stat.viewerId,
        viewerName: viewer.name ?? 'Anonymous',
        viewerImage: viewer.image,
        viewerHandle: seekerSet.has(stat.viewerId) ? viewer.handle : null,
        firstViewedAt: stat.firstViewedAt.toISOString(),
        lastViewedAt: stat.lastViewedAt.toISOString(),
      };
    })
    .filter((row): row is ProfileVisitor => row !== null);
}
