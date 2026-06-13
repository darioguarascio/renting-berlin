import { nanoid } from 'nanoid';
import { db } from '../db';
import { listingViews } from '../db/schema';

export async function recordListingView(listingId: string, viewerId: string) {
  const viewedAt = new Date();
  await db
    .insert(listingViews)
    .values({
      id: nanoid(),
      listingId,
      viewerId,
      firstViewedAt: viewedAt,
      lastViewedAt: viewedAt,
    })
    .onConflictDoUpdate({
      target: [listingViews.listingId, listingViews.viewerId],
      set: { lastViewedAt: viewedAt },
    });
}
