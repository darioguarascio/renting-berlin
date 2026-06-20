import { nanoid } from 'nanoid';
import { countPublishedListingsSince } from './analytics/listing-events';
import { getLastSiteVisit, recordSiteVisit } from './analytics/site-visits';

export const VISITOR_COOKIE = 'rb_vid';
export const OFFERS_SEEN_COOKIE = 'rb_offers_seen_at';
export const OFFERS_SEEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type SetCookieFn = (
  name: string,
  value: string,
  options: { path: string; maxAge: number; sameSite: 'lax' | 'strict' | 'none' },
) => void;

function parseSeenAtCookie(cookieValue?: string): Date | null {
  if (!cookieValue) return null;
  const parsed = new Date(decodeURIComponent(cookieValue));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveVisitorId(
  userId?: string,
  visitorCookie?: string,
): { visitorId: string; created: boolean } {
  if (userId) return { visitorId: userId, created: false };
  if (visitorCookie) return { visitorId: visitorCookie, created: false };
  return { visitorId: nanoid(), created: true };
}

export async function getLastOffersVisit(
  userId?: string,
  visitorCookie?: string,
  seenAtCookie?: string,
): Promise<Date | null> {
  if (!userId && !visitorCookie) {
    return parseSeenAtCookie(seenAtCookie);
  }

  const { visitorId } = resolveVisitorId(userId, visitorCookie);
  const lastVisit = await getLastSiteVisit(visitorId, 'offers');
  if (lastVisit) return lastVisit;

  return parseSeenAtCookie(seenAtCookie);
}

export async function countNewListingsSince(since: Date): Promise<number> {
  return countPublishedListingsSince(since);
}

export async function recordOffersVisit(
  userId: string | undefined,
  visitorCookie: string | undefined,
  setCookie: SetCookieFn,
): Promise<void> {
  const { visitorId, created } = resolveVisitorId(userId, visitorCookie);
  const now = new Date();

  await recordSiteVisit(visitorId, 'offers', now);

  if (created) {
    setCookie(VISITOR_COOKIE, visitorId, {
      path: '/',
      maxAge: OFFERS_SEEN_COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
  }

  setCookie(OFFERS_SEEN_COOKIE, now.toISOString(), {
    path: '/',
    maxAge: OFFERS_SEEN_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });
}
