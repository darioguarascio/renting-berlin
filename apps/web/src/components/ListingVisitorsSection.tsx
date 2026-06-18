import type { ProfileVisitor } from '../types/tenant-request';
import { accountProfileHref } from '../lib/urls';

interface Props {
  visitors: ProfileVisitor[];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ListingVisitorsSection({ visitors }: Props) {
  if (visitors.length === 0) {
    return (
      <section className="listing-visitors">
        <h2 className="listing-visitors__title">
          Who viewed this listing
          <span className="listing-visitors__count">0</span>
        </h2>
        <p className="text-sm text-[var(--color-ink-muted)]">
          No views yet — this appears once logged-in users visit your listing.
        </p>
      </section>
    );
  }

  return (
    <section className="listing-visitors">
      <h2 className="listing-visitors__title">
        Who viewed this listing
        <span className="listing-visitors__count">{visitors.length}</span>
      </h2>

      <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
        {visitors.map((v) => (
          <li key={v.viewerId} className="flex items-center gap-3 px-4 py-3">
            {v.viewerImage ? (
              <img
                src={v.viewerImage}
                alt=""
                className="size-10 shrink-0 rounded-full object-cover ring-2 ring-[var(--color-border)]"
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-muted)] text-sm font-bold text-[var(--color-brand-deep)]">
                {(v.viewerName ?? '?').charAt(0)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{v.viewerName}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Last visited {timeAgo(v.lastViewedAt)}
                {v.firstViewedAt !== v.lastViewedAt && (
                  <> · first {timeAgo(v.firstViewedAt)}</>
                )}
              </p>
            </div>

            {v.viewerHandle && (
              <a
                href={accountProfileHref(v.viewerHandle)}
                className="shrink-0 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-ink)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] transition-colors"
              >
                View profile
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
