import type { ProfileVisitor } from '../types/tenant-request';

interface Props {
  visitors: ProfileVisitor[];
  emptyMessage?: string;
}

export default function ProfileVisitorsList({
  visitors,
  emptyMessage = 'No profile views yet. Views appear when logged-in landlords browse your seeker profile.',
}: Props) {
  if (visitors.length === 0) {
    return <p className="text-sm text-[var(--color-ink-muted)]">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-white">
      {visitors.map((v) => (
        <li key={v.viewerId} className="flex items-center gap-3 px-4 py-3">
          {v.viewerImage ? (
            <img src={v.viewerImage} alt="" className="size-11 rounded-full object-cover ring-2 ring-[var(--color-border)]" />
          ) : (
            <div className="flex size-11 items-center justify-center rounded-full bg-[var(--color-brand-muted)] text-sm font-bold text-[var(--color-brand-deep)]">
              {v.viewerName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
              {v.viewerHandle ? `@${v.viewerHandle}` : v.viewerName}
            </p>
            {v.viewerHandle && (
              <p className="truncate text-xs text-[var(--color-ink-muted)]">{v.viewerName}</p>
            )}
            <p className="text-xs text-[var(--color-ink-muted)]">
              Viewed {new Date(v.firstViewedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              {v.firstViewedAt !== v.lastViewedAt && (
                <> · last {new Date(v.lastViewedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</>
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
