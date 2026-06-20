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
      <svg width={s.icon} height={s.icon} viewBox="0 0 32 32" fill="none" aria-hidden>
        <defs>
          <linearGradient id="logo-door-grad" x1="13" y1="20" x2="13" y2="27" gradientUnits="userSpaceOnUse">
            <stop stopColor="#dd4477" />
            <stop offset="100%" stopColor="#c42d63" />
          </linearGradient>
        </defs>
        <path
          d="M7 27.2V16H3.5L16 4.5 28.5 16H25v11.2q0 .8-.8.8H7.8q-.8 0-.8-.8Z"
          fill="#2679a3"
        />
        <rect x="13" y="20" width="6" height="7.5" rx="1" fill="url(#logo-door-grad)" />
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
