import { describe, expect, it } from 'vitest';
import { appendFiltersToParams, buildSearchUrl, countActiveFilters, listingSearchRequiresAuth, normalizeFilters } from './search-url';

describe('normalizeFilters', () => {
  it('drops empty values and pagination keys', () => {
    expect(
      normalizeFilters({
        page: 2,
        limit: 12,
        neighborhood: 'kreuzberg',
        anmeldungAvailable: false,
        tags: [],
      }),
    ).toEqual({ neighborhood: 'kreuzberg' });
  });
});

describe('buildSearchUrl', () => {
  it('builds listing and request search URLs', () => {
    expect(buildSearchUrl('listings', { neighborhood: 'mitte', maxPrice: 1200 })).toBe(
      '/offers?maxPrice=1200&neighborhood=mitte',
    );
    expect(buildSearchUrl('tenant_requests', {})).toBe('/requests');
  });

  it('serializes array filters', () => {
    const params = new URLSearchParams();
    appendFiltersToParams(params, { householdTypes: ['single', 'couple'] });
    expect(params.getAll('householdTypes')).toEqual(['single', 'couple']);
  });
});

describe('countActiveFilters', () => {
  it('counts normalized filters', () => {
    expect(countActiveFilters({ page: 1, neighborhood: 'mitte', minRooms: 2 })).toBe(2);
  });
});

describe('listingSearchRequiresAuth', () => {
  it('requires auth when guests apply listing filters', () => {
    expect(listingSearchRequiresAuth(false, { neighborhood: 'mitte' })).toBe(true);
    expect(listingSearchRequiresAuth(false, { sort: 'updated' })).toBe(true);
  });

  it('allows guests to browse without filters', () => {
    expect(listingSearchRequiresAuth(false, { page: 2, view: 'list' })).toBe(false);
    expect(listingSearchRequiresAuth(false, {})).toBe(false);
  });

  it('allows authenticated users to filter', () => {
    expect(listingSearchRequiresAuth(true, { neighborhood: 'mitte' })).toBe(false);
  });
});
