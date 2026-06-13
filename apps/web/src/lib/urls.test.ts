import { describe, expect, it } from 'vitest';
import {
  accountProfileHref,
  buildListingPath,
  isValidHandle,
  normalizeHandle,
  parseAccountHandle,
  parseListingPath,
  seoSlug,
} from './urls';

describe('seoSlug', () => {
  it('slugifies listing titles', () => {
    expect(seoSlug('Bright 2-room flat in Neukölln!')).toBe('bright-2-room-flat-in-neuk-lln');
  });

  it('falls back when input has no alphanumerics', () => {
    expect(seoSlug('!!!')).toBe('listing');
  });
});

describe('buildListingPath', () => {
  it('joins seo slug and short code', () => {
    expect(buildListingPath('bright-flat', 'abc12345')).toBe('bright-flat--abc12345');
  });
});

describe('parseListingPath', () => {
  it('extracts short code from canonical paths', () => {
    expect(parseListingPath('bright-flat--abc12345')).toEqual({
      shortCode: 'abc12345',
      legacySlug: 'bright-flat--abc12345',
    });
  });

  it('treats legacy slugs without separator as legacy only', () => {
    expect(parseListingPath('old-listing-slug')).toEqual({
      shortCode: null,
      legacySlug: 'old-listing-slug',
    });
  });
});

describe('account handles', () => {
  it('builds profile hrefs', () => {
    expect(accountProfileHref('berlin_seeker')).toBe('/u/berlin_seeker');
  });

  it('normalizes user input', () => {
    expect(normalizeHandle('@Berlin Seeker!')).toBe('berlin_seeker');
    expect(parseAccountHandle('@Berlin_Seeker')).toBe('berlin_seeker');
  });

  it('validates handle format', () => {
    expect(isValidHandle('abc')).toBe(true);
    expect(isValidHandle('1bad')).toBe(false);
    expect(isValidHandle('ab')).toBe(false);
  });
});
