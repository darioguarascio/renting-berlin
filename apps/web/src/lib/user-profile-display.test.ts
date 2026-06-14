import { describe, expect, it } from 'vitest';
import { otherUserProfileSubtitle } from './user-profile-display';

describe('otherUserProfileSubtitle', () => {
  it('returns null without a handle', () => {
    expect(otherUserProfileSubtitle({ handle: null, hasSeekerProfile: true, activeListingCount: 1 })).toBeNull();
  });

  it('builds handle-only subtitle', () => {
    expect(otherUserProfileSubtitle({ handle: 'marco', hasSeekerProfile: false, activeListingCount: 0 })).toBe(
      '@marco',
    );
  });

  it('includes seeker and listing roles', () => {
    expect(
      otherUserProfileSubtitle({ handle: 'marco', hasSeekerProfile: true, activeListingCount: 2 }),
    ).toBe('@marco · Seeker · 2 listings');
    expect(
      otherUserProfileSubtitle({ handle: 'marco', hasSeekerProfile: false, activeListingCount: 1 }),
    ).toBe('@marco · 1 listing');
  });
});
