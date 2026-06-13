import BerlinSkyline from './BerlinSkyline';

interface Props {
  neighborhood?: string;
}

export default function ListingPhotoPlaceholder({ neighborhood }: Props) {
  return (
    <div className="relative flex size-full flex-col items-center justify-end overflow-hidden bg-gradient-to-b from-[var(--color-brand-muted)] to-[var(--color-brand-light)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgb(107_78_255/0.12),transparent_60%)]" />
      <div className="absolute inset-x-0 bottom-0">
        <BerlinSkyline variant="card" />
      </div>
      <div className="relative z-10 mb-8 flex flex-col items-center gap-1 px-4 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-8 text-[var(--color-brand)] opacity-60">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-brand-deep)]">Berlin</span>
        {neighborhood && (
          <span className="text-sm font-semibold capitalize text-[var(--color-ink-muted)]">{neighborhood.replace(/-/g, ' ')}</span>
        )}
      </div>
    </div>
  );
}
