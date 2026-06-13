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
  visibility: 'everyone',
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
        visibility: 'nobody',
        seekerId: 'seeker-1',
        isOwner: true,
        isAuthenticated: false,
      }),
    ).toBe(true);
  });

  it('allows everyone without login', () => {
    expect(
      canViewSeekerProfileDetails({
        visibility: 'everyone',
        seekerId: 'seeker-1',
        isOwner: false,
        isAuthenticated: false,
      }),
    ).toBe(true);
  });

  it('requires login for relationship-based visibility', () => {
    expect(
      canViewSeekerProfileDetails({
        visibility: 'visited_listings',
        seekerId: 'seeker-1',
        isOwner: false,
        isAuthenticated: false,
      }),
    ).toBe(false);
  });

  it('allows relationship-based visibility when connected', () => {
    expect(
      canViewSeekerProfileDetails({
        visibility: 'favorited_listings',
        seekerId: 'seeker-1',
        isOwner: false,
        isAuthenticated: true,
        viewerId: 'landlord-1',
        hasRelationship: true,
      }),
    ).toBe(true);
  });

  it('blocks relationship-based visibility without connection', () => {
    expect(
      canViewSeekerProfileDetails({
        visibility: 'messaged_listings',
        seekerId: 'seeker-1',
        isOwner: false,
        isAuthenticated: true,
        viewerId: 'landlord-1',
        hasRelationship: false,
      }),
    ).toBe(false);
  });

  it('blocks everyone except owner when visibility is nobody', () => {
    expect(
      canViewSeekerProfileDetails({
        visibility: 'nobody',
        seekerId: 'seeker-1',
        isOwner: false,
        isAuthenticated: true,
        viewerId: 'landlord-1',
      }),
    ).toBe(false);
  });
});

describe('getSeekerProfileLockedReason', () => {
  it('returns login before restricted when unauthenticated', () => {
    expect(
      getSeekerProfileLockedReason({
        visibility: 'visited_listings',
        seekerId: 'seeker-1',
        isOwner: false,
        isAuthenticated: false,
      }),
    ).toBe('login');
  });

  it('returns restricted for logged-in viewers without relationship', () => {
    expect(
      getSeekerProfileLockedReason({
        visibility: 'favorited_listings',
        seekerId: 'seeker-1',
        isOwner: false,
        isAuthenticated: true,
        viewerId: 'landlord-1',
        hasRelationship: false,
      }),
    ).toBe('restricted');
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
