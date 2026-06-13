export interface UserProfileDisplayInfo {
  handle: string | null;
  hasSeekerProfile: boolean;
  activeListingCount: number;
}

export function otherUserProfileSubtitle(info: UserProfileDisplayInfo): string | null {
  if (!info.handle) return null;

  const roles: string[] = [];
  if (info.hasSeekerProfile) roles.push('Seeker');
  if (info.activeListingCount > 0) {
    roles.push(info.activeListingCount === 1 ? '1 listing' : `${info.activeListingCount} listings`);
  }

  return roles.length > 0 ? `@${info.handle} · ${roles.join(' · ')}` : `@${info.handle}`;
}
