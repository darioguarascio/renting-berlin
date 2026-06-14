import { trackEvent } from '../lib/rybbit';
import { externalProviderLabel } from '../lib/external-listings';

interface Props {
  listingId: string;
  publisherName: string;
  externalUrl?: string | null;
  externalProvider?: string | null;
}

export default function ContactButton({ listingId, publisherName, externalUrl, externalProvider }: Props) {
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

  const href = `/contact/landlord?listing=${encodeURIComponent(listingId)}`;

  return (
    <a
      href={href}
      onClick={() => trackEvent('Contact Started', { context: 'listing' })}
      className="btn-brand mt-6 block w-full text-center"
    >
      {`Contact ${publisherName}`}
    </a>
  );
}
