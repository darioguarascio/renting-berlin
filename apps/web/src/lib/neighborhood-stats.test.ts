import { describe, expect, it } from 'vitest';
import {
  buildNeighborhoodSeoDescription,
  buildNeighborhoodStatsFromRows,
  formatStatPercent,
} from './neighborhood-stats';

describe('buildNeighborhoodStatsFromRows', () => {
  it('aggregates listing metrics', () => {
    const stats = buildNeighborhoodStatsFromRows('kreuzberg', [
      {
        category: 'shared_room',
        rentType: 'long_term',
        sizeSqm: 18,
        rooms: 1,
        anmeldungAvailable: true,
        schufaRequired: false,
        onlineViewingAvailable: true,
        costs: { rentPerMonth: 700 },
      },
      {
        category: 'full_flat',
        rentType: 'long_term',
        sizeSqm: 60,
        rooms: 2,
        anmeldungAvailable: false,
        schufaRequired: true,
        onlineViewingAvailable: false,
        costs: { rentPerMonth: 1200 },
      },
    ]);

    expect(stats.totalListings).toBe(2);
    expect(stats.rent.min).toBe(700);
    expect(stats.rent.max).toBe(1200);
    expect(stats.rent.median).toBe(950);
    expect(stats.byCategory.shared_room).toBe(1);
    expect(stats.byCategory.full_flat).toBe(1);
    expect(stats.anmeldungAvailableCount).toBe(1);
    expect(stats.noSchufaCount).toBe(1);
  });
});

describe('buildNeighborhoodSeoDescription', () => {
  it('includes aggregate facts when listings exist', () => {
    const description = buildNeighborhoodSeoDescription('Kreuzberg', {
      neighborhood: 'kreuzberg',
      totalListings: 12,
      rent: { min: 500, max: 1800, median: 900, average: 950 },
      size: { averageSqm: 42, averageRooms: 2 },
      byCategory: { full_flat: 8, shared_room: 4 },
      byRentType: { long_term: 10, short_term: 2, overnight: 0 },
      anmeldungAvailableCount: 6,
      noSchufaCount: 4,
      onlineViewingCount: 3,
    });

    expect(description).toContain('12 active rentals');
    expect(description).toContain('€900/mo');
    expect(description).toContain('Sign up free');
  });
});

describe('formatStatPercent', () => {
  it('rounds percentages', () => {
    expect(formatStatPercent(1, 3)).toBe('33%');
    expect(formatStatPercent(0, 0)).toBe('0%');
  });
});
