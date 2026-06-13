import { useEffect, useState } from 'react';
import { authClient } from '../lib/auth-client';
import { authEntryUrl } from '../lib/public-routes';
import Logo from './Logo';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface Props {
  initialUser?: User | null;
  favoriteCount?: number;
  unreadCount?: number;
}

export default function Header({ initialUser = null, favoriteCount = 0, unreadCount = 0 }: Props) {
  const { data: session } = authClient.useSession();
  const user = session?.user ?? initialUser;
  const [favorites, setFavorites] = useState(favoriteCount);
  const [unread, setUnread] = useState(unreadCount);

  useEffect(() => {
    if (!user) return;
    fetch('/api/favorites')
      .then((r) => (r.ok ? r.json() : { ids: [] }))
      .then((d: { ids: string[] }) => setFavorites(d.ids.length))
      .catch(() => {});
    fetch('/api/messages/unread')
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d: { count: number }) => setUnread(d.count))
      .catch(() => {});
  }, [user]);

  const initials = user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="/" className="shrink-0 transition opacity-100 hover:opacity-90">
          <Logo size="md" />
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {user ? (
            <>
              <a href="/offers" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-ink-muted)] transition hover:bg-[var(--color-brand-muted)] hover:text-[var(--color-brand-deep)]">
                Offers
              </a>
              <a href="/requests" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-ink-muted)] transition hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]">
                Requests
              </a>
              <a href="/offers?view=map" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-ink-muted)] transition hover:bg-[var(--color-brand-muted)] hover:text-[var(--color-brand-deep)]">
                Map
              </a>
              <a href="/guides" className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-ink-muted)] transition hover:bg-[var(--color-brand-muted)] hover:text-[var(--color-brand-deep)]">
                Guides
              </a>
            </>
          ) : (
            <>
              <a href={authEntryUrl('/offers')} className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-ink-muted)] transition hover:bg-[var(--color-brand-muted)] hover:text-[var(--color-brand-deep)]">
                Offers
              </a>
              <a href={authEntryUrl('/requests')} className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-ink-muted)] transition hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]">
                Requests
              </a>
              <a href={authEntryUrl('/guides')} className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-ink-muted)] transition hover:bg-[var(--color-brand-muted)] hover:text-[var(--color-brand-deep)]">
                Guides
              </a>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <a href="/favorites" className="btn-ghost !px-3 !py-2 relative hidden sm:inline-flex" title="Favorites">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
                {favorites > 0 && <span className="text-xs font-bold text-[var(--color-brand)]">{favorites}</span>}
              </a>
              <a href="/messages" className="btn-ghost !px-3 !py-2 relative hidden sm:inline-flex" title="Messages">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[var(--color-signal)] text-[9px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </a>

              <a
                href="/dashboard"
                className="flex items-center gap-2 rounded-full border-2 border-[var(--color-border)] py-1 pl-1 pr-3 transition hover:border-[var(--color-brand)]"
                title="Dashboard"
              >
                {user.image ? (
                  <img src={user.image} alt="" className="size-8 rounded-full object-cover" />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-deep)] text-xs font-bold text-white">
                    {initials}
                  </span>
                )}
                <span className="hidden max-w-[90px] truncate text-sm font-semibold sm:inline">{user.name.split(' ')[0]}</span>
              </a>
            </>
          ) : (
            <>
              <a href="/login" className="btn-ghost hidden sm:inline-flex">Log in</a>
              <a href={authEntryUrl('/dashboard', 'signup')} className="btn-brand">Sign up free</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
