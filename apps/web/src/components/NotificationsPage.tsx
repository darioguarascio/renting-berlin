import { useEffect, useState } from 'react';
import type { NotificationRecord } from '../lib/notifications';

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  saved_search_listing: { label: 'Search', className: 'badge-brand' },
  saved_search_seeker: { label: 'Search', className: 'badge-accent' },
  connection_accepted: { label: 'Circle', className: 'badge-accent' },
  stay_offer_new: { label: 'House-sitting', className: 'badge-brand' },
  stay_claim_new: { label: 'House-sitting', className: 'badge-brand' },
  stay_claim_accepted: { label: 'House-sitting', className: 'badge-brand' },
  stay_claim_declined: { label: 'House-sitting', className: 'badge-accent' },
};

function formatWhen(createdAt: string) {
  return new Date(createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function NotificationRow({
  n,
  onOpen,
}: {
  n: NotificationRecord;
  onOpen: (n: NotificationRecord) => void;
}) {
  const badge = TYPE_BADGE[n.type] ?? { label: 'Update', className: 'badge-brand' };
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(n)}
        className={`flex w-full items-start gap-3 p-4 text-left transition hover:bg-[var(--color-paper)] ${n.isNew ? 'bg-[var(--color-brand-muted)]/40' : ''}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${badge.className}`}>{badge.label}</span>
            <p className="text-sm font-semibold text-[var(--color-ink)]">{n.title}</p>
          </div>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{n.body}</p>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{formatWhen(n.createdAt)}</p>
        </div>
        {n.isNew && <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--color-signal)]" />}
      </button>
    </li>
  );
}

export default function NotificationsPage() {
  const [newItems, setNewItems] = useState<NotificationRecord[]>([]);
  const [olderItems, setOlderItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNewItems(data.newItems);
          setOlderItems(data.olderItems);
        }
      } finally {
        setLoading(false);
      }
      await fetch('/api/notifications', { method: 'POST' }).catch(() => {});
    }
    init();
  }, []);

  function open(n: NotificationRecord) {
    window.location.href = n.link;
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;
  }

  const empty = newItems.length === 0 && olderItems.length === 0;

  return (
    <div className="space-y-10">
      <p className="text-sm text-[var(--color-ink-muted)]">
        New since you last checked — saved searches, your circle, and house-sitting.
      </p>

      {empty ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Nothing new. You're all caught up.</p>
      ) : (
        <>
          {newItems.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">
                New ({newItems.length})
              </h2>
              <ul className="mt-4 divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-white">
                {newItems.map((n) => <NotificationRow key={n.id} n={n} onOpen={open} />)}
              </ul>
            </section>
          )}

          {olderItems.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">Earlier</h2>
              <ul className="mt-4 divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-white">
                {olderItems.map((n) => <NotificationRow key={n.id} n={n} onOpen={open} />)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
