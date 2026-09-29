const PUBLIC_PAGES = new Set([
  '/',
  '/login',
  '/signup',
  '/signup/handle',
  '/guides',
  '/offers',
  '/for-landlords',
  '/for-seekers',
  '/for-tenants',
  '/for-swappers',
  '/privacy',
  '/sitemap.xml',
  '/robots.txt',
]);
const PUBLIC_PAGE_PREFIXES = ['/rent-in/', '/guides/', '/e/', '/listings/', '/invite/'];

export function isPublicPage(path: string): boolean {
  if (PUBLIC_PAGES.has(path)) return true;
  return PUBLIC_PAGE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function isPublicApi(path: string): boolean {
  return path.startsWith('/api/auth');
}

export function isStaticAsset(path: string): boolean {
  return (
    path.startsWith('/_astro/') ||
    path.startsWith('/uploads/') ||
    path.startsWith('/email/') ||
    path === '/favicon.ico' ||
    path === '/favicon.svg' ||
    path === '/og.svg'
  );
}

export function normalizeRedirectPath(
  path: string | null | undefined,
  fallback = '/dashboard',
): string {
  const trimmed = (path ?? '').trim();
  if (!trimmed) return fallback;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('//')) return fallback;

  let normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const pathname = normalized.split('?')[0] ?? normalized;

  // Bare listing slugs (flat-in-xberg--21TVC_kN) must stay absolute under /listings/.
  if (
    !pathname.startsWith('/listings/') &&
    /^\/[a-z0-9-]+--[A-Za-z0-9_-]+$/.test(pathname)
  ) {
    normalized = `/listings${normalized}`;
  }

  return normalized;
}

export function authEntryUrl(path: string, mode: 'login' | 'signup' = 'login'): string {
  const base = mode === 'signup' ? '/signup' : '/login';
  return `${base}?redirect=${encodeURIComponent(normalizeRedirectPath(path))}`;
}
