import { useEffect, useState } from 'react';
import type { SavedSearchType } from '../lib/saved-searches';
import { buildSearchUrl } from '../lib/search-url';

interface SavedSearchItem {
  id: string;
  type: SavedSearchType;
  name: string;
  searchUrl: string;
  notifyEnabled: boolean;
}

interface Props {
  type: SavedSearchType;
  currentFilters: Record<string, unknown>;
}

export default function SavedSearchesSidebar({ type, currentFilters }: Props) {
  const [items, setItems] = useState<SavedSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUrl = buildSearchUrl(type, currentFilters);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/saved-searches');
        if (!res.ok) return;
        const data: { items: SavedSearchItem[] } = await res.json();
        if (!cancelled) {
          setItems(data.items.filter((i) => i.type === type));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [type]);

  if (loading) {
    return (
      <div className="mt-6 border-t border-[var(--color-border)] pt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-muted)]">Saved searches</p>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">Loading…</p>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-6 border-t border-[var(--color-border)] pt-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-ink-muted)]">Saved searches</p>
        <a href="/saved-searches" className="text-xs font-semibold text-[var(--color-brand)] hover:underline">
          Manage
        </a>
      </div>
      <ul className="mt-3 space-y-1">
        {items.map((item) => {
          const isActive = item.searchUrl === currentUrl;
          return (
            <li key={item.id}>
              <a
                href={item.searchUrl}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-[var(--color-brand-muted)] font-semibold text-[var(--color-brand-deep)]'
                    : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 opacity-60">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
                <span className="min-w-0 truncate">{item.name}</span>
                {item.notifyEnabled && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 shrink-0 text-[var(--color-brand)]" title="Notifications on">
                    <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 13h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6ZM10 18a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3Z" />
                  </svg>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
