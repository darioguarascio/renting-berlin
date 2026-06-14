import { useEffect } from 'react';
import SeekerRequestCard from './SeekerRequestCard';
import SeekerRequestRow from './SeekerRequestRow';
import SeekerRequestTable from './SeekerRequestTable';
import RequestsSearchForm from './RequestsSearchForm';
import SearchFilterLayout from './SearchFilterLayout';
import SearchViewSwitcher from './SearchViewSwitcher';
import type { SeekerDisplayRow } from '../lib/seeker-profile-visibility';
import type { TenantRequestFull } from '../types/tenant-request';
import type { TenantRequestFilters } from '../lib/tenant-requests';
import type { SearchViewMode } from '../types/search-view';
import { saveSearchViewPreference } from '../lib/search-view-preference';
import { appendFiltersToParams } from '../lib/search-url';

interface SearchResult {
  items: TenantRequestFull[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Props {
  initialFilters: TenantRequestFilters;
  result: SearchResult;
  displayRows: SeekerDisplayRow[];
  view: SearchViewMode;
  isAuthenticated: boolean;
  loginRedirect: string;
}

function buildPageUrl(filters: TenantRequestFilters, page: number, view: SearchViewMode): string {
  const params = new URLSearchParams();
  appendFiltersToParams(params, { ...filters, page });
  if (view !== 'cards') params.set('view', view);
  return `/requests?${params.toString()}`;
}

export default function RequestsSearchPage({
  initialFilters,
  result,
  displayRows,
  view,
  isAuthenticated,
  loginRedirect,
}: Props) {
  const hasRestrictedProfiles = result.items.some((item) => item.visibility !== 'everyone');

  useEffect(() => {
    if (isAuthenticated) {
      saveSearchViewPreference('requests', view);
    }
  }, [view, isAuthenticated]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Gesuche · Requests</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[var(--color-ink)]">People looking for a place</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--color-ink-muted)]">
            <strong className="font-semibold text-[var(--color-brand-deep)]">{result.total}</strong> profile{result.total !== 1 ? 's' : ''} found
            {!isAuthenticated && hasRestrictedProfiles && ' · log in for full details on some profiles'}
            {isAuthenticated && hasRestrictedProfiles && ' · some profiles have restricted visibility'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchViewSwitcher
            view={view}
            modes={['cards', 'list', 'table']}
            buildUrl={(v) => buildPageUrl(initialFilters, result.page, v)}
          />
          <a href="/requests/new" className="btn-brand text-sm">Post your profile</a>
        </div>
      </div>

      <div className="mt-8">
        <SearchFilterLayout
          searchType="tenant_requests"
          filters={initialFilters as Record<string, unknown>}
          isAuthenticated={isAuthenticated}
          loginRedirect={loginRedirect}
          clearFiltersHref="/requests"
          filterForm={<RequestsSearchForm initial={initialFilters} />}
        >
          {displayRows.length > 0 ? (
            <>
              {view === 'cards' ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {displayRows.map((row) => (
                    <SeekerRequestCard
                      key={row.request.id}
                      request={row.request}
                      canViewFull={row.canViewFull}
                      lockedReason={row.lockedReason}
                    />
                  ))}
                </div>
              ) : view === 'list' ? (
                <div className="space-y-3">
                  {displayRows.map((row) => (
                    <SeekerRequestRow
                      key={row.request.id}
                      request={row.request}
                      canViewFull={row.canViewFull}
                      lockedReason={row.lockedReason}
                    />
                  ))}
                </div>
              ) : (
                <SeekerRequestTable rows={displayRows} />
              )}

              {result.totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-3">
                  {result.page > 1 ? (
                    <a href={buildPageUrl(initialFilters, result.page - 1, view)} className="btn-ghost">Previous</a>
                  ) : (
                    <span className="btn-ghost opacity-40">Previous</span>
                  )}
                  <span className="rounded-xl border border-[var(--color-border)] bg-white px-5 py-2.5 text-sm font-semibold">
                    {result.page} / {result.totalPages}
                  </span>
                  {result.page < result.totalPages ? (
                    <a href={buildPageUrl(initialFilters, result.page + 1, view)} className="btn-ghost">Next</a>
                  ) : (
                    <span className="btn-ghost opacity-40">Next</span>
                  )}
                </nav>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-16 text-center">
              <p className="font-display text-lg font-bold text-[var(--color-ink)]">No seeker profiles match</p>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">Try broadening your filters or post your own profile.</p>
              <a href="/requests/new" className="btn-brand mt-6 inline-flex text-sm">Post your profile</a>
            </div>
          )}
        </SearchFilterLayout>
      </div>
    </div>
  );
}
