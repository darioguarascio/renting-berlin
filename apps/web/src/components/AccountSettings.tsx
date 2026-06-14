import { useState } from 'react';
import AccountHandleForm from './AccountHandleForm';
import { authClient } from '../lib/auth-client';
import { signOut } from '../lib/auth-actions';

export default function AccountSettings() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;
  }

  if (!user) {
    return null;
  }

  const initials = user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-4">
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">Your account</h2>
        </div>
        <div className="flex items-center gap-4 px-6 py-5">
          {user.image ? (
            <img src={user.image} alt="" className="size-14 rounded-full object-cover ring-2 ring-[var(--color-border)]" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-deep)] text-lg font-bold text-white">
              {initials}
            </span>
          )}
          <div>
            <p className="font-display text-lg font-bold text-[var(--color-ink)]">{user.name}</p>
            <p className="text-sm text-[var(--color-ink-muted)]">{user.email}</p>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-4">
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">Preferences</h2>
        </div>
        <div className="divide-y divide-[var(--color-border)]">
          <a href="/account/notifications" className="flex items-center justify-between px-6 py-4 transition hover:bg-[var(--color-paper)]">
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">Notifications & contact</p>
              <p className="text-xs text-[var(--color-ink-muted)]">Email alerts, quiet hours, inquiry settings</p>
            </div>
            <span className="text-[var(--color-ink-muted)]">→</span>
          </a>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-4">
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">Public handle</h2>
        </div>
        <div className="px-6 py-5">
          <AccountHandleForm />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-4">
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">Quick links</h2>
        </div>
        <div className="grid gap-px bg-[var(--color-border)] sm:grid-cols-2">
          <a href="/listings/new" className="bg-white px-6 py-4 text-sm font-semibold text-[var(--color-brand-deep)] hover:bg-[var(--color-brand-muted)]">List a place</a>
          <a href="/requests/new" className="bg-white px-6 py-4 text-sm font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]">Post seeker profile</a>
        </div>
      </section>

      <button
        type="button"
        disabled={signingOut}
        onClick={async () => {
          setSigningOut(true);
          await signOut();
        }}
        className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        Sign out
      </button>
    </div>
  );
}
