import { useEffect, useState } from 'react';
import { trackEvent } from '../lib/rybbit';

interface CheckoutListing {
  id: string;
  title: string;
  rentType: string;
  availableFrom: string;
  availableTo: string | null;
}

interface CheckoutContact {
  conversationId: string;
  userId: string;
  userName: string;
  userImage: string | null;
  messageCount: number;
  lastMessageAt: string;
}

export type CheckoutIntent = 'unlist' | 'close';

interface Props {
  listingId: string;
  listingTitle: string;
  intent?: CheckoutIntent;
  onComplete: (status: string) => void;
  onCancel: () => void;
}

function defaultEndDate(listing: CheckoutListing): string {
  if (listing.availableTo) return listing.availableTo;
  const from = new Date(`${listing.availableFrom}T12:00:00.000Z`);
  if (listing.rentType === 'long_term') {
    from.setFullYear(from.getFullYear() + 1);
  } else if (listing.rentType === 'short_term') {
    from.setMonth(from.getMonth() + 3);
  } else {
    from.setDate(from.getDate() + 7);
  }
  return from.toISOString().slice(0, 10);
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ListingCheckoutModal({
  listingId,
  listingTitle,
  intent = 'unlist',
  onComplete,
  onCancel,
}: Props) {
  const closing = intent === 'close';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [listing, setListing] = useState<CheckoutListing | null>(null);
  const [contacts, setContacts] = useState<CheckoutContact[]>([]);
  const [rentedToUserId, setRentedToUserId] = useState<string | null>(null);
  const [rentalEndDate, setRentalEndDate] = useState('');

  useEffect(() => {
    fetch(`/api/listings/${listingId}/checkout`)
      .then((r) => {
        if (!r.ok) throw new Error('Could not load checkout');
        return r.json();
      })
      .then((data: { listing: CheckoutListing; contacts: CheckoutContact[] }) => {
        setListing(data.listing);
        setContacts(data.contacts);
        setRentalEndDate(defaultEndDate(data.listing));
      })
      .catch(() => setError('Could not load checkout details.'))
      .finally(() => setLoading(false));
  }, [listingId]);

  async function submit() {
    if (rentedToUserId && !rentalEndDate) {
      setError('Please enter when the tenancy ends.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/listings/${listingId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          rentedToUserId,
          rentalEndDate: rentedToUserId ? rentalEndDate : null,
          updateListingEndDate: true,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: { status: string } = await res.json();
      trackEvent(closing ? 'Listing Closed' : 'Listing Deactivated');
      onComplete(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  const tenantSelected = rentedToUserId !== null;
  const tenantName = contacts.find((c) => c.userId === rentedToUserId)?.userName;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-[var(--color-ink)]/40 backdrop-blur-sm" onClick={onCancel} />
      <div
        role="dialog"
        aria-labelledby="checkout-title"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-float)]"
      >
        <div className="border-b border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-4">
          <h2 id="checkout-title" className="font-display text-lg font-bold text-[var(--color-ink)]">
            {closing ? 'Close listing permanently' : 'Take listing offline'}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{listingTitle}</p>
        </div>

        <div className="max-h-[min(70vh,520px)] overflow-y-auto px-6 py-5">
          {loading && <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>}

          {!loading && error && !listing && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {!loading && listing && (
            <div className="space-y-6">
              {contacts.length > 0 ? (
                <section>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    Did you rent to anyone you messaged about this listing?
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    If yes, we&apos;ll schedule a mutual feedback exchange after the tenancy ends.
                  </p>
                  <div className="mt-3 space-y-2">
                    {contacts.map((c) => (
                      <label
                        key={c.userId}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                          rentedToUserId === c.userId
                            ? 'border-[var(--color-brand)] bg-[var(--color-brand-muted)]'
                            : 'border-[var(--color-border)] hover:bg-[var(--color-paper)]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tenant"
                          checked={rentedToUserId === c.userId}
                          onChange={() => setRentedToUserId(c.userId)}
                          className="size-4 accent-[var(--color-brand)]"
                        />
                        {c.userImage ? (
                          <img src={c.userImage} alt="" className="size-9 rounded-full object-cover" />
                        ) : (
                          <span className="flex size-9 items-center justify-center rounded-full bg-[var(--color-brand-muted)] text-xs font-bold text-[var(--color-brand-deep)]">
                            {c.userName.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[var(--color-ink)]">{c.userName}</span>
                          <span className="block text-xs text-[var(--color-ink-muted)]">
                            {c.messageCount} messages · last {formatRelative(c.lastMessageAt)}
                          </span>
                        </span>
                      </label>
                    ))}
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                        rentedToUserId === null
                          ? 'border-[var(--color-brand)] bg-[var(--color-brand-muted)]'
                          : 'border-[var(--color-border)] hover:bg-[var(--color-paper)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tenant"
                        checked={rentedToUserId === null}
                        onChange={() => setRentedToUserId(null)}
                        className="size-4 accent-[var(--color-brand)]"
                      />
                      <span className="text-sm font-semibold text-[var(--color-ink)]">
                        {closing ? 'No — close without scheduling feedback' : 'No — just unlisting the ad'}
                      </span>
                    </label>
                  </div>
                </section>
              ) : (
                <p className="text-sm text-[var(--color-ink-muted)]">
                  {closing
                    ? 'This listing will be removed for good and hidden from search. It cannot be reactivated.'
                    : 'This listing will be unlisted and hidden from search. You can reactivate it anytime.'}
                </p>
              )}

              {tenantSelected && (
                <section>
                  <label htmlFor="rental-end" className="block text-sm font-semibold text-[var(--color-ink)]">
                    When does the tenancy end?
                  </label>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    {listing.availableTo
                      ? 'Your listing shows this as the available-until date. Update it if the rental ends on a different day.'
                      : 'Set the date the rental period ends. Both of you can exchange feedback from this date onward.'}
                  </p>
                  <input
                    id="rental-end"
                    type="date"
                    value={rentalEndDate}
                    onChange={(e) => setRentalEndDate(e.target.value)}
                    className="field-input mt-3"
                    required
                  />
                  {listing.availableTo && listing.availableTo !== rentalEndDate && (
                    <p className="mt-2 text-xs text-[var(--color-brand-deep)]">
                      Listing end date will be updated to {new Date(`${rentalEndDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
                    </p>
                  )}
                </section>
              )}

              {tenantSelected && (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] px-4 py-3 text-xs text-[var(--color-ink-muted)]">
                  {closing ? (
                    <>
                      The listing will be closed permanently. Feedback with {tenantName} unlocks after the tenancy end date.
                    </>
                  ) : (
                    <>
                      The listing will be unlisted and hidden from search. Feedback with {tenantName} unlocks after the tenancy end date.
                    </>
                  )}
                </div>
              )}

              {error && listing && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--color-border)] px-6 py-4">
          <button type="button" onClick={onCancel} disabled={submitting} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading || submitting || !listing}
            className={closing ? 'rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50' : 'btn-brand'}
          >
            {submitting
              ? 'Saving…'
              : closing
                ? tenantSelected
                  ? 'Close & schedule feedback'
                  : 'Close permanently'
                : tenantSelected
                  ? 'Unlist & schedule feedback'
                  : 'Unlist listing'}
          </button>
        </div>
      </div>
    </div>
  );
}
