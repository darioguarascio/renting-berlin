function normalizeSiteUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

export function getSiteUrl(): string {
  const raw = process.env.SITE_URL || process.env.BETTER_AUTH_URL;
  if (raw?.trim()) return normalizeSiteUrl(raw);

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SITE_URL or BETTER_AUTH_URL must be set in production (e.g. https://renting.berlin)',
    );
  }

  return 'http://localhost:4321';
}
