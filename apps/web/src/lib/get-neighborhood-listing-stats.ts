import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { listings } from '../db/schema';
import { buildNeighborhoodStatsFromRows, type NeighborhoodListingStats } from './neighborhood-stats';

export async function getNeighborhoodListingStats(neighborhood: string): Promise<NeighborhoodListingStats> {
  const rows = await db.query.listings.findMany({
    where: and(eq(listings.status, 'active'), eq(listings.neighborhood, neighborhood)),
  });
  return buildNeighborhoodStatsFromRows(neighborhood, rows);
}
