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

const { notifyListingActivityEmail } = vi.hoisted(() => ({
  notifyListingActivityEmail: vi.fn(),
}));

vi.mock('./user-notifications', () => ({
  notifyListingActivityEmail,
}));

import { closeListing, createListing, getActiveListingsForPublisher, getListingByPath, getListingForPublisher, listingInputSchema, updateListing } from './listings';
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
    updateReturning.mockResolvedValue([
      {
        id: 'listing_4',
        status: 'closed',
        publisherId: 'publisher_1',
        title: 'Bright flat',
        slug: 'bright-flat',
        shortCode: 'abc12345',
      },
    ]);

    const row = await closeListing('listing_4', 'publisher_1');

    expect(row?.status).toBe('closed');
    expect(removeListingFromIndex).toHaveBeenCalledWith('listing_4');
    await vi.waitFor(() => {
      expect(notifyListingActivityEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          publisherId: 'publisher_1',
          title: 'Listing closed',
        }),
      );
    });
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

  it('removes unapproved active listings from search index', async () => {
    findFirst.mockResolvedValue({
      id: 'listing_8',
      status: 'active',
      publishedAt: new Date(),
      moderationStatus: 'pending',
    });
    updateReturning.mockResolvedValue([{ id: 'listing_8', status: 'active', moderationStatus: 'pending' }]);

    await updateListing('listing_8', 'publisher_1', { title: 'Updated title' });

    expect(removeListingFromIndex).toHaveBeenCalledWith('listing_8');
    expect(indexListing).not.toHaveBeenCalled();
  });

  it('removes paused listings from search index', async () => {
    findFirst.mockResolvedValue({
      id: 'listing_9',
      status: 'active',
      publishedAt: new Date(),
      moderationStatus: 'approved',
    });
    updateReturning.mockResolvedValue([
      {
        id: 'listing_9',
        status: 'paused',
        moderationStatus: 'approved',
        publisherId: 'publisher_1',
        title: 'Bright flat',
        slug: 'bright-flat',
        shortCode: 'abc12345',
      },
    ]);

    await updateListing('listing_9', 'publisher_1', { status: 'paused' });

    expect(removeListingFromIndex).toHaveBeenCalledWith('listing_9');
    await vi.waitFor(() => {
      expect(notifyListingActivityEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Listing paused',
        }),
      );
    });
  });

  it('loads listings by short code', async () => {
    findFirst.mockResolvedValueOnce({ id: 'by-code' });
    expect(await getListingByPath('bright-flat--abc12345')).toEqual({ id: 'by-code' });
  });

  it('loads listings by legacy slug', async () => {
    findFirst.mockResolvedValueOnce({ id: 'by-slug' });
    expect(await getListingByPath('legacy-slug')).toEqual({ id: 'by-slug' });
  });

  it('loads publisher-owned listings', async () => {
    findFirst.mockResolvedValue({ id: 'listing_owned' });
    expect(await getListingForPublisher('listing_owned', 'publisher_1')).toEqual({ id: 'listing_owned' });
  });

  it('lists active approved listings for a publisher', async () => {
    findMany.mockResolvedValue([
      {
        id: 'listing_7',
        slug: 'bright-flat',
        shortCode: 'abc12345',
        title: 'Bright flat',
        category: 'full_flat',
        rentType: 'long_term',
        costs: { rentPerMonth: 1200 },
        sizeSqm: 55,
        rooms: 2,
        floorLevel: 2,
        neighborhood: 'kreuzberg',
        availableFrom: new Date('2026-03-01'),
        availableTo: null,
        anmeldungAvailable: true,
        schufaRequired: false,
        onlineViewingAvailable: true,
        lat: 52.499,
        lng: 13.418,
        approximateLocation: false,
        photoUrls: [],
        createdAt: new Date('2026-01-01'),
      },
    ]);

    const rows = await getActiveListingsForPublisher('publisher_1');
    expect(rows[0]?.path).toBe('bright-flat--abc12345');
  });
});
