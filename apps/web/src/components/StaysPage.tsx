import { useEffect, useState, type FormEvent } from 'react';
import type { StayOfferView } from '../lib/stay-offers';
import type { StayClaimView } from '../lib/stay-claims';

function fmtRange(from: string, to: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${new Date(from).toLocaleDateString('en-GB', opts)} – ${new Date(to).toLocaleDateString('en-GB', opts)}`;
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  taken: 'Taken',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

const emptyForm = {
  title: '',
  locationLabel: '',
  note: '',
  accessDetails: '',
  availableFrom: '',
  availableTo: '',
  autoAcceptFirst: false,
};

export default function StaysPage() {
  const [feed, setFeed] = useState<StayOfferView[]>([]);
  const [mine, setMine] = useState<StayOfferView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/stays');
      if (res.ok) {
        const data = await res.json();
        setFeed(data.feed);
        setMine(data.mine);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/stays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ ...emptyForm });
        setShowForm(false);
        load();
      } else {
        setError(await res.text());
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function claim(offerId: string) {
    const res = await fetch(`/api/stays/${offerId}/claims`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.ok) load();
  }

  async function respond(claimId: string, action: 'accept' | 'decline', offerId: string) {
    const res = await fetch(`/api/stays/${offerId}/claims/${claimId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) load();
  }

  async function cancelOffer(offerId: string) {
    const res = await fetch(`/api/stays/${offerId}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;
  }

  return (
    <div className="space-y-12">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">My place is free</h2>
          <button type="button" onClick={() => setShowForm((s) => !s)} className="btn-brand text-sm">
            {showForm ? 'Cancel' : 'Post house-sitting'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={submit} className="mt-5 space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-ink)]">Title</span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="My place in Neukölln"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-ink)]">Where</span>
                <input
                  required
                  value={form.locationLabel}
                  onChange={(e) => setForm({ ...form, locationLabel: e.target.value })}
                  placeholder="Berlin · Neukölln"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-ink)]">From</span>
                <input
                  required
                  type="date"
                  value={form.availableFrom}
                  onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-[var(--color-ink)]">To</span>
                <input
                  required
                  type="date"
                  value={form.availableTo}
                  onChange={(e) => setForm({ ...form, availableTo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--color-ink)]">Note (optional)</span>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Cat needs feeding twice a day. Bikes in the hallway are yours to use."
                rows={2}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--color-ink)]">Access details (shared only with the guest you accept)</span>
              <textarea
                value={form.accessDetails}
                onChange={(e) => setForm({ ...form, accessDetails: e.target.value })}
                placeholder="Address, door code, where the keys are."
                rows={2}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.autoAcceptFirst}
                onChange={(e) => setForm({ ...form, autoAcceptFirst: e.target.checked })}
                className="size-4 rounded border-[var(--color-border)]"
              />
              First come, first served — auto-accept whoever asks first
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={submitting} className="btn-brand text-sm">
              {submitting ? 'Posting…' : 'Share with my circle'}
            </button>
          </form>
        )}

        {mine.length > 0 && (
          <ul className="mt-6 space-y-4">
            {mine.map((offer) => (
              <li key={offer.id} className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge badge-brand">{STATUS_LABEL[offer.status]}</span>
                      {offer.autoAcceptFirst && offer.status === 'open' && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-signal)]">Auto-accept</span>
                      )}
                    </div>
                    <p className="mt-1 font-display font-bold text-[var(--color-ink)]">{offer.title}</p>
                    <p className="text-sm text-[var(--color-ink-muted)]">
                      {offer.locationLabel} · {fmtRange(offer.availableFrom, offer.availableTo)}
                    </p>
                  </div>
                  {offer.status === 'open' && (
                    <button type="button" onClick={() => cancelOffer(offer.id)} className="btn-ghost !py-2 text-sm text-red-600">
                      Cancel
                    </button>
                  )}
                </div>
                <HostClaims offer={offer} onRespond={respond} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Open in your circle</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Places your friends have made free. First to be accepted gets it.</p>

        {feed.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-12 text-center">
            <p className="font-medium text-[var(--color-ink)]">Nothing open right now</p>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Grow your circle so friends' house-sitting offers show up here.
            </p>
            <a href="/circle" className="btn-ghost mt-4 text-sm">Manage your circle</a>
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {feed.map((offer) => (
              <li key={offer.id} className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-white p-5">
                <div className="flex items-center gap-2">
                  {offer.hostImage ? (
                    <img src={offer.hostImage} alt="" className="size-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-deep)] text-xs font-bold text-white">
                      {offer.hostName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-[var(--color-ink)]">
                    {offer.hostHandle ? `@${offer.hostHandle}` : offer.hostName}
                  </span>
                </div>
                <p className="mt-3 font-display font-bold text-[var(--color-ink)]">{offer.title}</p>
                <p className="text-sm text-[var(--color-ink-muted)]">
                  {offer.locationLabel} · {fmtRange(offer.availableFrom, offer.availableTo)}
                </p>
                {offer.note && <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{offer.note}</p>}

                <div className="mt-4 pt-2">
                  {offer.myClaim ? (
                    <ClaimStatus claim={offer.myClaim} />
                  ) : (
                    <button type="button" onClick={() => claim(offer.id)} className="btn-brand w-full text-sm">
                      I want it
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ClaimStatus({ claim }: { claim: StayClaimView }) {
  if (claim.status === 'accepted') {
    return <p className="rounded-lg bg-[var(--color-brand-muted)] px-3 py-2 text-center text-sm font-semibold text-[var(--color-brand-deep)]">You got it — check your messages for access details.</p>;
  }
  if (claim.status === 'declined') {
    return <p className="rounded-lg bg-[var(--color-paper)] px-3 py-2 text-center text-sm text-[var(--color-ink-muted)]">Taken by someone else.</p>;
  }
  return <p className="rounded-lg bg-[var(--color-paper)] px-3 py-2 text-center text-sm text-[var(--color-ink-muted)]">You asked for this — waiting on the host.</p>;
}

function HostClaims({
  offer,
  onRespond,
}: {
  offer: StayOfferView;
  onRespond: (claimId: string, action: 'accept' | 'decline', offerId: string) => void;
}) {
  const claims = offer.claims ?? [];
  if (claims.length === 0) {
    return <p className="mt-3 text-sm text-[var(--color-ink-muted)]">No requests yet.</p>;
  }
  return (
    <ul className="mt-4 divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
      {claims.map((claim) => (
        <li key={claim.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-2">
            {claim.claimantImage ? (
              <img src={claim.claimantImage} alt="" className="size-8 rounded-full object-cover" />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-[var(--color-paper)] text-xs font-bold text-[var(--color-ink)]">
                {claim.claimantName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">
                {claim.claimantHandle ? `@${claim.claimantHandle}` : claim.claimantName}
              </p>
              {claim.message && <p className="text-xs text-[var(--color-ink-muted)]">{claim.message}</p>}
            </div>
          </div>
          {claim.status === 'interested' && offer.status === 'open' ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onRespond(claim.id, 'accept', offer.id)} className="btn-brand !py-1.5 text-sm">
                Accept
              </button>
              <button type="button" onClick={() => onRespond(claim.id, 'decline', offer.id)} className="btn-ghost !py-1.5 text-sm text-red-600">
                Decline
              </button>
            </div>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
              {claim.status}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
