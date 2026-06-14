import { and, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../../db';
import { listingViews, profileViews } from '../../db/schema';
import { clickhouseConfigured, getClickHouse } from '../clickhouse/client';

export type ViewEntityType = 'profile' | 'listing';

export type ViewVisitorStat = {
  viewerId: string;
  firstViewedAt: Date;
  lastViewedAt: Date;
};

async function insertViewEventPg(
  entityType: ViewEntityType,
  entityId: string,
  viewerId: string,
  viewedAt: Date,
): Promise<void> {
  if (entityType === 'profile') {
    await db
      .insert(profileViews)
      .values({
        id: nanoid(),
        profileUserId: entityId,
        viewerId,
        firstViewedAt: viewedAt,
        lastViewedAt: viewedAt,
      })
      .onConflictDoUpdate({
        target: [profileViews.profileUserId, profileViews.viewerId],
        set: { lastViewedAt: viewedAt },
      });
    return;
  }

  await db
    .insert(listingViews)
    .values({
      id: nanoid(),
      listingId: entityId,
      viewerId,
      firstViewedAt: viewedAt,
      lastViewedAt: viewedAt,
    })
    .onConflictDoUpdate({
      target: [listingViews.listingId, listingViews.viewerId],
      set: { lastViewedAt: viewedAt },
    });
}

export async function recordViewEvent(
  entityType: ViewEntityType,
  entityId: string,
  viewerId: string,
  viewedAt: Date = new Date(),
): Promise<void> {
  const ch = await getClickHouse();
  if (ch) {
    await ch.insert({
      table: 'view_events',
      values: [
        {
          id: nanoid(),
          entity_type: entityType,
          entity_id: entityId,
          viewer_id: viewerId,
          viewed_at: viewedAt,
        },
      ],
      format: 'JSONEachRow',
    });
    return;
  }

  await insertViewEventPg(entityType, entityId, viewerId, viewedAt);
}

export async function getProfileVisitorStats(profileUserId: string): Promise<ViewVisitorStat[]> {
  const ch = await getClickHouse();
  if (ch) {
    const result = await ch.query({
      query: `
        SELECT
          viewer_id,
          min(viewed_at) AS first_viewed_at,
          max(viewed_at) AS last_viewed_at
        FROM view_events
        WHERE entity_type = {entityType:String}
          AND entity_id = {entityId:String}
        GROUP BY viewer_id
        ORDER BY last_viewed_at DESC
      `,
      query_params: {
        entityType: 'profile',
        entityId: profileUserId,
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json<{
      viewer_id: string;
      first_viewed_at: string;
      last_viewed_at: string;
    }>();

    return rows.map((row) => ({
      viewerId: row.viewer_id,
      firstViewedAt: new Date(row.first_viewed_at),
      lastViewedAt: new Date(row.last_viewed_at),
    }));
  }

  const rows = await db.query.profileViews.findMany({
    where: (table, { eq }) => eq(table.profileUserId, profileUserId),
    orderBy: (table, { desc }) => [desc(table.lastViewedAt)],
  });

  return rows.map((row) => ({
    viewerId: row.viewerId,
    firstViewedAt: row.firstViewedAt,
    lastViewedAt: row.lastViewedAt,
  }));
}

export async function getProfileVisitorCount(profileUserId: string): Promise<number> {
  const stats = await getProfileVisitorStats(profileUserId);
  return stats.length;
}

export async function getViewersForListings(
  listingIds: string[],
  viewerIds: string[],
): Promise<Set<string>> {
  if (listingIds.length === 0 || viewerIds.length === 0) return new Set();

  const ch = await getClickHouse();
  if (ch) {
    const result = await ch.query({
      query: `
        SELECT DISTINCT viewer_id
        FROM view_events
        WHERE entity_type = {entityType:String}
          AND entity_id IN {listingIds:Array(String)}
          AND viewer_id IN {viewerIds:Array(String)}
      `,
      query_params: {
        entityType: 'listing',
        listingIds,
        viewerIds,
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json<{ viewer_id: string }>();
    return new Set(rows.map((row) => row.viewer_id));
  }

  const rows = await db
    .selectDistinct({ viewerId: listingViews.viewerId })
    .from(listingViews)
    .where(and(inArray(listingViews.listingId, listingIds), inArray(listingViews.viewerId, viewerIds)));

  return new Set(rows.map((row) => row.viewerId));
}
