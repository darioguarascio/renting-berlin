import { useState } from 'react';
import type { TenantRequestFilters } from '../lib/tenant-requests';
import { buildSearchUrl } from '../lib/search-url';
import { BERLIN_NEIGHBORHOODS_SORTED, NEIGHBORHOOD_LABELS, CATEGORY_LABELS, LISTING_CATEGORIES, RENT_TYPE_LABELS, RENT_TYPES } from '../types/listing';
import { HOUSEHOLD_LABELS, HOUSEHOLD_TYPES } from '../types/tenant-request';

interface Props {
  initial?: TenantRequestFilters;
}

export default function RequestsSearchForm({ initial = {} }: Props) {
  const [filters, setFilters] = useState<TenantRequestFilters>(initial);

  function update<K extends keyof TenantRequestFilters>(key: K, value: TenantRequestFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function toggleHousehold(type: (typeof HOUSEHOLD_TYPES)[number]) {
    setFilters((prev) => {
      const current = prev.householdTypes ?? [];
      const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
      return { ...prev, householdTypes: next.length > 0 ? next : undefined };
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    window.location.href = buildSearchUrl('tenant_requests', filters as Record<string, unknown>);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="field-label">Looking for</span>
        <select
          value={filters.category ?? ''}
          onChange={(e) => update('category', (e.target.value || undefined) as TenantRequestFilters['category'])}
          className="field-input"
        >
          <option value="">Any</option>
          {LISTING_CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="field-label">Rent type</span>
        <select
          value={filters.rentType ?? ''}
          onChange={(e) => update('rentType', (e.target.value || undefined) as TenantRequestFilters['rentType'])}
          className="field-input"
        >
          <option value="">Any</option>
          {RENT_TYPES.map((r) => (
            <option key={r} value={r}>{RENT_TYPE_LABELS[r]}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="field-label">Neighborhood</span>
        <select
          value={filters.neighborhood ?? ''}
          onChange={(e) => update('neighborhood', e.target.value || undefined)}
          className="field-input"
        >
          <option value="">All Berlin</option>
          {BERLIN_NEIGHBORHOODS_SORTED.map((n) => (
            <option key={n} value={n}>{NEIGHBORHOOD_LABELS[n]}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="field-label">Max budget (€/mo)</span>
        <input
          type="number"
          min={0}
          step={50}
          placeholder="e.g. 1200"
          value={filters.maxBudget ?? ''}
          onChange={(e) => update('maxBudget', e.target.value ? Number(e.target.value) : undefined)}
          className="field-input"
        />
      </label>

      <fieldset>
        <legend className="field-label">Household</legend>
        <div className="mt-2 space-y-2 rounded-xl bg-[var(--color-paper)] px-4 py-3">
          {HOUSEHOLD_TYPES.map((type) => (
            <label key={type} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--color-ink)]">
              <input
                type="checkbox"
                checked={filters.householdTypes?.includes(type) ?? false}
                onChange={() => toggleHousehold(type)}
                className="size-4 rounded border-[var(--color-border)] text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
              />
              {HOUSEHOLD_LABELS[type]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-3 rounded-xl bg-[var(--color-brand-muted)] px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--color-brand-deep)]">
          <input
            type="checkbox"
            checked={filters.anmeldungNeeded ?? false}
            onChange={(e) => update('anmeldungNeeded', e.target.checked || undefined)}
            className="size-4 rounded border-[var(--color-brand)] text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
          />
          Needs Anmeldung
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--color-brand-deep)]">
          <input
            type="checkbox"
            checked={filters.hasSchufa ?? false}
            onChange={(e) => update('hasSchufa', e.target.checked || undefined)}
            className="size-4 rounded border-[var(--color-brand)] text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
          />
          Has SCHUFA
        </label>
      </div>

      <button type="submit" className="btn-teal w-full text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        Search profiles
      </button>
    </form>
  );
}
