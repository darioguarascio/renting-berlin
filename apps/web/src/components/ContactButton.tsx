import { trackEvent } from '../lib/rybbit';

interface Props {
  listingId: string;
  publisherName: string;
}

export default function ContactButton({ listingId, publisherName }: Props) {
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
