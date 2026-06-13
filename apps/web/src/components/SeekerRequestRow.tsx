import type { TenantRequestFull } from '../types/tenant-request';
import { formatBudget, HOUSEHOLD_LABELS, toPublicProfile } from '../types/tenant-request';
import { CATEGORY_LABELS, NEIGHBORHOOD_LABELS, RENT_TYPE_LABELS } from '../types/listing';
import { seekerProfileHref } from '../lib/urls';
import type { SeekerProfileLockedReason } from '../lib/seeker-profile-access';

interface Props {
  request: TenantRequestFull;
  canViewFull: boolean;
  lockedReason: SeekerProfileLockedReason | null;
}

export default function SeekerRequestRow({ request, canViewFull, lockedReason }: Props) {
  const publicProfile = toPublicProfile(request);
  const primaryArea =
    request.desiredNeighborhoods[0] != null
      ? NEIGHBORHOOD_LABELS[request.desiredNeighborhoods[0] as keyof typeof NEIGHBORHOOD_LABELS] ??
        request.desiredNeighborhoods[0]
      : 'Berlin';

  return (
    <article className="card group transition-all duration-200 hover:border-[var(--color-accent)] hover:shadow-[var(--shadow-card)]">
      <a href={seekerProfileHref(request.handle)} className="flex items-center gap-4 p-4 sm:p-5">
        {canViewFull && (request.photoUrls[0] ?? request.seekerImage) ? (
          <img
            src={request.photoUrls[0] ?? request.seekerImage!}
            alt=""
            className="size-12 shrink-0 rounded-full object-cover ring-2 ring-[var(--color-border)] sm:size-14"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#8b5cf6] text-sm font-bold text-white sm:size-14">
            @
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-[var(--color-accent)] group-hover:text-[var(--color-accent-hover)] sm:text-base">
            @{request.handle}
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {CATEGORY_LABELS[request.category]}
            {' · '}
            {RENT_TYPE_LABELS[request.rentType]}
            {' · '}
            {HOUSEHOLD_LABELS[publicProfile.householdType]}
          </p>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            {primaryArea}
            {publicProfile.areaCount > 1 ? ` +${publicProfile.areaCount - 1}` : ''}
            {!canViewFull && (lockedReason === 'restricted' ? ' · restricted' : lockedReason === 'login' ? ' · log in for details' : '')}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-lg font-extrabold text-[var(--color-brand-deep)] sm:text-xl">
            {formatBudget(publicProfile.budgetMax)}
            <span className="text-xs font-normal text-[var(--color-ink-muted)]">/mo</span>
          </p>
        </div>
      </a>
    </article>
  );
}
