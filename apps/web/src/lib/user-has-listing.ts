import { eq } from 'drizzle-orm';
import { db } from '../db';
import { listings } from '../db/schema';

export async function userHasListing(userId: string): Promise<boolean> {
  const row = await db.query.listings.findFirst({
    where: eq(listings.publisherId, userId),
    columns: { id: true },
  });
  return !!row;
}
