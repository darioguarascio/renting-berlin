import { useEffect, useState } from 'react';
import ProfileVisitorsList from './ProfileVisitorsList';
import { accountProfileHref } from '../lib/urls';

export default function ProfileViewsPage() {
  const [handle, setHandle] = useState<string | null>(null);
  const [seekerTitle, setSeekerTitle] = useState<string | null>(null);
  const [visitors, setVisitors] = useState<Parameters<typeof ProfileVisitorsList>[0]['visitors']>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/account/profile-views')
      .then((r) => (r.ok ? r.json() : { handle: null, seekerTitle: null, visitors: [] }))
      .then((data) => {
        setHandle(data.handle);
        setSeekerTitle(data.seekerTitle);
        setVisitors(data.visitors);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;
  }

  if (!handle) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-12 text-center">
        <p className="font-display text-lg font-bold text-[var(--color-ink)]">Set your account handle first</p>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Your handle is part of your account — set it in settings, then post a seeker profile to get views.
        </p>
        <a href="/account/settings" className="btn-brand mt-5 inline-flex text-sm">Account settings</a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--color-accent)]">@{handle}</p>
          {seekerTitle && <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{seekerTitle}</p>}
        </div>
        <a href={accountProfileHref(handle)} className="btn-ghost text-sm">View public profile</a>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">Who viewed your profile</h2>
          <span className="rounded-full bg-[var(--color-brand-muted)] px-3 py-1 text-sm font-bold text-[var(--color-brand-deep)]">
            {visitors.length}
          </span>
        </div>
        <ProfileVisitorsList visitors={visitors} />
      </section>
    </div>
  );
}
