import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findFirstUser,
  insertReturning,
  selectLimitOffset,
  selectCount,
  selectLimit,
  requireUserHandle,
  getUserByHandle,
} = vi.hoisted(() => ({
  findFirstUser: vi.fn(),
  insertReturning: vi.fn(),
  selectLimitOffset: vi.fn(),
  selectCount: vi.fn(),
  selectLimit: vi.fn(),
  requireUserHandle: vi.fn(),
  getUserByHandle: vi.fn(),
}));

function createSelectChain() {
  let joined = false;
  const chain = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => {
      joined = true;
      return chain;
    }),
    where: vi.fn(() => {
      if (joined) {
        joined = false;
        return chain;
      }
      return {
        then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
          return Promise.resolve(selectCount()).then(onFulfilled, onRejected);
        },
      };
    }),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => ({
      offset: selectLimitOffset,
      then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(selectLimit()).then(onFulfilled, onRejected);
      },
    })),
  };
  return chain;
}

vi.mock('../db', () => ({
  db: {
    query: {
      users: { findFirst: findFirstUser },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: insertReturning,
      })),
    })),
    select: vi.fn(() => createSelectChain()),
  },
}));

vi.mock('./user-handle', () => ({
  getUserByHandle,
  requireUserHandle,
}));

vi.mock('./moderation-handlers', () => ({
  requestTenantRequestModeration: vi.fn(),
}));

import {
  createTenantRequest,
  getActiveTenantRequestForUser,
  getTenantRequestByHandle,
  getTenantRequestBySlug,
  matchesTenantRequestFilters,
  parseHouseholdTypesParam,
  searchTenantRequests,
  tenantRequestInputSchema,
} from './tenant-requests';

const baseItem = {
  category: 'full_flat',
  rentType: 'long_term',
  budgetMin: 800,
  budgetMax: 1200,
  desiredNeighborhoods: ['kreuzberg', 'neukolln'],
  anmeldungNeeded: true,
  hasSchufa: true,
  householdType: 'single',
};

const requestRow = {
  id: 'req_1',
  slug: 'seeker-bright-flat-abc123',
  seekerId: 'seeker_1',
  title: 'Looking for a flat in Kreuzberg',
  status: 'active',
  moderationStatus: 'approved',
  category: 'full_flat',
  rentType: 'long_term',
  budgetMin: 800,
  budgetMax: 1200,
  desiredNeighborhoods: ['kreuzberg'],
  availableFrom: new Date('2026-04-01'),
  availableTo: null,
  sizeMin: null,
  roomsMin: null,
  anmeldungNeeded: true,
  hasSchufa: true,
  householdType: 'single',
  monthlyIncome: null,
  hasPets: false,
  nationality: null,
  birthYear: null,
  needsBedLinens: false,
  occupation: null,
  isStudent: false,
  isSmoker: false,
  spokenLanguages: [],
  description: 'Quiet professional looking for a long-term flat in Kreuzberg.',
  photoUrls: [],
  visibility: 'everyone',
  publishedAt: new Date('2026-01-01'),
  createdAt: new Date('2026-01-01'),
};

const joinedRow = {
  request: requestRow,
  seekerId: 'seeker_1',
  seekerName: 'Seeker',
  seekerImage: null,
  seekerHandle: 'seeker_handle',
};

const validInput = {
  title: 'Looking for a flat in Kreuzberg',
  category: 'full_flat' as const,
  rentType: 'long_term' as const,
  budgetMax: 1200,
  desiredNeighborhoods: ['kreuzberg' as const],
  availableFrom: '2026-04-01',
  description: 'Quiet professional looking for a long-term flat in Kreuzberg.',
};

describe('matchesTenantRequestFilters', () => {
  it('matches when filters are empty', () => {
    expect(matchesTenantRequestFilters(baseItem, {})).toBe(true);
  });

  it('filters by category, rent type, budget, and flags', () => {
    expect(matchesTenantRequestFilters(baseItem, { category: 'full_flat', rentType: 'long_term' })).toBe(true);
    expect(matchesTenantRequestFilters(baseItem, { category: 'shared_room' })).toBe(false);
    expect(matchesTenantRequestFilters(baseItem, { minBudget: 900, maxBudget: 1300 })).toBe(true);
    expect(matchesTenantRequestFilters(baseItem, { minBudget: 1300 })).toBe(false);
    expect(matchesTenantRequestFilters(baseItem, { anmeldungNeeded: true, hasSchufa: true })).toBe(true);
    expect(matchesTenantRequestFilters({ ...baseItem, hasSchufa: false }, { hasSchufa: true })).toBe(false);
  });

  it('filters by neighborhood and household type', () => {
    expect(matchesTenantRequestFilters(baseItem, { neighborhood: 'kreuzberg' })).toBe(true);
    expect(matchesTenantRequestFilters(baseItem, { neighborhood: 'mitte' })).toBe(false);
    expect(matchesTenantRequestFilters(baseItem, { householdTypes: ['single'] })).toBe(true);
    expect(matchesTenantRequestFilters(baseItem, { householdTypes: ['couple'] })).toBe(false);
  });
});

