import { describe, expect, it, vi } from 'vitest';

vi.mock('../db', () => ({ db: {} }));
vi.mock('./redis', () => ({
  connectRedis: vi.fn(),
  getRedis: vi.fn(),
  REDIS_KEYS: {
    listingsIndex: 'listings',
    geoIndex: 'geo',
    listingData: (id: string) => `listing:${id}`,
    searchCache: (key: string) => `search:${key}`,
  },
}));

import { matchesListingFilters } from './search';
import type { ListingSummary } from '../types/listing';

const baseItem: ListingSummary = {
  id: 'listing_1',
  slug: 'bright-flat',
  shortCode: 'abc12345',
  path: 'bright-flat--abc12345',
  title: 'Bright flat in Kreuzberg',
  category: 'full_flat',
  rentType: 'long_term',
  rentPerMonth: 1200,
  sizeSqm: 55,
  rooms: 2,
  floorLevel: 2,
  neighborhood: 'kreuzberg',
  availableFrom: '2026-03-01T00:00:00.000Z',
  availableTo: '2026-12-31T00:00:00.000Z',
  anmeldungAvailable: true,
  schufaRequired: false,
  onlineViewingAvailable: true,
  lat: 52.499,
  lng: 13.418,
  approximateLocation: false,
  primaryPhotoUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('matchesListingFilters', () => {
  it('matches when no filters are set', () => {
    expect(matchesListingFilters(baseItem, {})).toBe(true);
  });

  it('filters by text query, category, and price range', () => {
    expect(matchesListingFilters(baseItem, { q: 'kreuzberg' })).toBe(true);
    expect(matchesListingFilters(baseItem, { q: 'mitte' })).toBe(false);
    expect(matchesListingFilters(baseItem, { category: 'full_flat' })).toBe(true);
    expect(matchesListingFilters(baseItem, { category: 'shared_room' })).toBe(false);
    expect(matchesListingFilters(baseItem, { minPrice: 1000, maxPrice: 1500 })).toBe(true);
    expect(matchesListingFilters(baseItem, { maxPrice: 1000 })).toBe(false);
  });

  it('filters by size, rooms, flags, and neighborhood', () => {
    expect(matchesListingFilters(baseItem, { minSize: 50, maxSize: 60, minRooms: 2, maxRooms: 3 })).toBe(true);
    expect(matchesListingFilters(baseItem, { anmeldungAvailable: true })).toBe(true);
    expect(matchesListingFilters(baseItem, { anmeldungAvailable: true, schufaRequired: true })).toBe(false);
    expect(matchesListingFilters(baseItem, { neighborhood: 'kreuzberg' })).toBe(true);
    expect(matchesListingFilters(baseItem, { neighborhood: 'mitte' })).toBe(false);
  });

  it('filters by availability window', () => {
    expect(matchesListingFilters(baseItem, { availableFrom: '2026-04-01' })).toBe(true);
    expect(matchesListingFilters(baseItem, { availableFrom: '2026-02-01' })).toBe(false);
    expect(matchesListingFilters(baseItem, { availableTo: '2027-01-01' })).toBe(false);
    expect(
      matchesListingFilters({ ...baseItem, availableTo: null }, { availableTo: '2026-06-01' }),
    ).toBe(true);
  });
});
