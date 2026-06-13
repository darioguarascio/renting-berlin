import type { TenantRequestFull } from '../types/tenant-request';
import type { SeekerProfileLockedReason } from '../lib/seeker-profile-access';
import { formatBudget, HOUSEHOLD_LABELS, toPublicProfile } from '../types/tenant-request';
import { CATEGORY_LABELS, NEIGHBORHOOD_LABELS, RENT_TYPE_LABELS } from '../types/listing';
import { seekerProfileHref } from '../lib/urls';

interface Props {
  request: TenantRequestFull;
  canViewFull: boolean;
  lockedReason: SeekerProfileLockedReason | null;
}

export default function SeekerRequestCard({ request, canViewFull, lockedReason }: Props) {
  const publicProfile = toPublicProfile(request);
  const primaryArea =
    request.desiredNeighborhoods[0] != null
      ? NEIGHBORHOOD_LABELS[request.desiredNeighborhoods[0] as keyof typeof NEIGHBORHOOD_LABELS] ??
        request.desiredNeighborhoods[0]
      : 'Berlin';

  return (
    <article className="card group transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-float)]">
      <a href={seekerProfileHref(request.handle)} className="flex items-center gap-3 p-4">
        {canViewFull && (request.photoUrls[0] ?? request.seekerImage) ? (
          <img
            src={request.photoUrls[0] ?? request.seekerImage!}
            alt=""
            className="size-11 shrink-0 rounded-full object-cover ring-2 ring-[var(--color-border)]"
          />
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#8b5cf6] text-sm font-bold text-white">
            @
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold text-[var(--color-accent)] group-hover:text-[var(--color-accent-hover)]">
            @{request.handle}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--color-ink)]">
            {formatBudget(publicProfile.budgetMax)}
            <span className="font-normal text-[var(--color-ink-muted)]">/mo</span>
          </p>
          <p className="mt-1 truncate text-xs text-[var(--color-ink-muted)]">
            {CATEGORY_LABELS[request.category]}
            {' · '}
            {RENT_TYPE_LABELS[request.rentType]}
            {' · '}
            {HOUSEHOLD_LABELS[publicProfile.householdType]}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--color-ink-muted)]">
            {primaryArea}
            {publicProfile.areaCount > 1 ? ` +${publicProfile.areaCount - 1}` : ''}
            {!canViewFull && (lockedReason === 'restricted' ? ' · restricted' : lockedReason === 'login' ? ' · log in for details' : '')}
          </p>
        </div>
      </a>
    </article>
  );
}
