import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findFirstSavedSearch,
  findManySavedSearches,
  findManySearchNotifications,
  insertReturning,
  updateReturning,
  updateWhere,
  deleteWhere,
  selectWhere,
  searchListings,
  searchTenantRequests,
  shouldNotifyInApp,
  enqueueEmailJob,
  findFirstListing,
  findFirstRequest,
  findFirstUser,
} = vi.hoisted(() => ({
  findFirstSavedSearch: vi.fn(),
  findManySavedSearches: vi.fn(),
  findManySearchNotifications: vi.fn(),
  insertReturning: vi.fn(),
  updateReturning: vi.fn(),
  updateWhere: vi.fn(),
  deleteWhere: vi.fn(),
  selectWhere: vi.fn(),
  searchListings: vi.fn(),
  searchTenantRequests: vi.fn(),
  shouldNotifyInApp: vi.fn(),
  enqueueEmailJob: vi.fn(),
  findFirstListing: vi.fn(),
  findFirstRequest: vi.fn(),
  findFirstUser: vi.fn(),
}));

vi.mock('../db', () => ({
  db: {
    query: {
      savedSearches: { findFirst: findFirstSavedSearch, findMany: findManySavedSearches },
      searchNotifications: { findMany: findManySearchNotifications },
      listings: { findFirst: findFirstListing },
      tenantRequests: { findFirst: findFirstRequest },
      users: { findFirst: findFirstUser },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: insertReturning,
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn((...args) => {
          updateWhere(...args);
          return { returning: updateReturning };
        }),
      })),
    })),
    delete: vi.fn(() => ({
      where: deleteWhere,
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: selectWhere,
      })),
    })),
  },
}));

vi.mock('./search', () => ({
  searchListings,
  matchesListingFilters: vi.fn(() => true),
  toSummary: vi.fn((row) => ({
    id: row.id,
    path: `${row.slug}--${row.shortCode}`,
    title: row.title,
  })),
}));

vi.mock('./tenant-requests', () => ({
  searchTenantRequests,
  matchesTenantRequestFilters: vi.fn(() => true),
}));

vi.mock('./notification-preferences', () => ({
  shouldNotifyInApp,
}));

vi.mock('./email-events', () => ({
  enqueueEmailJob,
}));

vi.mock('./email', () => ({
  buildSavedSearchEmail: vi.fn(() => ({ to: 'test@example.com' })),
}));

vi.mock('./site-url', () => ({
  getSiteUrl: vi.fn(() => 'https://renting.berlin'),
}));

import {
  createSavedSearch,
  deleteSavedSearch,
  filtersHash,
  generateSearchName,
  getUnreadSearchNotificationCount,
  listSavedSearches,
  listSearchNotifications,
  markAllSearchNotificationsRead,
  markSearchNotificationRead,
  notifyNewListing,
  notifyNewTenantRequest,
  updateSavedSearch,
} from './saved-searches';

const savedSearchRow = {
  id: 'search_1',
  userId: 'user_1',
  type: 'listings' as const,
  name: 'Kreuzberg listings',
  filters: { neighborhood: 'kreuzberg' },
  filterHash: 'hash_1',
  notifyEnabled: true,
  lastKnownIds: [],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

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

describe('saved search CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchListings.mockResolvedValue({ items: [{ id: 'listing_1' }] });
    searchTenantRequests.mockResolvedValue({ items: [{ id: 'req_1' }] });
  });

  it('lists saved searches for a user', async () => {
    findManySavedSearches.mockResolvedValue([savedSearchRow]);

    const rows = await listSavedSearches('user_1');

    expect(rows[0]).toMatchObject({
      id: 'search_1',
      searchUrl: expect.stringContaining('/offers'),
    });
  });

  it('returns an existing saved search instead of duplicating', async () => {
    findFirstSavedSearch.mockResolvedValue(savedSearchRow);

    const result = await createSavedSearch('user_1', 'listings', { neighborhood: 'kreuzberg' });

    expect(result.created).toBe(false);
    expect(insertReturning).not.toHaveBeenCalled();
  });

  it('creates a new saved search', async () => {
    findFirstSavedSearch.mockResolvedValue(null);
    insertReturning.mockResolvedValue([savedSearchRow]);

    const result = await createSavedSearch('user_1', 'listings', { neighborhood: 'kreuzberg' });

    expect(result.created).toBe(true);
    expect(result.saved.name).toBe('Kreuzberg listings');
  });

  it('creates saved seeker searches', async () => {
    findFirstSavedSearch.mockResolvedValue(null);
    insertReturning.mockResolvedValue([
      { ...savedSearchRow, type: 'tenant_requests', name: 'All seeker profiles' },
    ]);

    const result = await createSavedSearch('user_1', 'tenant_requests', {});

    expect(result.created).toBe(true);
    expect(searchTenantRequests).toHaveBeenCalledOnce();
  });

  it('updates saved searches owned by the user', async () => {
    findFirstSavedSearch.mockResolvedValue(savedSearchRow);
    updateReturning.mockResolvedValue([{ ...savedSearchRow, notifyEnabled: false }]);

    const updated = await updateSavedSearch('user_1', 'search_1', { notifyEnabled: false });

    expect(updated?.notifyEnabled).toBe(false);
  });

  it('returns null when updating a missing saved search', async () => {
    findFirstSavedSearch.mockResolvedValue(null);
    expect(await updateSavedSearch('user_1', 'missing', { notifyEnabled: false })).toBeNull();
  });

  it('deletes saved searches owned by the user', async () => {
    findFirstSavedSearch.mockResolvedValue(savedSearchRow);
    deleteWhere.mockResolvedValue(undefined);

    await expect(deleteSavedSearch('user_1', 'search_1')).resolves.toBe(true);
  });

  it('returns false when deleting a missing saved search', async () => {
    findFirstSavedSearch.mockResolvedValue(null);
    await expect(deleteSavedSearch('user_1', 'missing')).resolves.toBe(false);
  });
});

