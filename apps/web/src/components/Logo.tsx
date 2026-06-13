interface Props {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  variant?: 'default' | 'light';
}

const sizes = {
  sm: { icon: 28, word: 'text-lg', gap: 'gap-2' },
  md: { icon: 34, word: 'text-xl', gap: 'gap-2.5' },
  lg: { icon: 42, word: 'text-2xl', gap: 'gap-3' },
};

export default function Logo({ size = 'md', showTagline = false, variant = 'default' }: Props) {
  const s = sizes[size];
  const light = variant === 'light';

  return (
    <div className={`flex items-center ${s.gap}`}>
      <svg width={s.icon} height={s.icon} viewBox="0 0 40 40" fill="none" aria-hidden>
        <rect width="40" height="40" rx="11" fill="url(#logo-grad)" />
        <path
          d="M11 28V12h5.2c3.4 0 5.6 1.8 5.6 4.6 0 2-1.1 3.4-2.8 4l3.4 7.4h-3.4l-3-6.8H14.4V28H11zm3.4-9.6h1.6c1.6 0 2.5-.8 2.5-2s-.9-2-2.5-2h-1.6v4z"
          fill="white"
        />
        <defs>
          <linearGradient id="logo-grad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2679a3" />
            <stop offset="1" stopColor="#006699" />
          </linearGradient>
        </defs>
      </svg>
      <div className="leading-none">
        <span className={`font-display font-extrabold tracking-tight ${light ? 'text-white' : 'text-[var(--color-ink)]'} ${s.word}`}>
          renting<span className={light ? 'text-[var(--color-brand-light)]' : 'text-[var(--color-brand)]'}>.</span>
          <span className={light ? 'logo-berlin-text-light' : 'logo-berlin-text'}>berlin</span>
        </span>
        {showTagline && (
          <p className={`mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${light ? 'text-white/50' : 'text-[var(--color-ink-muted)]'}`}>
            Berlin rentals
          </p>
        )}
      </div>
    </div>
  );
}
