import type { ListingSummary } from '../types/listing';
import { CATEGORY_LABELS, RENT_TYPE_LABELS, NEIGHBORHOOD_LABELS } from '../types/listing';
import FavoriteButton from './FavoriteButton';
import ListingPhotoPlaceholder from './ListingPhotoPlaceholder';

interface Props {
  listing: ListingSummary;
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export default function ListingCard({ listing }: Props) {
  const neighborhoodLabel =
    NEIGHBORHOOD_LABELS[listing.neighborhood as keyof typeof NEIGHBORHOOD_LABELS] ??
    listing.neighborhood;

  return (
    <article className="card group overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-brand)] hover:shadow-[var(--shadow-float)]">
      <a href={`/listings/${listing.path}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-brand-muted)]">
          {listing.primaryPhotoUrl ? (
            <img
              src={listing.primaryPhotoUrl}
              alt={listing.title}
              className="size-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <ListingPhotoPlaceholder neighborhood={listing.neighborhood} />
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-end p-3">
            <div className="rounded-full bg-white/95 p-1 shadow-sm backdrop-blur" onClick={(e) => e.preventDefault()}>
              <FavoriteButton listingId={listing.id} />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--color-ink)]/80 via-[var(--color-ink)]/30 to-transparent" />
          <div className="absolute bottom-3 left-3">
            <span className="font-display text-xl font-extrabold text-white drop-shadow">
              {formatPrice(listing.rentPerMonth)}
              <span className="text-xs font-normal text-white/75">/mo</span>
            </span>
          </div>
        </div>
        <div className="p-4 pb-5">
          <h3 className="font-display text-base font-bold leading-snug text-[var(--color-ink)] group-hover:text-[var(--color-brand-deep)]">
            {listing.title}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 shrink-0 text-[var(--color-brand)]">
              <path fillRule="evenodd" d="m8 14.5 5.5-5A5 5 0 1 0 2.5 9.5l5.5 5Z" clipRule="evenodd" />
            </svg>
            {neighborhoodLabel}
            <span className="text-[var(--color-border)]">·</span>
            {listing.sizeSqm} m² · {listing.rooms} {listing.rooms === 1 ? 'room' : 'rooms'}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="badge badge-brand">{CATEGORY_LABELS[listing.category]}</span>
            <span className="badge badge-accent">{RENT_TYPE_LABELS[listing.rentType]}</span>
            {listing.anmeldungAvailable && <span className="badge badge-success">Anmeldung</span>}
            {!listing.schufaRequired && <span className="badge badge-brand">No SCHUFA</span>}
            {listing.onlineViewingAvailable && <span className="badge badge-accent">Online viewing</span>}
          </div>
        </div>
      </a>
    </article>
  );
}
