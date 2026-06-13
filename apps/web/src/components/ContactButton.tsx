interface Props {
  listingId: string;
  publisherName: string;
}

export default function ContactButton({ listingId, publisherName }: Props) {
  const href = `/contact/landlord?listing=${encodeURIComponent(listingId)}`;

  return (
    <a href={href} className="btn-brand mt-6 block w-full text-center">
      {`Contact ${publisherName}`}
    </a>
  );
}
