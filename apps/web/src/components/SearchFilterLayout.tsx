import { useEffect, useState, type ReactNode } from 'react';
import SaveSearchButton from './SaveSearchButton';
import SavedSearchesSidebar from './SavedSearchesSidebar';
import type { SavedSearchType } from '../lib/saved-searches';
import { countActiveFilters } from '../lib/search-url';

interface Props {
  children: ReactNode;
  searchType: SavedSearchType;
  filters: Record<string, unknown>;
  isAuthenticated: boolean;
  loginRedirect: string;
  filterForm: ReactNode;
  clearFiltersHref: string;
}

export default function SearchFilterLayout({
  children,
  searchType,
  filters,
  isAuthenticated,
  loginRedirect,
  filterForm,
  clearFiltersHref,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  const sidebarBody = (
    <>
      {filterForm}
      <div className="mt-5 border-t border-[var(--color-border)] pt-5">
        <SaveSearchButton
          type={searchType}
          filters={filters}
          isAuthenticated={isAuthenticated}
          loginRedirect={loginRedirect}
        />
      </div>
      {isAuthenticated && (
        <SavedSearchesSidebar type={searchType} currentFilters={filters} />
      )}
    </>
  );

  return (
    <>
      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100vw-2rem,320px)] flex-col bg-white shadow-[var(--shadow-float)]">
            <header className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <h2 className="font-display text-base font-bold text-[var(--color-ink)]">Filters</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex size-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
                aria-label="Close filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {sidebarBody}
            </div>
          </aside>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-[var(--color-ink)]">Filters</h2>
              {activeCount > 0 && (
                <a href={clearFiltersHref} className="text-xs font-semibold text-[var(--color-brand)] hover:underline">
                  Clear all
                </a>
              )}
            </div>
            <div className="mt-4">
              {sidebarBody}
            </div>
          </div>
        </aside>

        {/* Results column */}
        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)] shadow-sm transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75Zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
              </svg>
              Filters
              {activeCount > 0 && (
                <span className="rounded-full bg-[var(--color-brand)] px-2 py-0.5 text-xs font-bold text-white">
                  {activeCount}
                </span>
              )}
            </button>
            {activeCount > 0 && (
              <a href={clearFiltersHref} className="text-sm font-semibold text-[var(--color-brand)] hover:underline">
                Clear all
              </a>
            )}
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
