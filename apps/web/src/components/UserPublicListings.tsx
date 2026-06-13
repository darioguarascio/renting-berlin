import type { ListingSummary } from '../types/listing';
import ListingCard from './ListingCard';

interface Props {
  listings: ListingSummary[];
  handle: string;
}

export default function UserPublicListings({ listings, handle }: Props) {
  if (listings.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold text-[var(--color-accent)]">
        {listings.length === 1 ? 'Listing' : 'Listings'} by @{handle}
      </h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}
