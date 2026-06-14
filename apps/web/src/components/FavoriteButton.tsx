import { useEffect, useState } from 'react';
import { authClient } from '../lib/auth-client';
import { trackEvent } from '../lib/rybbit';

interface Props {
  listingId: string;
}

export default function FavoriteButton({ listingId }: Props) {
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (!session) return;
    fetch('/api/favorites')
      .then((r) => (r.ok ? r.json() : { ids: [] }))
      .then((data: { ids: string[] }) => setFavorited(data.ids.includes(listingId)))
      .catch(() => {});
  }, [session, listingId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      window.location.href = '/login';
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/favorites', {
        method: favorited ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      if (res.ok) {
        setFavorited(!favorited);
        trackEvent(favorited ? 'Listing Unfavorited' : 'Listing Favorited', { listing_id: listingId });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
      className="shrink-0 rounded-full p-1.5 text-[var(--color-brand)] transition hover:bg-[var(--color-brand-muted)] hover:text-[var(--color-brand-deep)] disabled:opacity-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.5} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    </button>
  );
}
