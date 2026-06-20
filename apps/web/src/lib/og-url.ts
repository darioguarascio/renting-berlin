import { getSiteUrl } from './site-url';

export interface OgUrlParams {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  stats?: string[];
}

const TITLE_SUFFIX = /\s*[—–-]\s*renting\.berlin\s*$/i;

/** Builds an absolute URL to the live OG image endpoint (/api/og.png). */
export function buildOgImageUrl(params: OgUrlParams = {}, siteUrl = getSiteUrl()): string {
  const search = new URLSearchParams();
  const title = params.title?.replace(TITLE_SUFFIX, '').trim();
  if (title) search.set('title', title);
  if (params.subtitle?.trim()) search.set('subtitle', params.subtitle.trim());
  if (params.eyebrow?.trim()) search.set('eyebrow', params.eyebrow.trim());
  for (const stat of params.stats ?? []) {
    if (stat.trim()) search.append('stat', stat.trim());
  }
  const query = search.toString();
  return `${siteUrl}/api/og.png${query ? `?${query}` : ''}`;
}
