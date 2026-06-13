interface Props {
  loginRedirect: string;
  compact?: boolean;
}

export default function ListingLockedSection({ loginRedirect, compact = false }: Props) {
  const loginHref = `/login?redirect=${encodeURIComponent(loginRedirect)}`;
  const signupHref = `/signup?redirect=${encodeURIComponent(loginRedirect)}`;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)] text-center ${
        compact ? 'p-6' : 'p-8'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white" />
      <div className="relative">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--color-brand-muted)] text-[var(--color-brand)]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
            <path
              fillRule="evenodd"
              d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className={`font-display font-bold text-[var(--color-ink)] ${compact ? 'text-base' : 'text-lg'}`}>
          Full listing for members only
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-ink-muted)]">
          Sign up free to see photos, descriptions, map location, and contact the landlord.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <a href={signupHref} className="btn-brand inline-flex text-sm">
            Sign up free
          </a>
          <a href={loginHref} className="btn-ghost inline-flex text-sm">
            Log in
          </a>
        </div>
      </div>
    </div>
  );
}
