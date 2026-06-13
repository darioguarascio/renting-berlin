import { useEffect, useState } from 'react';
import { authEntryUrl } from '../lib/public-routes';

const PATHS = [
  {
    id: 'offers',
    eyebrow: 'Angebote · Offers',
    title: 'Looking for an apartment',
    description: 'Browse flats and rooms for rent across Berlin. Filter by neighborhood, budget, Anmeldung, and more.',
    cta: 'Sign up to browse',
    href: authEntryUrl('/offers', 'signup'),
    secondaryCta: 'Post your listing',
    secondaryHref: authEntryUrl('/listings/new', 'signup'),
    accent: 'from-[var(--color-brand)] to-[#1a8fc4]',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
        <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.061 1.06l8.69-8.689Z" />
        <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
      </svg>
    ),
  },
  {
    id: 'requests',
    eyebrow: 'Gesuche · Requests',
    title: 'Looking for tenants',
    description: 'List yourself as a seeker — or browse people looking for a place. Landlords find you faster.',
    cta: 'Sign up to browse',
    href: authEntryUrl('/requests', 'signup'),
    secondaryCta: 'Post your profile',
    secondaryHref: authEntryUrl('/requests/new', 'signup'),
    accent: 'from-[var(--color-accent)] to-[#8b5cf6]',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
        <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM15.75 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM2.25 9.75a3 3 0 1 1 6 0 3 3 0 0 1-6 0ZM6.31 15.117A6.745 6.745 0 0 1 12 12a6.745 6.745 0 0 1 6.709 7.498.75.75 0 0 1-.632.502H6.96a.75.75 0 0 1-.65-.883ZM12 14.25a4.5 4.5 0 0 0-4.08 2.592h8.16A4.5 4.5 0 0 0 12 14.25Z" clipRule="evenodd" />
      </svg>
    ),
  },
] as const;

export default function HeroSection() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <section className={`hero-skyline relative overflow-hidden ${ready ? 'hero-ready' : ''}`}>
      <div className="hero-skyline__image" aria-hidden />
      <div className="hero-skyline__overlay" aria-hidden />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center hero-stagger-1">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md">
            <span className="size-1.5 animate-pulse rounded-full bg-[var(--color-signal)]" />
            Berlin only · English-first
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
            Rent in Berlin,<br />
            <span className="text-[var(--color-brand-light)]">with trust built in</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
            Whether you have a place or need one — find your match in Berlin&apos;s international rental market.
          </p>
          <div className="mx-auto mt-6 flex flex-wrap items-center justify-center gap-3">
            <a href={authEntryUrl('/dashboard', 'signup')} className="btn-brand">
              Sign up free
            </a>
            <a href="/login" className="btn-ghost border-white/30 text-white hover:bg-white/10">
              Log in
            </a>
          </div>
        </div>

        <div className="hero-paths mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 sm:gap-5">
          {PATHS.map((path) => (
            <article
              key={path.id}
              className="hero-path-card group relative overflow-hidden rounded-2xl border border-white/20 bg-white/95 p-6 shadow-[var(--shadow-float)] backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-[0_24px_64px_rgb(15_26_46/20%)] sm:p-7"
            >
              <div className="flex gap-4">
                <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${path.accent} text-white shadow-md`}>
                  {path.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-brand-deep)]">{path.eyebrow}</p>
                  <h2 className="mt-1 font-display text-xl font-extrabold text-[var(--color-ink)] sm:text-2xl">{path.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">{path.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <a href={path.href} className="btn-teal text-sm">
                      {path.cta}
                    </a>
                    {'secondaryHref' in path && path.secondaryHref && (
                      <a href={path.secondaryHref} className="btn-ghost text-sm">
                        {path.secondaryCta}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-2xl text-center hero-stagger-3">
          <p className="text-sm text-white/75">
            Verified feedback after real rentals — not anonymous stars.{' '}
            <a href="#trust" className="font-semibold text-white underline decoration-white/40 underline-offset-2 hover:decoration-white">
              How it works
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
