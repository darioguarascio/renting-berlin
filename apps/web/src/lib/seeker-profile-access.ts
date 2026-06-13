import type { TenantRequestFull } from '../types/tenant-request';

export function canViewSeekerProfileDetails(opts: {
  landlordsOnly: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
  viewerIsLandlord: boolean;
}): boolean {
  if (opts.isOwner) return true;
  if (!opts.isAuthenticated) return false;
  if (opts.landlordsOnly && !opts.viewerIsLandlord) return false;
  return true;
}

export type SeekerProfileLockedReason = 'login' | 'landlords';

export function getSeekerProfileLockedReason(opts: {
  landlordsOnly: boolean;
  isOwner: boolean;
  isAuthenticated: boolean;
  viewerIsLandlord: boolean;
}): SeekerProfileLockedReason | null {
  if (canViewSeekerProfileDetails(opts)) return null;
  if (!opts.isAuthenticated) return 'login';
  return 'landlords';
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