describe('search notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManySearchNotifications.mockResolvedValue([
      {
        id: 'note_1',
        savedSearchId: 'search_1',
        searchType: 'listings',
        title: 'New listing matches your search',
        body: 'Bright flat',
        link: '/listings/bright-flat--abc12345',
        readAt: null,
        createdAt: new Date('2026-01-03'),
      },
    ]);
    selectWhere.mockResolvedValue([{ count: 2 }]);
    updateWhere.mockResolvedValue(undefined);
  });

  it('lists notifications for a user', async () => {
    const rows = await listSearchNotifications('user_1');
    expect(rows[0]?.title).toMatch(/New listing/);
  });

  it('counts unread notifications', async () => {
    await expect(getUnreadSearchNotificationCount('user_1')).resolves.toBe(2);
  });

  it('marks one or all notifications as read', async () => {
    await markSearchNotificationRead('user_1', 'note_1');
    await markAllSearchNotificationsRead('user_1');
    expect(updateWhere).toHaveBeenCalled();
  });
});

describe('notifyNewListing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirstListing.mockResolvedValue({
      id: 'listing_1',
      slug: 'bright-flat',
      shortCode: 'abc12345',
      title: 'Bright flat',
      status: 'active',
      moderationStatus: 'approved',
      publisherId: 'pub_1',
    });
    findManySavedSearches.mockResolvedValue([
      { ...savedSearchRow, userId: 'user_2', lastKnownIds: [], filters: {} },
    ]);
    shouldNotifyInApp.mockResolvedValue(true);
    enqueueEmailJob.mockResolvedValue(undefined);
    insertReturning.mockResolvedValue([{ id: 'note_1' }]);
    updateReturning.mockResolvedValue([]);
  });

  it('creates notifications for matching saved searches', async () => {
    await notifyNewListing('listing_1');
    expect(enqueueEmailJob).toHaveBeenCalledOnce();
  });

  it('ignores inactive listings', async () => {
    findFirstListing.mockResolvedValue(null);
    await notifyNewListing('listing_1');
    expect(findManySavedSearches).not.toHaveBeenCalled();
  });

  it('ignores duplicate notification inserts', async () => {
    findFirstListing.mockResolvedValue({
      id: 'listing_1',
      slug: 'bright-flat',
      shortCode: 'abc12345',
      title: 'Bright flat',
      status: 'active',
      moderationStatus: 'approved',
      publisherId: 'pub_1',
    });
    findManySavedSearches.mockResolvedValue([
      { ...savedSearchRow, userId: 'user_2', lastKnownIds: [], filters: {} },
    ]);
    shouldNotifyInApp.mockResolvedValue(true);
    enqueueEmailJob.mockResolvedValue(undefined);
    insertReturning.mockRejectedValue(new Error('duplicate'));
    updateReturning.mockResolvedValue([]);

    await expect(notifyNewListing('listing_1')).resolves.toBeUndefined();
  });
});

describe('notifyNewTenantRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirstRequest.mockResolvedValue({
      id: 'req_1',
      title: 'Looking in Mitte',
      status: 'active',
      moderationStatus: 'approved',
      seekerId: 'seeker_1',
    });
    findFirstUser.mockResolvedValue({ handle: 'seeker_1' });
    findManySavedSearches.mockResolvedValue([
      { ...savedSearchRow, type: 'tenant_requests', userId: 'user_2', lastKnownIds: [], filters: {} },
    ]);
    shouldNotifyInApp.mockResolvedValue(true);
    enqueueEmailJob.mockResolvedValue(undefined);
    insertReturning.mockResolvedValue([{ id: 'note_1' }]);
    updateReturning.mockResolvedValue([]);
  });

  it('creates notifications for matching saved seeker searches', async () => {
    await notifyNewTenantRequest('req_1');
    expect(enqueueEmailJob).toHaveBeenCalledOnce();
  });

  it('returns early when seeker handle is missing', async () => {
    findFirstUser.mockResolvedValue(null);
    await notifyNewTenantRequest('req_1');
    expect(findManySavedSearches).not.toHaveBeenCalled();
  });
});
