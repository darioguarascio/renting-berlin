import { describe, expect, it, vi } from 'vitest';

vi.mock('../db', () => ({ db: {} }));
vi.mock('./search', () => ({ searchListings: vi.fn() }));
vi.mock('./tenant-requests', () => ({ searchTenantRequests: vi.fn(), matchesTenantRequestFilters: vi.fn() }));
vi.mock('./notification-preferences', () => ({ shouldNotifyInApp: vi.fn() }));
vi.mock('./email-events', () => ({ enqueueEmailJob: vi.fn() }));

import { filtersHash, generateSearchName } from './saved-searches';

describe('filtersHash', () => {
  it('is stable for equivalent filters regardless of key order', () => {
    const a = filtersHash('listings', { neighborhood: 'mitte', maxPrice: 1200, page: 1 });
    const b = filtersHash('listings', { maxPrice: 1200, neighborhood: 'mitte', limit: 12 });
    expect(a).toBe(b);
  });

  it('changes when search type or filters differ', () => {
    const listings = filtersHash('listings', { neighborhood: 'mitte' });
    const requests = filtersHash('tenant_requests', { neighborhood: 'mitte' });
    expect(listings).not.toBe(requests);
  });
});

describe('generateSearchName', () => {
  it('describes listing filters', () => {
    expect(
      generateSearchName('listings', {
        neighborhood: 'kreuzberg',
        category: 'full_flat',
        maxPrice: 1200,
        minRooms: 2,
        anmeldungAvailable: true,
      }),
    ).toBe('Kreuzberg · Full flat · max €1200 · 2+ rooms · Anmeldung');
  });

  it('falls back to default listing label', () => {
    expect(generateSearchName('listings', {})).toBe('All Berlin listings');
  });

  it('describes seeker filters', () => {
    expect(
      generateSearchName('tenant_requests', {
        neighborhood: 'mitte',
        category: 'shared_room',
        maxBudget: 800,
        householdTypes: ['single', 'couple'],
        hasSchufa: true,
      }),
    ).toBe('Mitte · Shared room · max €800 · Single, Couple · SCHUFA');
  });

  it('falls back to default seeker label', () => {
    expect(generateSearchName('tenant_requests', {})).toBe('All seeker profiles');
  });
});
