import { useEffect, useState } from 'react';
import type { SavedSearchType } from '../lib/saved-searches';

interface Props {
  type: SavedSearchType;
  filters: Record<string, unknown>;
  isAuthenticated: boolean;
  loginRedirect: string;
}

export default function SaveSearchButton({ type, filters, isAuthenticated, loginRedirect }: Props) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'exists' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status !== 'saved' && status !== 'exists') return;
    const t = setTimeout(() => setStatus('idle'), 4000);
    return () => clearTimeout(t);
  }, [status]);

  async function handleSave() {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=${encodeURIComponent(loginRedirect)}`;
      return;
    }

    setStatus('saving');
    setMessage('');
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, filters }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: { created: boolean } = await res.json();
      setStatus(data.created ? 'saved' : 'exists');
      setMessage(data.created ? 'Search saved — we\'ll notify you of new matches.' : 'You already saved this search.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Could not save search');
    }
  }

  const label =
    status === 'saving' ? 'Saving…' :
    status === 'saved' ? 'Saved!' :
    status === 'exists' ? 'Already saved' :
    'Save this search';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleSave}
        disabled={status === 'saving'}
        className={`inline-flex items-center gap-2 text-sm font-semibold transition ${
          status === 'saved' || status === 'exists'
            ? 'text-[var(--color-brand-deep)]'
            : 'btn-ghost !py-2'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
          {status === 'saved' || status === 'exists' ? (
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
          ) : (
            <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v13A1.5 1.5 0 0 0 3.5 18h13a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 16.5 2h-13Zm4.25 6.25a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1-.75-.75Z" />
          )}
        </svg>
        {label}
      </button>
      {(message || status === 'error') && (
        <span className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-[var(--color-ink-muted)]'}`}>
          {message}
        </span>
      )}
      {isAuthenticated && (
        <a href="/saved-searches" className="text-sm font-medium text-[var(--color-brand)] hover:underline">
          My saved searches
        </a>
      )}
    </div>
  );
}
