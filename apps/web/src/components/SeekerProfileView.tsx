import type { ReactNode } from 'react';
import type { ProfileVisitor, TenantRequestFull } from '../types/tenant-request';
import type { SeekerProfileLockedReason } from '../lib/seeker-profile-access';
import {
  formatBudget,
  formatIncome,
  formatLanguageList,
  formatNationality,
  formatNeighborhoodList,
  HOUSEHOLD_LABELS,
  toPublicProfile,
} from '../types/tenant-request';
import { CATEGORY_LABELS, RENT_TYPE_LABELS } from '../types/listing';
import ProfileVisitorsList from './ProfileVisitorsList';
import ShareButton from './ShareButton';

interface Props {
  profile: TenantRequestFull;
  canViewFull: boolean;
  lockedReason: SeekerProfileLockedReason | null;
  isOwner: boolean;
  loginRedirect: string;
  shareUrl: string;
  visitors?: ProfileVisitor[];
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="field-label">{label}</p>
      <p className="font-medium text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function LockedSection({
  loginRedirect,
  lockedReason,
}: {
  loginRedirect: string;
  lockedReason: SeekerProfileLockedReason;
}) {
  const isLandlordsOnly = lockedReason === 'landlords';

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] p-8 text-center">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white" />
      <div className="relative">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--color-brand-muted)] text-[var(--color-brand)]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="font-display text-lg font-bold text-[var(--color-ink)]">
          {isLandlordsOnly ? 'Full profile for landlords only' : 'Full profile for members only'}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-ink-muted)]">
          {isLandlordsOnly
            ? 'Post at least one listing to see income, photos, occupation, languages, and contact this seeker.'
            : 'Log in to see income, photos, occupation, languages, and contact this seeker.'}
        </p>
        {isLandlordsOnly ? (
          <a href="/offers/new" className="btn-brand mt-5 inline-flex text-sm">
            Post a listing to unlock
          </a>
        ) : (
          <a href={`/login?redirect=${encodeURIComponent(loginRedirect)}`} className="btn-brand mt-5 inline-flex text-sm">
            Log in to unlock
          </a>
        )}
      </div>
    </div>
  );
}

function VisitorsPanel({ visitors }: { visitors: ProfileVisitor[] }) {
  return <ProfileVisitorsList visitors={visitors} />;
}

