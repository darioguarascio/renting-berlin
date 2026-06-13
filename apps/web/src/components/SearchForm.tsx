import { useState } from 'react';
import type { ListingSearchFilters } from '../types/listing';
import { BERLIN_NEIGHBORHOODS, NEIGHBORHOOD_LABELS, CATEGORY_LABELS, RENT_TYPE_LABELS } from '../types/listing';
import { buildSearchUrl } from '../lib/search-url';

interface Props {
  initial?: ListingSearchFilters;
  layout?: 'inline' | 'sidebar';
}

export default function SearchForm({ initial = {}, layout = 'sidebar' }: Props) {
  const [filters, setFilters] = useState<ListingSearchFilters>(initial);
  const isSidebar = layout === 'sidebar';

  function update<K extends keyof ListingSearchFilters>(key: K, value: ListingSearchFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    window.location.href = buildSearchUrl('listings', filters as Record<string, unknown>);
  }

  return (
    <form onSubmit={handleSubmit} className={isSidebar ? 'space-y-4' : 'space-y-4'}>
      <div className={isSidebar ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
        <label className="block">
          <span className="field-label">Search</span>
          <input
            type="text"
            placeholder="Neighborhood, keyword..."
            value={filters.q ?? ''}
            onChange={(e) => update('q', e.target.value || undefined)}
            className="field-input"
          />
        </label>

        <label className="block">
          <span className="field-label">Category</span>
          <select
            value={filters.category ?? ''}
            onChange={(e) => update('category', (e.target.value || undefined) as ListingSearchFilters['category'])}
            className="field-input"
          >
            <option value="">Any</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="field-label">Rent type</span>
          <select
            value={filters.rentType ?? ''}
            onChange={(e) => update('rentType', (e.target.value || undefined) as ListingSearchFilters['rentType'])}
            className="field-input"
          >
            <option value="">Any</option>
            {Object.entries(RENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
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
            {BERLIN_NEIGHBORHOODS.map((n) => (
              <option key={n} value={n}>{NEIGHBORHOOD_LABELS[n]}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="field-label">Max rent (€/mo)</span>
          <input
            type="number"
            min={0}
            step={50}
            placeholder="e.g. 1200"
            value={filters.maxPrice ?? ''}
            onChange={(e) => update('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
            className="field-input"
          />
        </label>

        <label className="block">
          <span className="field-label">Min size (m²)</span>
          <input
            type="number"
            min={0}
            placeholder="e.g. 40"
            value={filters.minSize ?? ''}
            onChange={(e) => update('minSize', e.target.value ? Number(e.target.value) : undefined)}
            className="field-input"
          />
        </label>

        <label className="block">
          <span className="field-label">Available from</span>
          <input
            type="date"
            value={filters.availableFrom ?? ''}
            onChange={(e) => update('availableFrom', e.target.value || undefined)}
            className="field-input"
          />
        </label>
      </div>

      <div className="space-y-3 rounded-xl bg-[var(--color-brand-muted)] px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--color-brand-deep)]">
          <input
            type="checkbox"
            checked={filters.anmeldungAvailable ?? false}
            onChange={(e) => update('anmeldungAvailable', e.target.checked || undefined)}
            className="size-4 rounded border-[var(--color-brand)] text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
          />
          Anmeldung available
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--color-brand-deep)]">
          <input
            type="checkbox"
            checked={filters.schufaRequired === false}
            onChange={(e) => update('schufaRequired', e.target.checked ? false : undefined)}
            className="size-4 rounded border-[var(--color-brand)] text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
          />
          No SCHUFA required
        </label>
      </div>

      <button type="submit" className={`btn-brand ${isSidebar ? 'w-full text-sm' : 'w-full sm:w-auto'}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        Search listings
      </button>
    </form>
  );
}
