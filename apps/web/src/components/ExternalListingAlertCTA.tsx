import SaveSearchButton from './SaveSearchButton';
import { authEntryUrl } from '../lib/public-routes';
import { buildSearchUrl } from '../lib/search-url';
import type { BerlinNeighborhood, ListingCategory, RentType } from '../types/listing';

interface Props {
  neighborhood: BerlinNeighborhood;
  category: ListingCategory;
  rentType: RentType;
  rentPerMonth: number;
  anmeldungAvailable: boolean;
  isAuthenticated: boolean;
}

export default function ExternalListingAlertCTA({
  neighborhood,
  category,
  rentType,
  rentPerMonth,
  anmeldungAvailable,
  isAuthenticated,
}: Props) {
  const filters: Record<string, unknown> = {
    neighborhood,
    category,
    rentType,
    maxPrice: Math.ceil(rentPerMonth * 1.15),
    ...(anmeldungAvailable ? { anmeldungAvailable: true } : {}),
  };
  const searchUrl = buildSearchUrl('listings', filters);

  return (
    <div className="mb-6 rounded-xl border border-[var(--color-accent)]/30 bg-gradient-to-br from-[var(--color-accent-soft)] to-white p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">
        Native listings on renting.berlin
      </p>
      <h2 className="mt-1 font-display text-lg font-bold text-[var(--color-ink)]">
        Get alerted when similar flats are posted here
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
        This listing is on an external site. Save a matching search and we&apos;ll notify you when
        landlords post directly on renting.berlin — with messaging and verified reviews.
      </p>
      <div className="mt-4">
        <SaveSearchButton
          type="listings"
          filters={filters}
          isAuthenticated={isAuthenticated}
          loginRedirect={isAuthenticated ? searchUrl : authEntryUrl(searchUrl, 'signup')}
        />
      </div>
      {!isAuthenticated && (
        <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
          Free account · email alerts when new matches appear
        </p>
      )}
    </div>
  );
}