export default function SeekerProfileView({ profile, canViewFull, lockedReason, isOwner, loginRedirect, shareUrl, visitors = [] }: Props) {
  const publicProfile = toPublicProfile(profile);
  const availableFrom = new Date(profile.availableFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const primaryPhoto = profile.photoUrls[0] ?? profile.seekerImage;

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-br from-[var(--color-accent-soft)] to-white p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            {canViewFull && primaryPhoto ? (
              <img src={primaryPhoto} alt="" className="size-16 rounded-full object-cover ring-2 ring-white" />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[#8b5cf6] text-2xl font-bold text-white">
                ?
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5">
                <span className="badge badge-accent">{CATEGORY_LABELS[profile.category]}</span>
                <span className="badge badge-brand">{RENT_TYPE_LABELS[profile.rentType]}</span>
                <span className="badge">{HOUSEHOLD_LABELS[publicProfile.householdType]}</span>
                {publicProfile.isStudent && <span className="badge">Student</span>}
              </div>
              <p className="mt-2 font-display text-lg font-bold text-[var(--color-accent)]">@{profile.handle}</p>
              <h1 className="mt-1 font-display text-2xl font-extrabold text-[var(--color-ink)] sm:text-3xl">{profile.title}</h1>
              {canViewFull ? (
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">by {profile.seekerName}</p>
              ) : (
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  Berlin seeker · {lockedReason === 'landlords' ? 'landlords only' : 'log in for details'}
                </p>
              )}
            </div>
          </div>
          <ShareButton
            url={shareUrl}
            title={profile.title}
            text={`Seeker profile @${profile.handle} on renting.berlin`}
          />
        </div>
      </div>

      <div className="grid gap-6 border-t border-[var(--color-border)] p-6 sm:grid-cols-2 sm:p-8">
        <DetailRow label="Budget" value={<span className="font-display text-xl font-bold text-[var(--color-brand-deep)]">{formatBudget(publicProfile.budgetMax)}/mo</span>} />
        <DetailRow label="Available from" value={availableFrom} />
        <DetailRow
          label="Areas"
          value={canViewFull ? formatNeighborhoodList(profile.desiredNeighborhoods) : `${publicProfile.areaCount} neighborhood${publicProfile.areaCount === 1 ? '' : 's'}`}
        />
        <div>
          <p className="field-label">Key requirements</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {publicProfile.anmeldungNeeded && <span className="chip !py-0.5 !text-[10px]">Needs Anmeldung</span>}
            {publicProfile.hasSchufa && <span className="chip !py-0.5 !text-[10px]">Has SCHUFA</span>}
          </div>
        </div>
      </div>

      {canViewFull ? (
        <>
          {profile.photoUrls.length > 1 && (
            <div className="border-t border-[var(--color-border)] p-6 sm:p-8">
              <p className="field-label">Photos</p>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {profile.photoUrls.map((url) => (
                  <img key={url} src={url} alt="" className="aspect-square rounded-lg object-cover" />
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-6 border-t border-[var(--color-border)] p-6 sm:grid-cols-2 sm:p-8">
            {profile.birthYear && <DetailRow label="Year of birth" value={profile.birthYear} />}
            {profile.nationality && <DetailRow label="Nationality" value={formatNationality(profile.nationality)} />}
            {profile.occupation && <DetailRow label="Occupation" value={profile.occupation} />}
            {profile.monthlyIncome && <DetailRow label="Monthly income" value={formatIncome(profile.monthlyIncome)} />}
            <DetailRow label="Languages" value={formatLanguageList(profile.spokenLanguages)} />
            <DetailRow label="Pets" value={profile.hasPets ? 'Has pets' : 'No pets'} />
            <DetailRow label="Smoking" value={profile.isSmoker ? 'Smoker' : 'Non-smoker'} />
            <DetailRow label="Bed linens & towels" value={profile.needsBedLinens ? 'Needed' : 'Not needed'} />
            {(profile.roomsMin || profile.sizeMin) && (
              <DetailRow
                label="Space requirements"
                value={[profile.roomsMin ? `${profile.roomsMin}+ rooms` : null, profile.sizeMin ? `${profile.sizeMin}+ m²` : null].filter(Boolean).join(' · ')}
              />
            )}
          </div>

          <div className="border-t border-[var(--color-border)] p-6 sm:p-8">
            <p className="field-label">About</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink-muted)]">{profile.description}</p>
          </div>

          {isOwner && (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-paper)] p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="field-label">Profile views</p>
                  <p className="text-sm text-[var(--color-ink-muted)]">Who viewed your seeker profile</p>
                </div>
                <span className="rounded-full bg-[var(--color-brand-muted)] px-3 py-1 text-sm font-bold text-[var(--color-brand-deep)]">
                  {visitors.length}
                </span>
              </div>
              <div className="mt-4">
                <VisitorsPanel visitors={visitors} />
              </div>
            </div>
          )}

          {!isOwner && (
            <div className="border-t border-[var(--color-border)] bg-[var(--color-paper)] p-6 sm:p-8">
              <p className="text-sm text-[var(--color-ink-muted)]">
                Have a place that matches this profile? Send a short introduction.
              </p>
              <a
                href={`/contact/seeker?handle=${encodeURIComponent(profile.handle)}`}
                className="btn-brand mt-4 inline-flex text-sm"
              >
                Contact @{profile.handle}
              </a>
            </div>
          )}
        </>
      ) : lockedReason ? (
        <div className="border-t border-[var(--color-border)] p-6 sm:p-8">
          <LockedSection loginRedirect={loginRedirect} lockedReason={lockedReason} />
        </div>
      ) : null}
    </div>
  );
}
