import { recordViewEvent } from './analytics/view-events';

export async function recordListingView(listingId: string, viewerId: string) {
  await recordViewEvent('listing', listingId, viewerId);
}
