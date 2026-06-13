import SearchForm from './SearchForm';
import ListingCard from './ListingCard';
import MapView from './MapView';
import SaveSearchButton from './SaveSearchButton';
import type { ListingSearchFilters, SearchResult } from '../types/listing';

interface Props {
  initialFilters: ListingSearchFilters;
  result: SearchResult;
  view: 'list' | 'map';
  isAuthenticated: boolean;
  loginRedirect: string;
}

function buildPageUrl(filters: ListingSearchFilters, page: number, view: 'list' | 'map'): string {
  const params = new URLSearchParams();
  Object.entries({ ...filters, page }).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== false) {
      params.set(key, String(value));
    }
  });
  if (view === 'map') params.set('view', 'map');
  return `/offers?${params.toString()}`;
}

export default function SearchPage({ initialFilters, result, view, isAuthenticated, loginRedirect }: Props) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand)]">Angebote · Offers</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[var(--color-ink)]">Apartments for rent</h1>
          <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
            <strong className="font-semibold text-[var(--color-brand-deep)]">{result.total}</strong> listing{result.total !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="inline-flex overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
          <a
            href={buildPageUrl(initialFilters, result.page, 'list')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition ${view === 'list' ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-brand-muted)] hover:text-[var(--color-brand-deep)]'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
            </svg>
            List
          </a>
          <div className="w-px bg-[var(--color-border)]" />
          <a
            href={buildPageUrl(initialFilters, result.page, 'map')}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition ${view === 'map' ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-brand-muted)] hover:text-[var(--color-brand-deep)]'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M8.157 2.176a1.5 1.5 0 0 0-1.147 0l-4.084 1.69A1.5 1.5 0 0 0 2 5.25v10.877a.75.75 0 0 0 1.067.672l3.996-1.654 4.144 1.712a1.5 1.5 0 0 0 1.147 0l4.083-1.69A1.5 1.5 0 0 0 17.5 13.75V2.873a.75.75 0 0 0-1.067-.672l-3.996 1.654L8.293 2.143a1.5 1.5 0 0 0-.136-.033V2.176ZM6.5 4.397v9.995L4 15.342V5.25l2.5-1.038V4.397Zm1.5 9.993L12 16.106V6.11L8 4.395v9.995Zm5.5 1.712V5.75l2.5-1.035v10.092l-2.5 1.035Z" clipRule="evenodd" />
            </svg>
            Map
          </a>
        </div>
      </div>

      <div className="card-float mb-8 p-4 sm:p-6">
        <SearchForm initial={initialFilters} compact />
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <SaveSearchButton
            type="listings"
            filters={initialFilters as Record<string, unknown>}
            isAuthenticated={isAuthenticated}
            loginRedirect={loginRedirect}
          />
        </div>
      </div>

      {view === 'map' ? (
        <MapView listings={result.items} height="600px" />
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>

          {result.items.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-brand-muted)] px-6 py-20 text-center">
              <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-white shadow-[var(--shadow-card)]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-7 text-[var(--color-brand)]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 15.803a7.5 7.5 0 0 0 10.607 0Z" />
                </svg>
              </div>
              <p className="font-display text-xl font-bold text-[var(--color-brand-deep)]">No matches found</p>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                Try broadening your filters or searching a different neighborhood.
              </p>
              <a href="/offers" className="btn-ghost mt-6">Clear filters</a>
            </div>
          )}

          {result.totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-3">
              {result.page > 1 ? (
                <a href={buildPageUrl(initialFilters, result.page - 1, view)} className="btn-ghost">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                    <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                  </svg>
                  Previous
                </a>
              ) : (
                <span className="btn-ghost opacity-40 cursor-not-allowed">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                    <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
                  </svg>
                  Previous
                </span>
              )}
              <span className="rounded-xl border border-[var(--color-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)]">
                {result.page} / {result.totalPages}
              </span>
              {result.page < result.totalPages ? (
                <a href={buildPageUrl(initialFilters, result.page + 1, view)} className="btn-ghost">
                  Next
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </a>
              ) : (
                <span className="btn-ghost opacity-40 cursor-not-allowed">
                  Next
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
