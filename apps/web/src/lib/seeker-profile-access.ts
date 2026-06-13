import type { TenantRequestFull } from '../types/tenant-request';

export const SEEKER_VISIBILITY_OPTIONS = [
  'everyone',
  'visited_listings',
  'favorited_listings',
  'messaged_listings',
  'nobody',
] as const;

export type SeekerVisibility = (typeof SEEKER_VISIBILITY_OPTIONS)[number];

export const SEEKER_VISIBILITY_LABELS: Record<SeekerVisibility, string> = {
  everyone: 'Everyone (public)',
  visited_listings: 'Only landlords of listings I visited',
  favorited_listings: 'Only landlords of listings I saved as favorite',
  messaged_listings: 'Only landlords I sent messages to',
  nobody: 'Nobody',
};

export const SEEKER_VISIBILITY_DESCRIPTIONS: Record<SeekerVisibility, string> = {
  everyone: 'Anyone can see your photos, income, and contact you.',
  visited_listings: 'Full details visible only to landlords whose listings you have viewed.',
  favorited_listings: 'Full details visible only to landlords whose listings you saved.',
  messaged_listings: 'Full details visible only to landlords you messaged about a listing.',
  nobody: 'Only you can see your full profile. Others see basic search info only.',
};

export type SeekerProfileLockedReason = 'login' | 'restricted';

export interface SeekerProfileAccess {
  canViewFull: boolean;
  lockedReason: SeekerProfileLockedReason | null;
}

export interface SeekerProfileAccessInput {
  visibility: SeekerVisibility;
  seekerId: string;
  isOwner: boolean;
  isAuthenticated: boolean;
  viewerId?: string | null;
  hasRelationship?: boolean;
}

export function resolveSeekerProfileAccess(input: SeekerProfileAccessInput): SeekerProfileAccess {
  if (input.isOwner) return { canViewFull: true, lockedReason: null };
  if (input.visibility === 'nobody') return { canViewFull: false, lockedReason: 'restricted' };
  if (input.visibility === 'everyone') return { canViewFull: true, lockedReason: null };

  if (!input.isAuthenticated || !input.viewerId) {
    return { canViewFull: false, lockedReason: 'login' };
  }

  if (input.hasRelationship) return { canViewFull: true, lockedReason: null };
  return { canViewFull: false, lockedReason: 'restricted' };
}

export function canViewSeekerProfileDetails(opts: SeekerProfileAccessInput): boolean {
  return resolveSeekerProfileAccess(opts).canViewFull;
}

export function getSeekerProfileLockedReason(opts: SeekerProfileAccessInput): SeekerProfileLockedReason | null {
  return resolveSeekerProfileAccess(opts).lockedReason;
}

export function redactTenantRequestForViewer(profile: TenantRequestFull): TenantRequestFull {
  return {
    ...profile,
    seekerName: '',
    seekerImage: null,
    photoUrls: [],
    monthlyIncome: null,
    birthYear: null,
    nationality: null,
    occupation: null,
    spokenLanguages: [],
    description: '',
    roomsMin: null,
    sizeMin: null,
  };
}
