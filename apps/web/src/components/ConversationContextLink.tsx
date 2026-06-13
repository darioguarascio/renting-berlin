import type { MouseEvent } from 'react';

interface ListingContext {
  id: string;
  title: string;
  href: string;
  photoUrl?: string | null;
}

interface SeekerContext {
  id: string;
  title: string;
  href: string;
}

interface Props {
  listing?: ListingContext | null;
  seekerProfile?: SeekerContext | null;
  variant?: 'inline' | 'bar';
  onClick?: (event: MouseEvent) => void;
}

export default function ConversationContextLink({
  listing,
  seekerProfile,
  variant = 'inline',
  onClick,
}: Props) {
  const items = [
    listing
      ? {
          key: `listing-${listing.id}`,
          href: listing.href,
          label: listing.title,
          kind: 'Listing' as const,
          photoUrl: listing.photoUrl,
        }
      : null,
    seekerProfile
      ? {
          key: `seeker-${seekerProfile.id}`,
          href: seekerProfile.href,
          label: seekerProfile.title,
          kind: 'Seeker profile' as const,
          photoUrl: null,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    href: string;
    label: string;
    kind: 'Listing' | 'Seeker profile';
    photoUrl: string | null | undefined;
  }>;

  if (items.length === 0) return null;

  if (variant === 'bar') {
    return (
      <div className="chat-context-bar">
        {items.map((item) => (
          <a
            key={item.key}
            href={item.href}
            className="chat-context-bar__link"
            onClick={onClick}
          >
            {item.photoUrl ? (
              <img src={item.photoUrl} alt="" className="chat-context-bar__thumb" />
            ) : (
              <span className="chat-context-bar__icon" aria-hidden>
                {item.kind === 'Listing' ? '🏠' : '👤'}
              </span>
            )}
            <span className="min-w-0">
              <span className="chat-context-bar__kind">{item.kind}</span>
              <span className="chat-context-bar__title">{item.label}</span>
            </span>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="chat-context-inline">
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          className="chat-context-inline__link"
          onClick={onClick}
          title={item.label}
        >
          <span className="chat-context-inline__kind">{item.kind}</span>
          <span className="truncate">{item.label}</span>
        </a>
      ))}
    </div>
  );
}
