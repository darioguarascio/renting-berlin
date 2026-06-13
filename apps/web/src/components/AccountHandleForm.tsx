import { useEffect, useState } from 'react';
import {
  accountProfileHref,
  getHandleValidationError,
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  isValidHandle,
  normalizeHandle,
  sanitizeHandleInput,
} from '../lib/urls';

function HandleRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${ok ? 'text-[var(--color-success)]' : 'text-[var(--color-ink-muted)]'}`}>
      <span
        className={`flex size-4 shrink-0 items-center justify-center rounded-full ${
          ok ? 'bg-[var(--color-success)]/15 text-[var(--color-success)]' : 'bg-[var(--color-paper)] text-[var(--color-ink-muted)]'
        }`}
        aria-hidden
      >
        {ok ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-2.5">
            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
          </svg>
        ) : (
          <span className="size-1.5 rounded-full bg-current opacity-40" />
        )}
      </span>
      {label}
    </li>
  );
}

export default function AccountHandleForm({
  onSaved,
  redirectTo,
  suggestedHandle,
}: {
  onSaved?: () => void;
  redirectTo?: string;
  suggestedHandle?: string;
}) {
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
        setHandle(d.handle ?? suggestedHandle ?? '');
        setInitial(d.handle);
      })
      .finally(() => setLoading(false));
  }, [suggestedHandle]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeHandle(handle);
    const validationError = getHandleValidationError(normalized);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const res = await fetch('/api/account/handle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: normalized }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: { handle: string } = await res.json();
      setHandle(data.handle);
      setInitial(data.handle);
      setSaved(true);
      if (redirectTo) {
        window.location.href = redirectTo;
        return;
      }
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

  const normalized = normalizeHandle(handle);
  const validationError = getHandleValidationError(normalized);
  const canSubmit = isValidHandle(normalized) && !saving;
  const lengthOk = normalized.length >= HANDLE_MIN_LENGTH && normalized.length <= HANDLE_MAX_LENGTH;
  const startsWithLetter = normalized.length === 0 || /^[a-z]/.test(normalized);
  const allowedChars = normalized.length === 0 || /^[a-z0-9_-]+$/.test(normalized);

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <div className="flex items-end justify-between gap-3">
          <label className="field-label" htmlFor="account-handle">
            Choose your handle
          </label>
          <span
            className={`text-xs font-medium tabular-nums ${
              normalized.length > HANDLE_MAX_LENGTH || (normalized.length > 0 && normalized.length < HANDLE_MIN_LENGTH)
                ? 'text-red-600'
                : 'text-[var(--color-ink-muted)]'
            }`}
          >
            {normalized.length}/{HANDLE_MAX_LENGTH}
          </span>
        </div>
        <p className="mb-3 text-xs text-[var(--color-ink-muted)]">
          This is permanent — pick carefully. It powers your public profile URL and cannot be changed later.
        </p>
        <div className="flex max-w-sm items-stretch">
          <span className="flex shrink-0 items-center rounded-l-xl border border-r-0 border-[var(--color-border)] bg-[var(--color-paper)] px-3 text-sm font-medium text-[var(--color-ink-muted)]">
            @
          </span>
          <input
            id="account-handle"
            className="field-input min-w-0 flex-1 rounded-l-none"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            placeholder="marco-berlin"
            value={handle}
            onChange={(e) => {
              setHandle(sanitizeHandleInput(e.target.value));
              setSaved(false);
              setError('');
            }}
            aria-invalid={Boolean(normalized && validationError)}
            aria-describedby="handle-rules handle-preview"
          />
        </div>
        {normalized && (
          <p id="handle-preview" className="mt-2 text-xs text-[var(--color-ink-muted)]">
            Profile URL:{' '}
            <span className="font-medium text-[var(--color-brand-deep)]">{accountProfileHref(normalized)}</span>
          </p>
        )}
      </div>

      <ul id="handle-rules" className="space-y-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-3">
        <HandleRule ok={lengthOk} label={`${HANDLE_MIN_LENGTH}–${HANDLE_MAX_LENGTH} characters`} />
        <HandleRule ok={startsWithLetter} label="Starts with a letter (a–z)" />
        <HandleRule ok={allowedChars} label="Only a–z, 0–9, _ and -" />
      </ul>

      {validationError && normalized && !error && (
        <p className="text-sm text-[var(--color-ink-muted)]">{validationError}</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-[var(--color-success)]">Handle saved.</p>}

      <button type="submit" disabled={!canSubmit} className="btn-brand text-sm disabled:opacity-50">
        {saving ? 'Saving…' : redirectTo ? 'Continue' : 'Set handle permanently'}
      </button>
    </form>
  );
}
