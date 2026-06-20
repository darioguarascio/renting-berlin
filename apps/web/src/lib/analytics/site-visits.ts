import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../db/schema';
import { getClickHouse } from '../clickhouse/client';

export type SitePage = 'offers';

async function getLastSiteVisitCh(visitorId: string, page: SitePage): Promise<Date | null> {
  const ch = await getClickHouse();
  if (!ch) return null;

  const result = await ch.query({
    query: `
      SELECT max(visited_at) AS last_visit
      FROM site_visits
      WHERE page = {page:String}
        AND visitor_id = {visitorId:String}
    `,
    query_params: { page, visitorId },
    format: 'JSONEachRow',
  });
  const rows = await result.json<{ last_visit: string | null }>();
  const raw = rows[0]?.last_visit;
  return raw ? new Date(raw) : null;
}

async function getLastSiteVisitPg(visitorId: string, page: SitePage): Promise<Date | null> {
  if (page !== 'offers') return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, visitorId),
    columns: { lastOffersVisitAt: true },
  });
  return user?.lastOffersVisitAt ?? null;
}

export async function getLastSiteVisit(visitorId: string, page: SitePage): Promise<Date | null> {
  const ch = await getClickHouse();
  if (ch) {
    try {
      const chLast = await getLastSiteVisitCh(visitorId, page);
      if (chLast) return chLast;
    } catch (error) {
      console.warn('[site-visits] ClickHouse lookup failed:', error);
    }
  }

  return getLastSiteVisitPg(visitorId, page);
}

async function recordSiteVisitPg(visitorId: string, page: SitePage, visitedAt: Date): Promise<void> {
  if (page !== 'offers') return;

  const user = await db.query.users.findFirst({
    where: eq(users.id, visitorId),
    columns: { id: true },
  });
  if (!user) return;

  await db.update(users).set({ lastOffersVisitAt: visitedAt }).where(eq(users.id, visitorId));
}

export async function recordSiteVisit(
  visitorId: string,
  page: SitePage,
  visitedAt: Date = new Date(),
): Promise<void> {
  const ch = await getClickHouse();
  if (ch) {
    try {
      await ch.insert({
        table: 'site_visits',
        values: [{ visitor_id: visitorId, page, visited_at: visitedAt }],
        format: 'JSONEachRow',
      });
      return;
    } catch (error) {
      console.warn('[site-visits] ClickHouse insert failed:', error);
    }
  }

  await recordSiteVisitPg(visitorId, page, visitedAt);
}
