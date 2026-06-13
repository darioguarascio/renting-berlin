interface Props {
  name: string;
  handle: string;
  image: string | null;
  activeListingCount: number;
}

export default function AccountProfileHeader({ name, handle, image, activeListingCount }: Props) {
  const listingLabel =
    activeListingCount === 1 ? '1 active listing' : `${activeListingCount} active listings`;

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-br from-[var(--color-brand-muted)] to-white p-6 sm:p-8">
        <div className="flex items-start gap-4">
          {image ? (
            <img src={image} alt="" className="size-16 rounded-full object-cover ring-2 ring-white" />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-deep)] text-2xl font-bold text-white">
              {name[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl font-bold text-[var(--color-ink)]">{name}</p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">@{handle}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="badge badge-brand">Landlord</span>
              {activeListingCount > 0 && <span className="badge">{listingLabel}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
