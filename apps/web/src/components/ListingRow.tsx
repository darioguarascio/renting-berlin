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

export default function ListingRow({ listing }: Props) {
  const neighborhoodLabel =
    NEIGHBORHOOD_LABELS[listing.neighborhood as keyof typeof NEIGHBORHOOD_LABELS] ??
    listing.neighborhood;

  return (
    <article className="card group overflow-hidden transition-all duration-200 hover:border-[var(--color-brand)] hover:shadow-[var(--shadow-card)]">
      <a href={`/listings/${listing.path}`} className="flex flex-col sm:flex-row">
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-[var(--color-brand-muted)] sm:aspect-auto sm:h-36 sm:w-44">
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
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold leading-snug text-[var(--color-ink)] group-hover:text-[var(--color-brand-deep)] sm:text-lg">
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
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="badge badge-brand">{CATEGORY_LABELS[listing.category]}</span>
              <span className="badge badge-accent">{RENT_TYPE_LABELS[listing.rentType]}</span>
              {listing.anmeldungAvailable && <span className="badge badge-success">Anmeldung</span>}
              {!listing.schufaRequired && <span className="badge badge-brand">No SCHUFA</span>}
              {listing.onlineViewingAvailable && <span className="badge badge-accent">Online viewing</span>}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--color-border)] pt-3 sm:flex-col sm:items-end sm:justify-center sm:border-0 sm:pt-0">
            <p className="font-display text-xl font-extrabold text-[var(--color-brand-deep)]">
              {formatPrice(listing.rentPerMonth)}
              <span className="text-xs font-normal text-[var(--color-ink-muted)]">/mo</span>
            </p>
            <div className="rounded-full bg-[var(--color-paper)] p-1" onClick={(e) => e.preventDefault()}>
              <FavoriteButton listingId={listing.id} />
            </div>
          </div>
        </div>
      </a>
    </article>
  );
}
