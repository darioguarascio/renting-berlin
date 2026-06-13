import { useEffect, useState } from 'react';
import { NEIGHBORHOOD_LABELS } from '../types/listing';

interface MyListing {
  id: string;
  path: string;
  title: string;
  status: string;
  rentPerMonth: number;
  neighborhood: string;
  photoUrl: string | null;
}

export default function DashboardListings() {
  const [items, setItems] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/listings')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: MyListing[] }) => setItems(d.items))
      .finally(() => setLoading(false));
  }, []);

  async function closeListing(id: string) {
    if (!confirm('Close this listing? Contacts will be eligible for feedback later.')) return;
    const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
    if (res.ok) setItems((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'closed' } : l)));
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-white p-4 animate-pulse">
            <div className="size-16 rounded-xl bg-[var(--color-paper-warm)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-[var(--color-paper-warm)]" />
              <div className="h-3 w-32 rounded bg-[var(--color-paper-warm)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-brand-muted)] px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-white shadow-[var(--shadow-card)]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-6 text-[var(--color-brand)]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </div>
        <p className="font-display text-lg font-bold text-[var(--color-brand-deep)]">No listings yet</p>
        <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">Publish your first listing to start reaching Berlin tenants.</p>
        <a href="/listings/new" className="btn-brand mt-5">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Create listing
        </a>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
      {items.map((listing, idx) => {
        const neighborhoodLabel =
          NEIGHBORHOOD_LABELS[listing.neighborhood as keyof typeof NEIGHBORHOOD_LABELS] ?? listing.neighborhood;

        return (
          <div
            key={listing.id}
            className={`flex items-center gap-4 p-4 transition hover:bg-[var(--color-paper)] ${idx < items.length - 1 ? 'border-b border-[var(--color-border)]' : ''}`}
          >
            {listing.photoUrl ? (
              <img src={listing.photoUrl} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-muted)]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6 text-[var(--color-brand)]/50">
                  <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <a
                href={`/listings/${listing.path}`}
                className="font-display font-bold text-[var(--color-ink)] hover:text-[var(--color-brand-deep)]"
              >
                {listing.title}
              </a>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3 text-[var(--color-brand)]">
                  <path fillRule="evenodd" d="m8 14.5 5.5-5A5 5 0 1 0 2.5 9.5l5.5 5Z" clipRule="evenodd" />
                </svg>
                {neighborhoodLabel}
                <span className="text-[var(--color-border)]">·</span>
                €{listing.rentPerMonth}/mo
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`badge ${listing.status === 'active' ? 'badge-success' : 'badge-brand'} capitalize`}>
                {listing.status}
              </span>
              {listing.status === 'active' && (
                <button
                  type="button"
                  onClick={() => closeListing(listing.id)}
                  className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
