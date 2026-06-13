import SeekerRequestCard from './SeekerRequestCard';
import SaveSearchButton from './SaveSearchButton';
import { CATEGORY_LABELS, LISTING_CATEGORIES, RENT_TYPE_LABELS, RENT_TYPES } from '../types/listing';
import type { TenantRequestFull } from '../types/tenant-request';
import type { TenantRequestFilters } from '../lib/tenant-requests';

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
  isAuthenticated: boolean;
  loginRedirect: string;
}

function buildPageUrl(filters: TenantRequestFilters, page: number): string {
  const params = new URLSearchParams();
  Object.entries({ ...filters, page }).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== false) {
      params.set(key, String(value));
    }
  });
  return `/requests?${params.toString()}`;
}

export default function RequestsSearchPage({ initialFilters, result, isAuthenticated, loginRedirect }: Props) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Gesuche · Requests</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[var(--color-ink)]">People looking for a place</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--color-ink-muted)]">
            <strong className="font-semibold text-[var(--color-brand-deep)]">{result.total}</strong> profile{result.total !== 1 ? 's' : ''} found
            {!isAuthenticated && ' · log in for full details'}
          </p>
        </div>
        <a href="/requests/new" className="btn-brand text-sm">Post your profile</a>
      </div>

      <div className="card-float mt-8 p-4 sm:p-6">
        <form method="get" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="field-label" htmlFor="category">Looking for</label>
            <select id="category" name="category" className="field-input" defaultValue={initialFilters.category ?? ''}>
              <option value="">Any</option>
              {LISTING_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="rentType">Rent type</label>
            <select id="rentType" name="rentType" className="field-input" defaultValue={initialFilters.rentType ?? ''}>
              <option value="">Any</option>
              {RENT_TYPES.map((r) => (
                <option key={r} value={r}>{RENT_TYPE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="neighborhood">Neighborhood</label>
            <input id="neighborhood" name="neighborhood" type="text" className="field-input" placeholder="kreuzberg" defaultValue={initialFilters.neighborhood ?? ''} />
          </div>
          <div>
            <label className="field-label" htmlFor="maxBudget">Max budget (€/mo)</label>
            <input id="maxBudget" name="maxBudget" type="number" className="field-input" placeholder="1200" defaultValue={initialFilters.maxBudget ?? ''} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="anmeldungNeeded" value="true" defaultChecked={initialFilters.anmeldungNeeded} className="size-4 rounded border-[var(--color-border)]" />
            Needs Anmeldung
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="hasSchufa" value="true" defaultChecked={initialFilters.hasSchufa} className="size-4 rounded border-[var(--color-border)]" />
            Has SCHUFA
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" className="btn-teal text-sm">Search</button>
          </div>
        </form>
        <div className="mt-4 border-t border-[var(--color-border)] pt-4">
          <SaveSearchButton
            type="tenant_requests"
            filters={initialFilters as Record<string, unknown>}
            isAuthenticated={isAuthenticated}
            loginRedirect={loginRedirect}
          />
        </div>
      </div>

      {result.items.length > 0 ? (
        <>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((request) => (
              <SeekerRequestCard key={request.id} request={request} isAuthenticated={isAuthenticated} />
            ))}
          </div>
          {result.totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-3">
              {result.page > 1 ? (
                <a href={buildPageUrl(initialFilters, result.page - 1)} className="btn-ghost">Previous</a>
              ) : (
                <span className="btn-ghost opacity-40">Previous</span>
              )}
              <span className="rounded-xl border border-[var(--color-border)] bg-white px-5 py-2.5 text-sm font-semibold">
                {result.page} / {result.totalPages}
              </span>
              {result.page < result.totalPages ? (
                <a href={buildPageUrl(initialFilters, result.page + 1)} className="btn-ghost">Next</a>
              ) : (
                <span className="btn-ghost opacity-40">Next</span>
              )}
            </nav>
          )}
        </>
      ) : (
        <div className="mt-12 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-16 text-center">
          <p className="font-display text-lg font-bold text-[var(--color-ink)]">No seeker profiles match</p>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">Try broadening your filters or post your own profile.</p>
          <a href="/requests/new" className="btn-brand mt-6 inline-flex text-sm">Post your profile</a>
        </div>
      )}
    </div>
  );
}
