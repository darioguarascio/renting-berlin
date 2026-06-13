import { useEffect, useState } from 'react';
import ListingCheckoutModal from './ListingCheckoutModal';
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

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  draft: 'Draft',
  paused: 'Paused',
  closed: 'Closed',
};

export default function MyListingsPage() {
  const [items, setItems] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutListing, setCheckoutListing] = useState<MyListing | null>(null);

  useEffect(() => {
    fetch('/api/listings')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: MyListing[] }) => setItems(d.items))
      .finally(() => setLoading(false));
  }, []);

  async function deactivateListing(id: string) {
    const listing = items.find((l) => l.id === id);
    if (listing) {
      setCheckoutListing(listing);
    }
  }

  function onCheckoutComplete(status: string) {
    if (!checkoutListing) return;
    setItems((prev) =>
      prev.map((l) => (l.id === checkoutListing.id ? { ...l, status } : l)),
    );
    setCheckoutListing(null);
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-brand-muted)] px-6 py-14 text-center">
        <p className="font-display text-lg font-bold text-[var(--color-brand-deep)]">No listings yet</p>
        <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">Publish your first listing to reach Berlin tenants.</p>
        <a href="/listings/new" className="btn-brand mt-5 inline-flex text-sm">Create listing</a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {checkoutListing && (
        <ListingCheckoutModal
          listingId={checkoutListing.id}
          listingTitle={checkoutListing.title}
          onComplete={onCheckoutComplete}
          onCancel={() => setCheckoutListing(null)}
        />
      )}
      <div className="flex justify-end">
        <a href="/listings/new" className="btn-brand text-sm">New listing</a>
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
        {items.map((listing, idx) => {
          const neighborhoodLabel =
            NEIGHBORHOOD_LABELS[listing.neighborhood as keyof typeof NEIGHBORHOOD_LABELS] ?? listing.neighborhood;
          const isGrayedOut = listing.status === 'paused' || listing.status === 'closed';

          return (
            <div
              key={listing.id}
              className={`flex flex-wrap items-center gap-4 p-4 ${idx < items.length - 1 ? 'border-b border-[var(--color-border)]' : ''} ${isGrayedOut ? 'bg-[var(--color-paper)] opacity-70' : ''}`}
            >
              {listing.photoUrl ? (
                <img
                  src={listing.photoUrl}
                  alt=""
                  className={`size-16 shrink-0 rounded-xl object-cover ${isGrayedOut ? 'grayscale' : ''}`}
                />
              ) : (
                <div className={`flex size-16 shrink-0 items-center justify-center rounded-xl bg-[var(--color-brand-muted)] text-[var(--color-brand)] ${isGrayedOut ? 'grayscale opacity-60' : ''}`}>
                  🏠
                </div>
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={`/listings/${listing.path}`}
                  className={`font-display font-bold hover:text-[var(--color-brand-deep)] ${isGrayedOut ? 'text-[var(--color-ink-muted)]' : 'text-[var(--color-ink)]'}`}
                >
                  {listing.title}
                </a>
                <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                  {neighborhoodLabel} · €{listing.rentPerMonth}/mo
                </p>
              </div>
              <span className={`badge capitalize ${listing.status === 'active' ? 'badge-success' : listing.status === 'paused' ? 'badge-brand' : ''}`}>
                {STATUS_LABELS[listing.status] ?? listing.status}
              </span>
              <div className="flex flex-wrap gap-2">
                <a href={`/account/listings/${listing.id}/edit`} className="btn-ghost text-xs !px-3 !py-1.5">
                  Edit
                </a>
                {listing.status === 'active' && (
                  <button type="button" onClick={() => deactivateListing(listing.id)} className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--color-paper)]">
                    Deactivate
                  </button>
                )}
                {listing.status === 'paused' && (
                  <a
                    href={`/account/listings/${listing.id}/edit?reactivate=1`}
                    className="rounded-lg border border-[var(--color-brand)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-deep)] hover:bg-[var(--color-brand-muted)]"
                  >
                    Reactivate
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
