import { useEffect, useState } from 'react';
import { accountProfileHref, normalizeHandle } from '../lib/urls';

export default function AccountHandleForm({ onSaved }: { onSaved?: () => void }) {
  const [handle, setHandle] = useState('');
  const [initial, setInitial] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/account/handle')
      .then((r) => (r.ok ? r.json() : { handle: null }))
      .then((d: { handle: string | null }) => {
        setHandle(d.handle ?? '');
        setInitial(d.handle);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/account/handle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: normalizeHandle(handle) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: { handle: string } = await res.json();
      setHandle(data.handle);
      setInitial(data.handle);
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save handle');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;
  }

  if (initial) {
    return (
      <div className="space-y-3">
        <div>
          <p className="field-label">Your handle</p>
          <p className="font-display text-xl font-bold text-[var(--color-accent)]">@{initial}</p>
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            Handles are permanent and cannot be changed. Even if your account is deleted, @{initial} will
            never be available to anyone else.
          </p>
          <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
            Public profile:{' '}
            <a href={accountProfileHref(initial)} className="font-semibold text-[var(--color-brand)] hover:underline">
              {accountProfileHref(initial)}
            </a>
          </p>
        </div>
      </div>
    );
  }

  const changed = normalizeHandle(handle) !== '';

  return (
    <form onSubmit={save} className="space-y-3">
      <div>
        <label className="field-label" htmlFor="account-handle">Choose your handle</label>
        <p className="mb-2 text-xs text-[var(--color-ink-muted)]">
          This is permanent — pick carefully. It powers your public profile URL and cannot be changed later.
        </p>
        <div className="flex max-w-sm items-stretch">
          <span className="flex shrink-0 items-center rounded-l-xl border border-r-0 border-[var(--color-border)] bg-[var(--color-paper)] px-3 text-sm font-medium text-[var(--color-ink-muted)]">
            @
          </span>
          <input
            id="account-handle"
            className="field-input min-w-0 flex-1 rounded-l-none"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-z][a-z0-9_]*"
            placeholder="marco_berlin"
            value={handle}
            onChange={(e) => {
              setHandle(normalizeHandle(e.target.value));
              setSaved(false);
            }}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-[var(--color-success)]">Handle saved.</p>}
      <button type="submit" disabled={saving || !changed} className="btn-brand text-sm">
        {saving ? 'Saving…' : 'Set handle permanently'}
      </button>
    </form>
  );
}
