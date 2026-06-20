import { useEffect, useState } from 'react';
import type { StayOfferView } from '../lib/stay-offers';

function fmtRange(from: string, to: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${new Date(from).toLocaleDateString('en-GB', opts)} – ${new Date(to).toLocaleDateString('en-GB', opts)}`;
}

export default function StayOfferDetail({ offerId }: { offerId: string }) {
  const [offer, setOffer] = useState<StayOfferView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/stays/${offerId}`);
      if (res.ok) {
        const data = await res.json();
        setOffer(data.offer);
      } else {
        setError(res.status === 403 ? 'This stay is only visible to the host’s circle.' : 'Stay not found.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function claim() {
    const res = await fetch(`/api/stays/${offerId}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (res.ok) load();
  }

  async function respond(claimId: string, action: 'accept' | 'decline') {
    const res = await fetch(`/api/stays/${offerId}/claims/${claimId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) load();
  }

  if (loading) return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;
  if (error || !offer) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 text-center">
        <p className="text-sm text-[var(--color-ink-muted)]">{error}</p>
        <a href="/house-sitting" className="btn-ghost mt-4 text-sm">Back to house-sitting</a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
        <div className="flex items-center gap-2">
          {offer.hostImage ? (
            <img src={offer.hostImage} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-deep)] text-sm font-bold text-white">
              {offer.hostName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="text-sm font-semibold text-[var(--color-ink)]">
            {offer.hostHandle ? `@${offer.hostHandle}` : offer.hostName}
          </span>
        </div>

        <h1 className="mt-4 font-display text-2xl font-bold text-[var(--color-ink)]">{offer.title}</h1>
        <p className="mt-1 text-[var(--color-ink-muted)]">
          {offer.locationLabel} · {fmtRange(offer.availableFrom, offer.availableTo)}
        </p>
        {offer.note && <p className="mt-4 whitespace-pre-line text-[var(--color-ink)]">{offer.note}</p>}

        {offer.accessDetails && (
          <div className="mt-5 rounded-xl border border-[var(--color-brand)] bg-[var(--color-brand-muted)] p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand-deep)]">Access details</p>
            <p className="mt-1 whitespace-pre-line text-sm text-[var(--color-ink)]">{offer.accessDetails}</p>
          </div>
        )}
      </div>

      {!offer.isHost && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
          {offer.myClaim?.status === 'accepted' ? (
            <p className="text-sm font-semibold text-[var(--color-brand-deep)]">You got this stay. Enjoy!</p>
          ) : offer.myClaim?.status === 'declined' ? (
            <p className="text-sm text-[var(--color-ink-muted)]">This stay was given to someone else.</p>
          ) : offer.myClaim?.status === 'interested' ? (
            <p className="text-sm text-[var(--color-ink-muted)]">You asked for this stay — waiting on the host.</p>
          ) : offer.status === 'open' ? (
            <div className="space-y-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a note (optional)"
                rows={2}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
              />
              <button type="button" onClick={claim} className="btn-brand w-full text-sm">I want it</button>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-ink-muted)]">This stay is no longer open.</p>
          )}
        </div>
      )}

      {offer.isHost && offer.claims && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">Requests ({offer.claimCount})</h2>
          {offer.claims.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-ink-muted)]">No requests yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--color-border)]">
              {offer.claims.map((claim) => (
                <li key={claim.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {claim.claimantHandle ? `@${claim.claimantHandle}` : claim.claimantName}
                    </p>
                    {claim.message && <p className="text-xs text-[var(--color-ink-muted)]">{claim.message}</p>}
                  </div>
                  {claim.status === 'interested' && offer.status === 'open' ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => respond(claim.id, 'accept')} className="btn-brand !py-1.5 text-sm">Accept</button>
                      <button type="button" onClick={() => respond(claim.id, 'decline')} className="btn-ghost !py-1.5 text-sm text-red-600">Decline</button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">{claim.status}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
