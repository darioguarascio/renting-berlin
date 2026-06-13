const PUBLIC_PAGES = new Set(['/', '/login', '/signup', '/signup/handle']);
const PUBLIC_PAGE_PREFIXES = ['/rent-in/'];

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
    path === '/favicon.svg' ||
    path === '/og.svg' ||
    path === '/robots.txt'
  );
}

export function authEntryUrl(path: string, mode: 'login' | 'signup' = 'login'): string {
  const base = mode === 'signup' ? '/signup' : '/login';
  return `${base}?redirect=${encodeURIComponent(path)}`;
}