describe('parseHouseholdTypesParam', () => {
  it('returns valid household types from query params', () => {
    const params = new URLSearchParams('householdTypes=single&householdTypes=couple&householdTypes=invalid');
    expect(parseHouseholdTypesParam(params)).toEqual(['single', 'couple']);
  });

  it('returns undefined when no valid values are present', () => {
    expect(parseHouseholdTypesParam(new URLSearchParams())).toBeUndefined();
  });
});

describe('tenantRequestInputSchema', () => {
  it('accepts a valid seeker profile payload', () => {
    const parsed = tenantRequestInputSchema.parse(validInput);
    expect(parsed.householdType).toBe('single');
    expect(parsed.status).toBe('active');
  });

  it('rejects invalid budgets and neighborhoods', () => {
    expect(() =>
      tenantRequestInputSchema.parse({
        title: 'Too short',
        category: 'full_flat',
        rentType: 'long_term',
        budgetMax: 1200,
        desiredNeighborhoods: [],
        availableFrom: '2026-04-01',
        description: 'Too short',
      }),
    ).toThrow();
  });
});

describe('createTenantRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserHandle.mockResolvedValue('seeker_handle');
    insertReturning.mockResolvedValue([requestRow]);
  });

  it('creates an active seeker profile', async () => {
    const row = await createTenantRequest('seeker_1', validInput);
    expect(row.id).toBe('req_1');
    expect(requireUserHandle).toHaveBeenCalledWith('seeker_1');
  });
});

describe('searchTenantRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectLimitOffset.mockResolvedValue([joinedRow]);
    selectLimit.mockResolvedValue([]);
    selectCount.mockResolvedValue([{ count: 1 }]);
  });

  it('returns paginated seeker profiles with handles', async () => {
    const result = await searchTenantRequests({ neighborhood: 'kreuzberg', page: 1, limit: 12 });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      handle: 'seeker_handle',
      title: requestRow.title,
    });
  });

  it('applies household type filters', async () => {
    await searchTenantRequests({ householdTypes: ['single', 'couple'], page: 1, limit: 12 });
    expect(selectLimitOffset).toHaveBeenCalledOnce();
  });
});

describe('getActiveTenantRequestForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectLimit.mockResolvedValue([joinedRow]);
  });

  it('returns the active profile for a user', async () => {
    const profile = await getActiveTenantRequestForUser('seeker_1');
    expect(profile?.handle).toBe('seeker_handle');
  });

  it('returns null when handle is missing', async () => {
    selectLimit.mockResolvedValue([
      {
        ...joinedRow,
        seekerHandle: null,
      },
    ]);

    expect(await getActiveTenantRequestForUser('seeker_1')).toBeNull();
  });
});

describe('getTenantRequestByHandle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserByHandle.mockResolvedValue({ id: 'seeker_1' });
    selectLimit.mockResolvedValue([joinedRow]);
  });

  it('loads active profiles by account handle', async () => {
    const profile = await getTenantRequestByHandle('@seeker_handle');
    expect(profile?.id).toBe('req_1');
  });

  it('falls back to slug lookup when handle is unknown', async () => {
    getUserByHandle.mockResolvedValue(null);
    selectLimit.mockResolvedValue([joinedRow]);

    const profile = await getTenantRequestByHandle('seeker-bright-flat-abc123');
    expect(profile?.slug).toBe('seeker-bright-flat-abc123');
  });

  it('supports deprecated slug lookup helper', async () => {
    getUserByHandle.mockResolvedValue(null);
    selectLimit.mockResolvedValue([joinedRow]);

    await expect(getTenantRequestBySlug('seeker-bright-flat-abc123')).resolves.toMatchObject({
      id: 'req_1',
    });
  });
});
