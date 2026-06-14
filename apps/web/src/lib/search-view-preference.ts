import type { SearchViewMode } from '../types/search-view';

export type SearchViewScope = 'offers' | 'requests';

export const SEARCH_VIEW_COOKIE: Record<SearchViewScope, string> = {
  offers: 'rb_view_offers',
  requests: 'rb_view_requests',
};

const STORAGE_PREFIX = 'search-view:';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const MODES: Record<SearchViewScope, readonly SearchViewMode[]> = {
  offers: ['cards', 'list', 'table', 'map'],
  requests: ['cards', 'list', 'table'],
};

export function getSearchViewModes(scope: SearchViewScope): readonly SearchViewMode[] {
  return MODES[scope];
}

export function parseSearchViewMode(
  value: string | null | undefined,
  scope: SearchViewScope,
): SearchViewMode | null {
  if (!value) return null;
  return MODES[scope].includes(value as SearchViewMode) ? (value as SearchViewMode) : null;
}

export function resolveSearchView(
  viewParam: string | null,
  scope: SearchViewScope,
  savedView?: string | null,
): SearchViewMode {
  return (
    parseSearchViewMode(viewParam, scope) ??
    parseSearchViewMode(savedView, scope) ??
    'cards'
  );
}

export function loadSearchViewPreference(scope: SearchViewScope): SearchViewMode | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return parseSearchViewMode(localStorage.getItem(`${STORAGE_PREFIX}${scope}`), scope);
  } catch {
    return null;
  }
}

export function saveSearchViewPreference(scope: SearchViewScope, view: SearchViewMode) {
  if (typeof document === 'undefined') return;
  if (!parseSearchViewMode(view, scope)) return;
  localStorage.setItem(`${STORAGE_PREFIX}${scope}`, view);
  document.cookie = `${SEARCH_VIEW_COOKIE[scope]}=${encodeURIComponent(view)};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}
