import { useEffect, useState } from 'react';
import type { SavedSearchRecord } from '../lib/saved-searches';

export default function SavedSearchesPage() {
  const [searches, setSearches] = useState<SavedSearchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/saved-searches');
      if (res.ok) {
        const data = await res.json();
        setSearches(data.items);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleNotify(id: string, notifyEnabled: boolean) {
    const res = await fetch(`/api/saved-searches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifyEnabled }),
    });
    if (res.ok) {
      const data = await res.json();
      setSearches((prev) => prev.map((s) => (s.id === id ? data.item : s)));
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/saved-searches/${id}`, { method: 'DELETE' });
    if (res.ok) setSearches((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;
  }

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Saved searches</h2>
      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
        We notify you when new listings or seeker profiles match your filters.{' '}
        <a href="/notifications" className="font-medium text-[var(--color-brand)] hover:underline">
          View notifications
        </a>
      </p>

      {searches.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-12 text-center">
          <p className="font-medium text-[var(--color-ink)]">No saved searches yet</p>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">Run a search and click &quot;Save this search&quot; to get alerts.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <a href="/offers" className="btn-teal text-sm">Browse listings</a>
            <a href="/requests" className="btn-ghost text-sm">Browse seekers</a>
          </div>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-white">
          {searches.map((search) => (
            <li key={search.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`badge ${search.type === 'listings' ? 'badge-brand' : 'badge-accent'}`}>
                    {search.type === 'listings' ? 'Offers' : 'Requests'}
                  </span>
                  {search.notifyEnabled && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-signal)]">Alerts on</span>
                  )}
                </div>
                <p className="mt-1 font-display font-bold text-[var(--color-ink)]">{search.name}</p>
                <a href={search.searchUrl} className="mt-1 inline-block text-sm text-[var(--color-brand)] hover:underline">
                  Run search →
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={search.notifyEnabled}
                    onChange={(e) => toggleNotify(search.id, e.target.checked)}
                    className="size-4 rounded border-[var(--color-border)]"
                  />
                  Notify me
                </label>
                <button type="button" onClick={() => remove(search.id)} className="btn-ghost !py-2 text-sm text-red-600">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
