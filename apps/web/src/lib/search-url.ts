export type SearchUrlType = 'listings' | 'tenant_requests';

const PAGINATION_KEYS = new Set(['page', 'limit', 'view']);

export function normalizeFilters(filters: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (PAGINATION_KEYS.has(key)) continue;
    if (value === undefined || value === '' || value === false) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

export function appendFiltersToParams(params: URLSearchParams, filters: Record<string, unknown>) {
  for (const [key, value] of Object.entries(normalizeFilters(filters))) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, String(item));
      }
      continue;
    }
    params.set(key, String(value));
  }
}

export function buildSearchUrl(type: SearchUrlType, filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  appendFiltersToParams(params, filters);
  const base = type === 'listings' ? '/offers' : '/requests';
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function countActiveFilters(filters: Record<string, unknown>): number {
  return Object.keys(normalizeFilters(filters)).length;
}
