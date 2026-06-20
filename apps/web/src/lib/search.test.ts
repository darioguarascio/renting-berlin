import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findFirst, findMany, connectRedis, getRedis, redisGet, redisSetex, redisSmembers, pipelineExec } =
  vi.hoisted(() => ({
    findFirst: vi.fn(),
    findMany: vi.fn(),
    connectRedis: vi.fn(),
    getRedis: vi.fn(),
    redisGet: vi.fn(),
    redisSetex: vi.fn(),
    redisSmembers: vi.fn(),
    pipelineExec: vi.fn(),
  }));

function createPipeline() {
  const chain = {
    del: vi.fn().mockReturnThis(),
    sadd: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    geoadd: vi.fn().mockReturnThis(),
    get: vi.fn().mockReturnThis(),
    srem: vi.fn().mockReturnThis(),
    zrem: vi.fn().mockReturnThis(),
    exec: pipelineExec,
  };
  return chain;
}

vi.mock('../db', () => ({
  db: {
    query: {
      listings: { findFirst, findMany },
    },
  },
}));

vi.mock('./redis', () => ({
  connectRedis,
  getRedis,
  REDIS_KEYS: {
    listingsIndex: 'listings',
    listingsIndexReady: 'listings:ready',
    geoIndex: 'geo',
    listingData: (id: string) => `listing:${id}`,
    searchCache: (key: string) => `search:${key}`,
  },
}));

vi.mock('./analytics/listing-events', () => ({
  recordListingEvent: vi.fn(),
}));

import {
  indexListing,
  matchesListingFilters,
  removeListingFromIndex,
  searchListings,
  toSummary,
  warmListingCache,
} from './search';
import type { ListingSearchFilters, ListingSummary } from '../types/listing';

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
  primaryPhotoUrl: '/uploads/a.jpg',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

const mockListingRow = {
  id: 'listing_1',
  slug: 'bright-flat',
  shortCode: 'abc12345',
  title: 'Bright flat in Kreuzberg',
  category: 'full_flat' as const,
  rentType: 'long_term' as const,
  costs: { rentPerMonth: 1200 },
  sizeSqm: 55,
  rooms: 2,
  floorLevel: 2,
  neighborhood: 'kreuzberg',
  availableFrom: new Date('2026-03-01'),
  availableTo: new Date('2026-12-31'),
  anmeldungAvailable: true,
  schufaRequired: false,
  onlineViewingAvailable: true,
  lat: 52.499,
  lng: 13.418,
  approximateLocation: false,
  photoUrls: ['/uploads/a.jpg'],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
  status: 'active',
  moderationStatus: 'approved',
  publishedAt: new Date('2026-01-01'),
  lngField: 13.418,
};

describe('toSummary', () => {
  it('maps database rows to listing summaries', () => {
    expect(toSummary(mockListingRow)).toMatchObject({
      id: 'listing_1',
      path: 'bright-flat--abc12345',
      rentPerMonth: 1200,
      primaryPhotoUrl: '/uploads/a.jpg',
    });
  });
});

describe('matchesListingFilters', () => {
  it('matches when no filters are set', () => {
    expect(matchesListingFilters(baseItem, {})).toBe(true);
  });

  it('filters by category and price range', () => {
    expect(matchesListingFilters(baseItem, { category: 'full_flat' })).toBe(true);
    expect(matchesListingFilters(baseItem, { category: 'shared_room' })).toBe(false);
    expect(matchesListingFilters(baseItem, { minPrice: 1000, maxPrice: 1500 })).toBe(true);
    expect(matchesListingFilters(baseItem, { maxPrice: 1000 })).toBe(false);
  });

  it('ignores legacy free-text q values', () => {
    expect(matchesListingFilters(baseItem, { q: 'mitte' } as ListingSearchFilters)).toBe(true);
  });

  it('filters by size, rooms, flags, rent type, and neighborhood', () => {
    expect(matchesListingFilters(baseItem, { minSize: 50, maxSize: 60, minRooms: 2, maxRooms: 3 })).toBe(true);
    expect(matchesListingFilters(baseItem, { rentType: 'long_term' })).toBe(true);
    expect(matchesListingFilters(baseItem, { rentType: 'short_term' })).toBe(false);
    expect(matchesListingFilters(baseItem, { anmeldungAvailable: true })).toBe(true);
    expect(matchesListingFilters(baseItem, { anmeldungAvailable: true, schufaRequired: true })).toBe(false);
    expect(matchesListingFilters(baseItem, { schufaRequired: false })).toBe(true);
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

describe('searchListings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectRedis.mockResolvedValue(undefined);
    getRedis.mockReturnValue({
      get: redisGet,
      setex: redisSetex,
      smembers: redisSmembers,
      pipeline: vi.fn(() => createPipeline()),
    });
    pipelineExec.mockResolvedValue([]);
    redisSmembers.mockResolvedValue([]);
    findMany.mockResolvedValue([]);
  });

  it('returns cached search results when available', async () => {
    const cached = { items: [baseItem], total: 1, page: 1, limit: 12, totalPages: 1 };
    redisGet.mockResolvedValue(JSON.stringify(cached));

    await expect(searchListings({ neighborhood: 'kreuzberg' })).resolves.toEqual(cached);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('searches redis and paginates results', async () => {
    redisGet.mockImplementation((key: string) => Promise.resolve(key === 'listings:ready' ? '1' : null));
    redisSmembers.mockResolvedValue(['listing_1', 'listing_2']);
    pipelineExec.mockResolvedValue([
      [null, JSON.stringify(baseItem)],
      [null, JSON.stringify({ ...baseItem, id: 'listing_2', neighborhood: 'mitte' })],
    ]);

    const result = await searchListings({ neighborhood: 'kreuzberg', page: 1, limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(redisSetex).toHaveBeenCalledOnce();
  });

  it('falls back to postgres when redis is empty', async () => {
    redisGet.mockRejectedValue(new Error('redis down'));
    findMany.mockResolvedValue([mockListingRow]);

    const result = await searchListings({ neighborhood: 'kreuzberg' });

    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe('listing_1');
  });

  it('ignores a not-yet-warmed index and serves from postgres', async () => {
    redisGet.mockResolvedValue(null);
    redisSmembers.mockResolvedValue(['listing_1']);
    findMany.mockResolvedValue([mockListingRow]);

    const result = await searchListings({ neighborhood: 'kreuzberg' });

    expect(result.total).toBe(1);
    expect(redisSmembers).not.toHaveBeenCalled();
  });
});

describe('listing index maintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectRedis.mockResolvedValue(undefined);
    getRedis.mockReturnValue({
      pipeline: vi.fn(() => createPipeline()),
    });
    pipelineExec.mockResolvedValue([]);
  });

  it('warms the listing cache from postgres', async () => {
    findMany.mockResolvedValue([mockListingRow]);

    await expect(warmListingCache()).resolves.toBe(1);
    expect(pipelineExec).toHaveBeenCalledOnce();
  });

  it('indexes approved active listings', async () => {
    findFirst.mockResolvedValue(mockListingRow);

    await indexListing('listing_1');

    expect(pipelineExec).toHaveBeenCalledOnce();
  });

  it('removes inactive listings from the index', async () => {
    findFirst.mockResolvedValue({ ...mockListingRow, status: 'draft' });

    await indexListing('listing_1');

    expect(pipelineExec).toHaveBeenCalledOnce();
  });

  it('removes listings from redis', async () => {
    await removeListingFromIndex('listing_1');
    expect(pipelineExec).toHaveBeenCalledOnce();
  });
});
