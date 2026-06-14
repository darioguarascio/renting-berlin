import { describe, expect, it } from 'vitest';
import {
  formatBudget,
  formatIncome,
  formatLanguageList,
  formatNationality,
  formatNeighborhoodList,
  toPublicProfile,
} from './tenant-request';

describe('tenant request formatters', () => {
  it('formats neighborhood lists', () => {
    expect(formatNeighborhoodList([])).toBe('Anywhere in Berlin');
    expect(formatNeighborhoodList(['kreuzberg', 'mitte'])).toContain('Kreuzberg');
  });

  it('formats money values', () => {
    expect(formatBudget(1200)).toContain('1');
    expect(formatBudget(1200)).toContain('200');
    expect(formatIncome(2500)).toContain('2');
  });

  it('formats languages and nationality', () => {
    expect(formatLanguageList([])).toBe('—');
    expect(formatLanguageList(['en', 'de'])).toContain('en');
    expect(formatNationality(null)).toBe('—');
    expect(formatNationality('german')).toBe('german');
  });

  it('maps full profiles to public summaries', () => {
    const publicProfile = toPublicProfile({
      id: 'req_1',
      slug: 'seeker-bright-flat',
      handle: 'seeker_handle',
      title: 'Looking in Kreuzberg',
      category: 'full_flat',
      rentType: 'long_term',
      budgetMin: 800,
      budgetMax: 1200,
      desiredNeighborhoods: ['kreuzberg', 'neukolln'],
      availableFrom: '2026-04-01T00:00:00.000Z',
      availableTo: null,
      sizeMin: null,
      roomsMin: null,
      anmeldungNeeded: true,
      hasSchufa: true,
      householdType: 'single',
      monthlyIncome: null,
      hasPets: false,
      nationality: 'de',
      birthYear: null,
      needsBedLinens: false,
      occupation: null,
      isStudent: true,
      isSmoker: false,
      spokenLanguages: ['en'],
      description: 'Quiet professional looking for a long-term flat in Kreuzberg.',
      photoUrls: [],
      visibility: 'everyone',
      seekerName: 'Seeker',
      seekerImage: null,
      seekerId: 'seeker_1',
      status: 'active',
      moderationStatus: 'approved',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(publicProfile.areaCount).toBe(2);
    expect(publicProfile.isStudent).toBe(true);
  });
});
