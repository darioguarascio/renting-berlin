import { useEffect, useState } from 'react';
import type { ConnectionUser, InviteRecord } from '../lib/connections';

export default function CirclePage() {
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/connections');
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections);
        setInvites(data.invites);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createInvite() {
    setCreating(true);
    try {
      const res = await fetch('/api/connections/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays: 30 }),
      });
      if (res.ok) {
        const data = await res.json();
        setInvites((prev) => [data.invite, ...prev]);
      }
    } finally {
      setCreating(false);
    }
  }

  async function revokeInvite(id: string) {
    const res = await fetch('/api/connections/invite', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setInvites((prev) => prev.filter((i) => i.id !== id));
  }

  async function copy(invite: InviteRecord) {
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopiedCode(invite.code);
      setTimeout(() => setCopiedCode((c) => (c === invite.code ? null : c)), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  async function removeConnection(connectionId: string) {
    const res = await fetch(`/api/connections/${connectionId}`, { method: 'DELETE' });
    if (res.ok) setConnections((prev) => prev.filter((c) => c.connectionId !== connectionId));
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;
  }

  return (
    <div className="space-y-12">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Invite links</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Share a link with a friend. Anyone who opens it joins your circle — house-sitting stays invisible to everyone else.
            </p>
          </div>
          <button type="button" onClick={createInvite} disabled={creating} className="btn-brand text-sm">
            {creating ? 'Creating…' : 'Create invite link'}
          </button>
        </div>

        {invites.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-paper)] px-6 py-10 text-center">
            <p className="text-sm text-[var(--color-ink-muted)]">No invite links yet. Create one to start your circle.</p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4"
              >
                <div className="min-w-0">
                  <code className="block truncate text-sm font-semibold text-[var(--color-ink)]">{invite.url}</code>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    {invite.usedCount} joined
                    {invite.expiresAt ? ` · expires ${new Date(invite.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => copy(invite)} className="btn-ghost !py-2 text-sm">
                    {copiedCode === invite.code ? 'Copied!' : 'Copy'}
                  </button>
                  <button type="button" onClick={() => revokeInvite(invite.id)} className="btn-ghost !py-2 text-sm text-red-600">
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Your circle</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{connections.length} connected</p>

        {connections.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--color-ink-muted)]">Nobody yet. Send an invite link to get started.</p>
        ) : (
          <ul className="mt-6 divide-y divide-[var(--color-border)] rounded-2xl border border-[var(--color-border)] bg-white">
            {connections.map((c) => (
              <li key={c.connectionId} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  {c.image ? (
                    <img src={c.image} alt="" className="size-10 rounded-full object-cover" />
                  ) : (
                    <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-deep)] text-sm font-bold text-white">
                      {c.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--color-ink)]">{c.name}</p>
                    {c.handle && (
                      <a href={`/u/${c.handle}`} className="text-sm text-[var(--color-brand)] hover:underline">
                        @{c.handle}
                      </a>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => removeConnection(c.connectionId)} className="btn-ghost !py-2 text-sm text-red-600">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
