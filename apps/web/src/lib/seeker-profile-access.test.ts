import { describe, expect, it } from 'vitest';
import {
  canViewSeekerProfileDetails,
  getSeekerProfileLockedReason,
  redactTenantRequestForViewer,
} from './seeker-profile-access';
import type { TenantRequestFull } from '../types/tenant-request';

const baseProfile = {
  id: '1',
  slug: 'seeker-test',
  handle: 'testuser',
  title: 'Test seeker',
  category: 'shared_room',
  rentType: 'long_term',
  budgetMin: 600,
  budgetMax: 900,
  desiredNeighborhoods: ['kreuzberg'],
  availableFrom: '2026-01-01T00:00:00.000Z',
  availableTo: null,
  sizeMin: null,
  roomsMin: null,
  anmeldungNeeded: true,
  hasSchufa: false,
  householdType: 'single',
  monthlyIncome: 3000,
  hasPets: false,
  nationality: 'DE',
  birthYear: 1990,
  needsBedLinens: false,
  occupation: 'Engineer',
  isStudent: false,
  isSmoker: false,
  spokenLanguages: ['english'],
  description: 'About me',
  photoUrls: ['/uploads/photo.jpg'],
  landlordsOnly: false,
  seekerName: 'Alex',
  seekerImage: null,
  seekerId: 'seeker-1',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
} satisfies TenantRequestFull;

describe('canViewSeekerProfileDetails', () => {
  it('allows owners always', () => {
    expect(
      canViewSeekerProfileDetails({
        landlordsOnly: true,
        isOwner: true,
        isAuthenticated: false,
        viewerIsLandlord: false,
      }),
    ).toBe(true);
  });

  it('requires login for full profile by default', () => {
    expect(
      canViewSeekerProfileDetails({
        landlordsOnly: false,
        isOwner: false,
        isAuthenticated: false,
        viewerIsLandlord: false,
      }),
    ).toBe(false);
  });

  it('allows any logged-in member when landlordsOnly is false', () => {
    expect(
      canViewSeekerProfileDetails({
        landlordsOnly: false,
        isOwner: false,
        isAuthenticated: true,
        viewerIsLandlord: false,
      }),
    ).toBe(true);
  });

  it('requires a listing when landlordsOnly is true', () => {
    expect(
      canViewSeekerProfileDetails({
        landlordsOnly: true,
        isOwner: false,
        isAuthenticated: true,
        viewerIsLandlord: false,
      }),
    ).toBe(false);

    expect(
      canViewSeekerProfileDetails({
        landlordsOnly: true,
        isOwner: false,
        isAuthenticated: true,
        viewerIsLandlord: true,
      }),
    ).toBe(true);
  });
});

describe('getSeekerProfileLockedReason', () => {
  it('returns login before landlords when unauthenticated', () => {
    expect(
      getSeekerProfileLockedReason({
        landlordsOnly: true,
        isOwner: false,
        isAuthenticated: false,
        viewerIsLandlord: false,
      }),
    ).toBe('login');
  });

  it('returns landlords for logged-in non-landlords', () => {
    expect(
      getSeekerProfileLockedReason({
        landlordsOnly: true,
        isOwner: false,
        isAuthenticated: true,
        viewerIsLandlord: false,
      }),
    ).toBe('landlords');
  });
});

describe('redactTenantRequestForViewer', () => {
  it('strips sensitive fields', () => {
    const redacted = redactTenantRequestForViewer(baseProfile);
    expect(redacted.seekerName).toBe('');
    expect(redacted.photoUrls).toEqual([]);
    expect(redacted.monthlyIncome).toBeNull();
    expect(redacted.description).toBe('');
    expect(redacted.desiredNeighborhoods).toEqual(['kreuzberg']);
  });
});
