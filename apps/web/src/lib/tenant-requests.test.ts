import { describe, expect, it, vi } from 'vitest';

vi.mock('../db', () => ({ db: {} }));
vi.mock('./user-handle', () => ({
  getUserByHandle: vi.fn(),
  requireUserHandle: vi.fn(),
}));

import {
  matchesTenantRequestFilters,
  parseHouseholdTypesParam,
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
    const parsed = tenantRequestInputSchema.parse({
      title: 'Looking for a flat in Kreuzberg',
      category: 'full_flat',
      rentType: 'long_term',
      budgetMax: 1200,
      desiredNeighborhoods: ['kreuzberg'],
      availableFrom: '2026-04-01',
      description: 'Quiet professional looking for a long-term flat in Kreuzberg.',
    });

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
