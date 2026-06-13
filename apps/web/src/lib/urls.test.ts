import { describe, expect, it } from 'vitest';
import {
  accountProfileHref,
  buildListingPath,
  getHandleValidationError,
  isValidHandle,
  normalizeHandle,
  parseAccountHandle,
  parseListingPath,
  sanitizeHandleInput,
  seoSlug,
  suggestHandleFromName,
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
    expect(normalizeHandle('@Marco-Berlin!')).toBe('marco-berlin');
    expect(normalizeHandle('  berlin__seeker  ')).toBe('berlin_seeker');
    expect(parseAccountHandle('@Berlin_Seeker')).toBe('berlin_seeker');
  });

  it('sanitizes input while typing', () => {
    expect(sanitizeHandleInput('Marco Berlin!')).toBe('marcoberlin');
    expect(sanitizeHandleInput('a'.repeat(40))).toHaveLength(30);
  });

  it('validates handle format', () => {
    expect(isValidHandle('abc')).toBe(true);
    expect(isValidHandle('marco-berlin')).toBe(true);
    expect(isValidHandle('marco_berlin')).toBe(true);
    expect(isValidHandle('1bad')).toBe(false);
    expect(isValidHandle('ab')).toBe(false);
    expect(isValidHandle('-bad')).toBe(false);
  });

  it('reports validation errors', () => {
    expect(getHandleValidationError('')).toMatch(/enter a handle/i);
    expect(getHandleValidationError('ab')).toMatch(/at least 3/i);
    expect(getHandleValidationError('1abc')).toMatch(/start with a letter/i);
    expect(getHandleValidationError('marco-berlin')).toBeNull();
  });

  it('suggests handles from display names', () => {
    expect(suggestHandleFromName('Marco Silva')).toBe('marco_silva');
    expect(isValidHandle(suggestHandleFromName('Marco Silva'))).toBe(true);
  });
});
