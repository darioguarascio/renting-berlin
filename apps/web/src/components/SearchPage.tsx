import SearchForm from './SearchForm';
import ListingCard from './ListingCard';
import ListingRow from './ListingRow';
import ListingTable from './ListingTable';
import ListingLockedSection from './ListingLockedSection';
import MapView from './MapView';
import SearchFilterLayout from './SearchFilterLayout';
import SearchViewSwitcher from './SearchViewSwitcher';
import {
  canViewListingDetails,
  getListingLockedReason,
  redactListingSummaryForViewer,
} from '../lib/listing-access';
import type { ListingSearchFilters, ListingSummary, SearchResult } from '../types/listing';
import type { SearchViewMode } from '../types/search-view';

interface Props {
  initialFilters: ListingSearchFilters;
  result: SearchResult;
  view: SearchViewMode;
  isAuthenticated: boolean;
  loginRedirect: string;
}

function buildPageUrl(filters: ListingSearchFilters, page: number, view: SearchViewMode): string {
  const params = new URLSearchParams();
  Object.entries({ ...filters, page }).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== false) {
      params.set(key, String(value));
    }
  });
  if (view !== 'cards') params.set('view', view);
  return `/offers?${params.toString()}`;
}

function prepareDisplayRows(items: ListingSummary[], isAuthenticated: boolean) {
  return items.map((listing) => {
    const canViewFull = canViewListingDetails({ isOwner: false, isAuthenticated });
    const lockedReason = getListingLockedReason({ isOwner: false, isAuthenticated });
    const displayListing = canViewFull ? listing : redactListingSummaryForViewer(listing);
    return { listing: displayListing, canViewFull, lockedReason };
  });
}

export default function SearchPage({ initialFilters, result, view, isAuthenticated, loginRedirect }: Props) {
  const displayRows = prepareDisplayRows(result.items, isAuthenticated);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand)]">Angebote · Offers</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[var(--color-ink)]">Apartments for rent</h1>
          <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
            <strong className="font-semibold text-[var(--color-brand-deep)]">{result.total}</strong> listing{result.total !== 1 ? 's' : ''} found
            {!isAuthenticated && ' · sign up free for photos and contact'}
          </p>
        </div>
        <SearchViewSwitcher view={view} buildUrl={(v) => buildPageUrl(initialFilters, result.page, v)} />
      </div>

      <SearchFilterLayout
        searchType="listings"
        filters={initialFilters as Record<string, unknown>}
        isAuthenticated={isAuthenticated}
        loginRedirect={loginRedirect}
        clearFiltersHref="/offers"
        filterForm={<SearchForm initial={initialFilters} layout="sidebar" />}
      >
        {view === 'map' ? (
          isAuthenticated ? (
            <MapView listings={result.items} height="600px" />
          ) : (
            <ListingLockedSection loginRedirect={loginRedirect} />
          )
        ) : (
          <>
            {view === 'cards' ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {displayRows.map((row) => (
                  <ListingCard
                    key={row.listing.id}
                    listing={row.listing}
                    canViewFull={row.canViewFull}
                    lockedReason={row.lockedReason}
                  />
                ))}
              </div>
            ) : view === 'list' ? (
              <div className="space-y-3">
                {displayRows.map((row) => (
                  <ListingRow
                    key={row.listing.id}
                    listing={row.listing}
                    canViewFull={row.canViewFull}
                    lockedReason={row.lockedReason}
                  />
                ))}
              </div>
            ) : (
              <ListingTable rows={displayRows} />
            )}

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
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </nav>
            )}
          </>
        )}
      </SearchFilterLayout>
    </div>
  );
}
