export type StayOfferStatus = 'open' | 'taken' | 'closed' | 'cancelled';
export type StayOfferVisibility = 'connections' | 'selected';
export type StayClaimStatus = 'interested' | 'accepted' | 'declined' | 'withdrawn';

export interface StayOfferAccessInput {
  isHost: boolean;
  visibility: StayOfferVisibility;
  isConnected: boolean;
  isSelectedAudience: boolean;
}

/** Can this viewer see the offer at all (in a feed / detail page)? */
export function canViewStayOffer(input: StayOfferAccessInput): boolean {
  if (input.isHost) return true;
  if (input.visibility === 'selected') return input.isSelectedAudience;
  return input.isConnected;
}

/**
 * Sensitive access details (address, key handover, door code) are only revealed
 * to the host and to the guest whose claim was accepted.
 */
export function canViewStayAccessDetails(input: { isHost: boolean; isAcceptedGuest: boolean }): boolean {
  return input.isHost || input.isAcceptedGuest;
}
