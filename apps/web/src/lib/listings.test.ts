import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findFirst, findMany, insertReturning, updateReturning } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  insertReturning: vi.fn(),
  updateReturning: vi.fn(),
}));

vi.mock('../db', () => ({
  db: {
    query: {
      listings: { findFirst, findMany },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: insertReturning,
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: updateReturning,
        })),
      })),
    })),
  },
}));

vi.mock('./search', () => ({
  indexListing: vi.fn(),
  removeListingFromIndex: vi.fn(),
}));

vi.mock('./moderation-handlers', () => ({
  requestListingModeration: vi.fn(),
}));

import { closeListing, createListing, getListingByPath, listingInputSchema, updateListing } from './listings';
import { indexListing, removeListingFromIndex } from './search';
import { requestListingModeration } from './moderation-handlers';

const validListing = {
  title: 'Bright flat in Kreuzberg',
  category: 'full_flat' as const,
  rentType: 'long_term' as const,
  availableFrom: '2026-04-01',
  sizeSqm: 55,
  rooms: 2,
  floorLevel: 2,
  address: 'Oranienstraße 1, Berlin',
  neighborhood: 'kreuzberg' as const,
  lat: 52.499,
  lng: 13.418,
  costs: { rentPerMonth: 1200 },
  descriptions: { apartment: 'Sunny 2-room flat' },
  requiredDocuments: ['passport' as const],
  requiredDocumentsOther: '  Reference letter  ',
  equipment: ['balcony' as const],
  photoUrls: ['/uploads/photo.jpg'],
};

describe('listingInputSchema', () => {
  it('accepts valid listing input', () => {
    expect(listingInputSchema.parse(validListing).status).toBe('draft');
  });

  it('rejects invalid coordinates and photo URLs', () => {
    expect(() => listingInputSchema.parse({ ...validListing, lat: 50 })).toThrow();
    expect(() => listingInputSchema.parse({ ...validListing, photoUrls: ['not-a-valid-url'] })).toThrow();
  });
});

describe('listing mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates draft listings without moderation', async () => {
    insertReturning.mockResolvedValue([{ id: 'listing_1', status: 'draft' }]);

    const row = await createListing('publisher_1', { ...validListing, status: 'draft' });

    expect(row.id).toBe('listing_1');
    expect(requestListingModeration).not.toHaveBeenCalled();
  });

  it('requests moderation for newly active listings', async () => {
    insertReturning.mockResolvedValue([{ id: 'listing_2', status: 'active' }]);

    await createListing('publisher_1', { ...validListing, status: 'active' });

    expect(requestListingModeration).toHaveBeenCalledOnce();
    expect(requestListingModeration.mock.calls[0]?.[0]).toEqual(expect.any(String));
  });

  it('updates owned listings and trims other requirements', async () => {
    findFirst.mockResolvedValue({
      id: 'listing_3',
      status: 'draft',
      publishedAt: null,
      moderationStatus: 'approved',
    });
    updateReturning.mockResolvedValue([{ id: 'listing_3', status: 'active', moderationStatus: 'approved' }]);

    const row = await updateListing('listing_3', 'publisher_1', {
      requiredDocumentsOther: '  Guarantor letter  ',
      status: 'active',
    });

    expect(row?.id).toBe('listing_3');
    expect(requestListingModeration).toHaveBeenCalledWith('listing_3');
  });

  it('returns null when updating a missing listing', async () => {
    findFirst.mockResolvedValue(null);
    expect(await updateListing('missing', 'publisher_1', { title: 'New title' })).toBeNull();
  });

  it('closes listings and removes them from search', async () => {
    findFirst.mockResolvedValue({ id: 'listing_4', status: 'active' });
    updateReturning.mockResolvedValue([{ id: 'listing_4', status: 'closed' }]);

    const row = await closeListing('listing_4', 'publisher_1');

    expect(row?.status).toBe('closed');
    expect(removeListingFromIndex).toHaveBeenCalledWith('listing_4');
  });

  it('throws when closing an already closed listing', async () => {
    findFirst.mockResolvedValue({ id: 'listing_5', status: 'closed' });
    await expect(closeListing('listing_5', 'publisher_1')).rejects.toThrow(/already closed/i);
  });

  it('reindexes approved active listings on update', async () => {
    findFirst.mockResolvedValue({
      id: 'listing_6',
      status: 'active',
      publishedAt: new Date(),
      moderationStatus: 'approved',
    });
    updateReturning.mockResolvedValue([{ id: 'listing_6', status: 'active', moderationStatus: 'approved' }]);

    await updateListing('listing_6', 'publisher_1', { title: 'Updated title' });

    expect(indexListing).toHaveBeenCalledWith('listing_6');
  });

  it('loads listings by short code', async () => {
    findFirst.mockResolvedValueOnce({ id: 'by-code' });
    expect(await getListingByPath('bright-flat--abc12345')).toEqual({ id: 'by-code' });
  });

  it('loads listings by legacy slug', async () => {
    findFirst.mockResolvedValueOnce({ id: 'by-slug' });
    expect(await getListingByPath('legacy-slug')).toEqual({ id: 'by-slug' });
  });
});
