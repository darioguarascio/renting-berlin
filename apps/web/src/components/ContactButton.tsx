import { trackEvent } from '../lib/rybbit';
import { externalProviderLabel } from '../lib/external-listings';
import { authEntryUrl } from '../lib/public-routes';

interface Props {
  listingId: string;
  publisherName: string;
  hidePublisherName?: boolean;
  sourceType?: 'native' | 'external';
  externalUrl?: string | null;
  externalProvider?: string | null;
  isAuthenticated?: boolean;
  loginRedirect?: string;
}

export default function ContactButton({
  listingId,
  publisherName,
  hidePublisherName = false,
  sourceType = 'native',
  externalUrl,
  externalProvider,
  isAuthenticated = true,
  loginRedirect,
}: Props) {
  if (sourceType === 'external') {
    if (externalUrl) {
      const label = externalProviderLabel(externalProvider);
      return (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('External Listing Opened', { provider: externalProvider ?? 'unknown' })}
          className="btn-brand mt-6 block w-full text-center"
        >
          {`View on ${label}`}
        </a>
      );
    }

    return (
      <p className="mt-6 text-center text-sm text-[var(--color-ink-muted)]">
        Apply on the original listing — in-app messaging is not available here.
      </p>
    );
  }

  const contactPath = `/contact/landlord?listing=${encodeURIComponent(listingId)}`;
  const href = isAuthenticated
    ? contactPath
    : authEntryUrl(loginRedirect ?? contactPath, 'signup');

  return (
    <a
      href={href}
      onClick={() => trackEvent('Contact Started', { context: 'listing' })}
      className="btn-brand mt-6 block w-full text-center"
    >
      {isAuthenticated ? `Contact ${hidePublisherName ? 'landlord' : publisherName}` : 'Sign up to contact'}
    </a>
  );
}
