function normalizeSiteUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

export function getAppVersion(): string {
  return process.env.APP_VERSION?.trim() || 'dev';
}

export function getAppCommit(): string {
  return process.env.APP_COMMIT?.trim() || 'unknown';
}

export function getAppCommitShort(): string {
  const commit = getAppCommit();
  return commit === 'unknown' ? commit : commit.slice(0, 7);
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
