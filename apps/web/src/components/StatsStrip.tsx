import { useEffect, useRef, useState } from 'react';

// Update these numbers as the platform grows
const STATS = [
  { target: 450, suffix: '+', label: 'Listings published' },
  { target: 12, suffix: '', label: 'Berlin neighborhoods' },
  { target: 1200, suffix: '+', label: 'Members joined' },
  { target: 100, suffix: '%', label: 'Berlin focused' },
];

export default function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const [counts, setCounts] = useState(STATS.map(() => 0));
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    const duration = 1800;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setCounts(STATS.map((s) => (t >= 1 ? s.target : Math.floor(ease * s.target))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return (
    <div ref={ref} className="border-y border-[var(--color-border)] bg-[var(--color-ink)] py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <div key={stat.label} className="flex flex-col items-center gap-1.5 text-center">
              <p className="font-display text-4xl font-extrabold tabular-nums text-white sm:text-5xl">
                {counts[i].toLocaleString()}{stat.suffix}
              </p>
              <p className="text-xs font-bold uppercase tracking-widest text-white/45">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
