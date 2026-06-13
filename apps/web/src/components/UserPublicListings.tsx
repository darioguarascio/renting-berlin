import type { ListingSummary } from '../types/listing';
import type { ListingLockedReason } from '../lib/listing-access';
import ListingCard from './ListingCard';

interface DisplayRow {
  listing: ListingSummary;
  canViewFull: boolean;
  lockedReason: ListingLockedReason | null;
}

interface Props {
  rows: DisplayRow[];
  handle: string;
}

export default function UserPublicListings({ rows, handle }: Props) {
  if (rows.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold text-[var(--color-accent)]">
        {rows.length === 1 ? 'Listing' : 'Listings'} by @{handle}
      </h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {rows.map((row) => (
          <ListingCard
            key={row.listing.id}
            listing={row.listing}
            canViewFull={row.canViewFull}
            lockedReason={row.lockedReason}
          />
        ))}
      </div>
    </section>
  );
}
