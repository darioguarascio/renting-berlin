import type { NeighborhoodListingStats } from '../lib/neighborhood-stats';
import {
  CATEGORY_LABELS,
  formatStatPercent,
  RENT_TYPE_LABELS,
} from '../lib/neighborhood-stats';
import { authEntryUrl } from '../lib/public-routes';
import { BERLIN_NEIGHBORHOODS, NEIGHBORHOOD_LABELS, type BerlinNeighborhood } from '../types/listing';

interface Props {
  neighborhood: string;
  label: string;
  stats: NeighborhoodListingStats;
}

function formatEuro(value: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="card p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand)]">{label}</p>
      <p className="mt-2 font-display text-2xl font-extrabold text-[var(--color-ink)]">{value}</p>
      {hint && <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{hint}</p>}
    </article>
  );
}

export default function NeighborhoodRentPage({ neighborhood, label, stats }: Props) {
  const browseTarget = `/offers?neighborhood=${neighborhood}`;
  const offersHref = authEntryUrl(browseTarget, 'signup');
  const loginHref = authEntryUrl(browseTarget);
  const otherNeighborhoods = BERLIN_NEIGHBORHOODS.filter((slug) => slug !== neighborhood).slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active listings"
          value={String(stats.totalListings)}
          hint={stats.totalListings === 0 ? 'Check back soon' : 'Updated from live marketplace data'}
        />
        <StatCard
          label="Median rent"
          value={formatEuro(stats.rent.median)}
          hint={
            stats.rent.min != null && stats.rent.max != null
              ? `${formatEuro(stats.rent.min)} – ${formatEuro(stats.rent.max)}`
              : undefined
          }
        />
        <StatCard
          label="Average size"
          value={stats.size.averageSqm != null ? `${stats.size.averageSqm} m²` : '—'}
          hint={
            stats.size.averageRooms != null
              ? `~${stats.size.averageRooms} rooms on average`
              : undefined
          }
        />
        <StatCard
          label="Anmeldung available"
          value={formatStatPercent(stats.anmeldungAvailableCount, stats.totalListings)}
          hint={`${formatStatPercent(stats.noSchufaCount, stats.totalListings)} without SCHUFA requirement`}
        />
      </div>

      {stats.totalListings > 0 && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="card p-6">
            <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">By property type</h2>
            <dl className="mt-4 space-y-3">
              {(Object.entries(stats.byCategory) as Array<[keyof typeof CATEGORY_LABELS, number]>)
                .filter(([, count]) => count > 0)
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-[var(--color-ink-muted)]">{CATEGORY_LABELS[category]}</dt>
                    <dd className="font-semibold text-[var(--color-ink)]">
                      {count}
                      <span className="ml-2 font-normal text-[var(--color-ink-muted)]">
                        ({formatStatPercent(count, stats.totalListings)})
                      </span>
                    </dd>
                  </div>
                ))}
            </dl>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">By rent duration</h2>
            <dl className="mt-4 space-y-3">
              {(Object.entries(stats.byRentType) as Array<[keyof typeof RENT_TYPE_LABELS, number]>)
                .filter(([, count]) => count > 0)
                .map(([rentType, count]) => (
                  <div key={rentType} className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-[var(--color-ink-muted)]">{RENT_TYPE_LABELS[rentType]}</dt>
                    <dd className="font-semibold text-[var(--color-ink)]">
                      {count}
                      <span className="ml-2 font-normal text-[var(--color-ink-muted)]">
                        ({formatStatPercent(count, stats.totalListings)})
                      </span>
                    </dd>
                  </div>
                ))}
            </dl>
            {stats.onlineViewingCount > 0 && (
              <p className="mt-5 text-sm text-[var(--color-ink-muted)]">
                {formatStatPercent(stats.onlineViewingCount, stats.totalListings)} offer online viewings.
              </p>
            )}
          </section>
        </div>
      )}

      <section className="mt-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-brand-muted)] to-white p-8 sm:p-10">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand-deep)]">Members only</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-[var(--color-ink)] sm:text-3xl">
            Browse live listings in {label}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-muted)]">
            Individual apartments and rooms — with photos, maps, and direct landlord contact — are available to
            registered members. This page shows aggregated market data only.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={offersHref} className="btn-brand text-sm">
              Sign up free to browse
            </a>
            <a href={loginHref} className="btn-ghost text-sm">
              Log in
            </a>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-bold text-[var(--color-ink)]">Other Berlin neighborhoods</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {otherNeighborhoods.map((slug) => (
            <a
              key={slug}
              href={`/rent-in/${slug}`}
              className="neighborhood-tile"
            >
              <span>{NEIGHBORHOOD_LABELS[slug as BerlinNeighborhood]}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-3.5 shrink-0 text-[var(--color-ink-muted)]">
                <path strokeLinecap="round" strokeLinejoin="round" d="m5.75 12.5 4.5-4.5-4.5-4.5" />
              </svg>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
