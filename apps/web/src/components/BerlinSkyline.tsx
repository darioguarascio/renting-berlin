interface Props {
  variant?: 'hero' | 'card' | 'minimal';
  className?: string;
}

export default function BerlinSkyline({ variant = 'hero', className = '' }: Props) {
  const isHero = variant === 'hero';
  const isCard = variant === 'card';

  return (
    <svg
      viewBox="0 0 1200 280"
      preserveAspectRatio="xMidYMax slice"
      className={`${isHero ? 'skyline-drift w-full' : 'w-full'} ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(38 121 163 / 0)" />
          <stop offset="100%" stopColor={isCard ? 'rgb(38 121 163 / 0.35)' : 'rgb(38 121 163 / 0.55)'} />
        </linearGradient>
        <linearGradient id="bldg-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isCard ? '#2679a3' : '#2679a3'} />
          <stop offset="100%" stopColor={isCard ? '#006699' : '#0f1a2e'} />
        </linearGradient>
        <radialGradient id="tower-ball" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6b4eff" />
          <stop offset="100%" stopColor="#2679a3" />
        </radialGradient>
      </defs>

      {isHero && <rect width="1200" height="280" fill="url(#sky-grad)" />}

      {/* Buildings left cluster */}
      <g fill="url(#bldg-grad)" opacity={isCard ? 0.9 : 0.85}>
        <rect x="40" y="160" width="55" height="120" rx="2" />
        <rect x="105" y="130" width="42" height="150" rx="2" />
        <rect x="155" y="175" width="38" height="105" rx="2" />
        <rect x="200" y="110" width="50" height="170" rx="2" />
        <rect x="260" y="145" width="44" height="135" rx="2" />
        {/* Oberbaum-style twin towers */}
        <path d="M330 280V175l-12-35h24l-12 35v105z" />
        <path d="M378 280V175l-12-35h24l-12 35v105z" />
        <rect x="318" y="200" width="64" height="12" rx="1" />
        <rect x="410" y="155" width="48" height="125" rx="2" />
        <rect x="468" y="125" width="36" height="155" rx="2" />
      </g>

      {/* TV Tower — Berlin icon */}
      <g transform="translate(560, 0)" opacity={isCard ? 0.95 : 1}>
        <rect x="58" y="95" width="8" height="185" fill="url(#bldg-grad)" />
        <ellipse cx="62" cy="72" rx="28" ry="32" fill="url(#tower-ball)" className={isHero ? 'skyline-tower-pulse' : ''} />
        <polygon points="62,8 68,72 56,72" fill="#006699" />
        <line x1="62" y1="8" x2="62" y2="40" stroke="#6b4eff" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Buildings right cluster */}
      <g fill="url(#bldg-grad)" opacity={isCard ? 0.9 : 0.85}>
        <rect x="680" y="140" width="52" height="140" rx="2" />
        <rect x="742" y="165" width="40" height="115" rx="2" />
        <rect x="792" y="115" width="46" height="165" rx="2" />
        <rect x="848" y="150" width="55" height="130" rx="2" />
        {/* Reichstag dome hint */}
        <rect x="920" y="180" width="70" height="100" rx="2" />
        <ellipse cx="955" cy="180" rx="32" ry="18" fill="url(#bldg-grad)" />
        <rect x="1000" y="130" width="44" height="150" rx="2" />
        <rect x="1052" y="155" width="50" height="125" rx="2" />
        <rect x="1110" y="170" width="60" height="110" rx="2" />
      </g>

      {/* Window lights */}
      {!isCard && (
        <g fill="rgb(255 255 255 / 0.35)" className="skyline-lights">
          {[120, 220, 420, 720, 870, 1020].map((x, i) => (
            <rect key={i} x={x} y={190 + (i % 3) * 22} width="6" height="8" rx="1" />
          ))}
        </g>
      )}

      <rect x="0" y="275" width="1200" height="8" fill={isCard ? 'rgb(0 102 153 / 0.2)' : 'rgb(38 121 163 / 0.15)'} />
    </svg>
  );
}
