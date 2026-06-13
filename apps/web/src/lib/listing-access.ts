import type { ListingSummary } from '../types/listing';

export function canViewListingDetails(opts: {
  isOwner: boolean;
  isAuthenticated: boolean;
}): boolean {
  if (opts.isOwner) return true;
  return opts.isAuthenticated;
}

export type ListingLockedReason = 'login';

export function getListingLockedReason(opts: {
  isOwner: boolean;
  isAuthenticated: boolean;
}): ListingLockedReason | null {
  if (canViewListingDetails(opts)) return null;
  return 'login';
}

export function redactListingSummaryForViewer(listing: ListingSummary): ListingSummary {
  return {
    ...listing,
    primaryPhotoUrl: null,
    lat: 0,
    lng: 0,
  };
}

export function buildListingSeoDescription(listing: {
  title: string;
  neighborhood: string;
  neighborhoodLabel: string;
  rentPerMonth: number;
  sizeSqm: number;
  rooms: number;
  categoryLabel: string;
}): string {
  return `${listing.title} — ${listing.categoryLabel} in ${listing.neighborhoodLabel}, Berlin. €${listing.rentPerMonth}/mo, ${listing.sizeSqm} m², ${listing.rooms} ${listing.rooms === 1 ? 'room' : 'rooms'}. Sign up free to see photos, full details, and contact the landlord.`;
}
