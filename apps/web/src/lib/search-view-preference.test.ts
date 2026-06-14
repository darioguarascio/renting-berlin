import { beforeEach, describe, expect, it } from 'vitest';
import {
  getSearchViewModes,
  loadSearchViewPreference,
  parseSearchViewMode,
  resolveSearchView,
  saveSearchViewPreference,
  SEARCH_VIEW_COOKIE,
} from './search-view-preference';

describe('getSearchViewModes', () => {
  it('includes map only for offers', () => {
    expect(getSearchViewModes('offers')).toContain('map');
    expect(getSearchViewModes('requests')).not.toContain('map');
  });
});

describe('parseSearchViewMode', () => {
  it('accepts valid modes per scope', () => {
    expect(parseSearchViewMode('map', 'offers')).toBe('map');
    expect(parseSearchViewMode('map', 'requests')).toBeNull();
    expect(parseSearchViewMode('table', 'requests')).toBe('table');
  });
});

describe('resolveSearchView', () => {
  it('prefers the URL param over saved preference', () => {
    expect(resolveSearchView('list', 'offers', 'map')).toBe('list');
  });

  it('falls back to saved preference then cards', () => {
    expect(resolveSearchView(null, 'offers', 'table')).toBe('table');
    expect(resolveSearchView(null, 'requests', 'map')).toBe('cards');
    expect(resolveSearchView(null, 'offers', null)).toBe('cards');
  });
});

describe('saveSearchViewPreference', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = `${SEARCH_VIEW_COOKIE.offers}=;path=/;max-age=0`;
    document.cookie = `${SEARCH_VIEW_COOKIE.requests}=;path=/;max-age=0`;
  });

  it('persists valid views to localStorage and cookie', () => {
    saveSearchViewPreference('offers', 'list');
    expect(loadSearchViewPreference('offers')).toBe('list');
    expect(document.cookie).toContain(`${SEARCH_VIEW_COOKIE.offers}=list`);
  });

  it('keeps offers and requests preferences separate', () => {
    saveSearchViewPreference('offers', 'map');
    saveSearchViewPreference('requests', 'table');
    expect(loadSearchViewPreference('offers')).toBe('map');
    expect(loadSearchViewPreference('requests')).toBe('table');
  });

  it('ignores invalid views', () => {
    saveSearchViewPreference('requests', 'map');
    expect(loadSearchViewPreference('requests')).toBeNull();
    expect(localStorage.getItem('search-view:requests')).toBeNull();
  });
});
