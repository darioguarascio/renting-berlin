import { describe, expect, it } from 'vitest';
import {
  buildListingSeoDescription,
  canViewListingDetails,
  getListingLockedReason,
  redactListingSummaryForViewer,
} from './listing-access';
import type { ListingSummary } from '../types/listing';

const baseListing = {
  id: '1',
  slug: 'cozy-room',
  shortCode: 'abc123',
  path: 'cozy-room--abc123',
  title: 'Cozy room in Kreuzberg',
  category: 'shared_room',
  rentType: 'long_term',
  rentPerMonth: 750,
  sizeSqm: 18,
  rooms: 1,
  neighborhood: 'kreuzberg',
  availableFrom: '2026-01-01T00:00:00.000Z',
  availableTo: null,
  anmeldungAvailable: true,
  schufaRequired: false,
  onlineViewingAvailable: true,
  lat: 52.49,
  lng: 13.42,
  approximateLocation: true,
  primaryPhotoUrl: '/uploads/photo.jpg',
  createdAt: '2026-01-01T00:00:00.000Z',
} satisfies ListingSummary;

describe('canViewListingDetails', () => {
  it('allows owners always', () => {
    expect(
      canViewListingDetails({
        isOwner: true,
        isAuthenticated: false,
      }),
    ).toBe(true);
  });

  it('requires login for non-owners', () => {
    expect(
      canViewListingDetails({
        isOwner: false,
        isAuthenticated: false,
      }),
    ).toBe(false);

    expect(
      canViewListingDetails({
        isOwner: false,
        isAuthenticated: true,
      }),
    ).toBe(true);
  });
});

describe('getListingLockedReason', () => {
  it('returns login when unauthenticated', () => {
    expect(
      getListingLockedReason({
        isOwner: false,
        isAuthenticated: false,
      }),
    ).toBe('login');
  });

  it('returns null when authenticated', () => {
    expect(
      getListingLockedReason({
        isOwner: false,
        isAuthenticated: true,
      }),
    ).toBeNull();
  });
});

describe('redactListingSummaryForViewer', () => {
  it('strips photos and coordinates', () => {
    const redacted = redactListingSummaryForViewer(baseListing);
    expect(redacted.primaryPhotoUrl).toBeNull();
    expect(redacted.lat).toBe(0);
    expect(redacted.lng).toBe(0);
    expect(redacted.title).toBe(baseListing.title);
    expect(redacted.rentPerMonth).toBe(baseListing.rentPerMonth);
  });
});

describe('buildListingSeoDescription', () => {
  it('includes key listing facts', () => {
    const description = buildListingSeoDescription({
      title: baseListing.title,
      neighborhood: baseListing.neighborhood,
      neighborhoodLabel: 'Kreuzberg',
      rentPerMonth: baseListing.rentPerMonth,
      sizeSqm: baseListing.sizeSqm,
      rooms: baseListing.rooms,
      categoryLabel: 'Shared room',
    });
    expect(description).toContain('Kreuzberg');
    expect(description).toContain('€750/mo');
    expect(description).toContain('Sign up free');
  });
});
