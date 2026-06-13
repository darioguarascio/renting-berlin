import type { ListingSummary } from '../types/listing';
import { authEntryUrl } from '../lib/public-routes';
import ListingCard from './ListingCard';

interface Props {
  listings: ListingSummary[];
  handle: string;
  isAuthenticated: boolean;
  loginRedirect: string;
}

export default function UserPublicListings({ listings, handle, isAuthenticated, loginRedirect }: Props) {
  if (listings.length === 0) return null;

  if (!isAuthenticated) {
    const signupHref = authEntryUrl(loginRedirect, 'signup');
    const loginHref = authEntryUrl(loginRedirect);

    return (
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-[var(--color-accent)]">
          {listings.length === 1 ? 'Listing' : 'Listings'} by @{handle}
        </h2>
        <div className="card mt-4 p-6 text-center">
          <p className="font-display text-lg font-bold text-[var(--color-ink)]">
            {listings.length} active {listings.length === 1 ? 'listing' : 'listings'}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-ink-muted)]">
            Sign up free to browse photos, details, and contact this landlord.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a href={signupHref} className="btn-brand inline-flex text-sm">
              Sign up free
            </a>
            <a href={loginHref} className="btn-ghost inline-flex text-sm">
              Log in
            </a>
          </div>
        </div>
      </section>
    );
  }

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
