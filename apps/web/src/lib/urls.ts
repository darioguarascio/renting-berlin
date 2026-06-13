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

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;
const HANDLE_INPUT_PATTERN = /[^a-z0-9_-]/g;

/** Strip disallowed characters while the user types. */
export function sanitizeHandleInput(input: string): string {
  return input
    .toLowerCase()
    .replace(/^@/, '')
    .replace(HANDLE_INPUT_PATTERN, '')
    .slice(0, HANDLE_MAX_LENGTH);
}

export function normalizeHandle(input: string): string {
  return sanitizeHandleInput(input)
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .replace(/^[-_]+|[-_]+$/g, '');
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

export function suggestHandleFromName(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  let base = words.join('_');
  if (base.length < 3) base = `user_${nanoid(6)}`;
  return normalizeHandle(base);
}

export function isValidHandle(handle: string): boolean {
  if (handle.length < HANDLE_MIN_LENGTH || handle.length > HANDLE_MAX_LENGTH) return false;
  return /^[a-z][a-z0-9_-]*$/.test(handle);
}

export function getHandleValidationError(handle: string): string | null {
  if (!handle) return 'Enter a handle';

  if (handle.length < HANDLE_MIN_LENGTH) {
    return `At least ${HANDLE_MIN_LENGTH} characters (${handle.length}/${HANDLE_MIN_LENGTH})`;
  }

  if (handle.length > HANDLE_MAX_LENGTH) {
    return `Maximum ${HANDLE_MAX_LENGTH} characters`;
  }

  if (!/^[a-z]/.test(handle)) {
    return 'Must start with a letter (a–z)';
  }

  if (!/^[a-z0-9_-]+$/.test(handle)) {
    return 'Only lowercase letters, numbers, underscores, and hyphens';
  }

  return null;
}
