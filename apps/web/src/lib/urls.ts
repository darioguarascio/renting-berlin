import { nanoid } from 'nanoid';

export const LISTING_PATH_SEP = '--';

const SHORT_CODE_LEN = 8;

export function generateShortCode(): string {
  return nanoid(SHORT_CODE_LEN);
}

export function seoSlug(text: string, max = 50): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max);
  return base || 'listing';
}

export function buildListingPath(seoPart: string, shortCode: string): string {
  return `${seoPart}${LISTING_PATH_SEP}${shortCode}`;
}

export function parseListingPath(param: string): { shortCode: string | null; legacySlug: string } {
  const idx = param.lastIndexOf(LISTING_PATH_SEP);
  if (idx > 0 && idx < param.length - LISTING_PATH_SEP.length) {
    const shortCode = param.slice(idx + LISTING_PATH_SEP.length);
    if (shortCode.length >= 6) {
      return { shortCode, legacySlug: param };
    }
  }
  return { shortCode: null, legacySlug: param };
}

export function listingHref(seoPart: string, shortCode: string): string {
  return `/listings/${buildListingPath(seoPart, shortCode)}`;
}

export function accountProfileHref(handle: string): string {
  return `/u/${handle}`;
}

/** @deprecated use accountProfileHref */
export function seekerProfileHref(handle: string): string {
  return accountProfileHref(handle);
}

export function parseAccountHandle(param: string): string {
  return param.replace(/^@/, '').toLowerCase();
}

/** @deprecated use parseAccountHandle */
export function parseSeekerHandle(param: string): string {
  return parseAccountHandle(param);
}

export function normalizeHandle(input: string): string {
  return input
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
}

export function suggestHandleFromTitle(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  let base = words.join('_');
  if (base.length < 3) base = `seeker_${nanoid(6)}`;
  return normalizeHandle(base);
}

export function isValidHandle(handle: string): boolean {
  return /^[a-z][a-z0-9_]{2,29}$/.test(handle);
}
