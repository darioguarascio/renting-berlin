import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getLastSiteVisit, recordSiteVisit, countPublishedListingsSince } = vi.hoisted(() => ({
  getLastSiteVisit: vi.fn(),
  recordSiteVisit: vi.fn(),
  countPublishedListingsSince: vi.fn(),
}));

vi.mock('./analytics/site-visits', () => ({
  getLastSiteVisit,
  recordSiteVisit,
}));

vi.mock('./analytics/listing-events', () => ({
  countPublishedListingsSince,
}));

import {
  countNewListingsSince,
  getLastOffersVisit,
  OFFERS_SEEN_COOKIE,
  recordOffersVisit,
  resolveVisitorId,
  VISITOR_COOKIE,
} from './offers-visit';

describe('resolveVisitorId', () => {
  it('uses user id for authenticated visitors', () => {
    expect(resolveVisitorId('user_1')).toEqual({ visitorId: 'user_1', created: false });
  });

  it('reuses anonymous visitor cookie', () => {
    expect(resolveVisitorId(undefined, 'anon_1')).toEqual({ visitorId: 'anon_1', created: false });
  });

  it('creates a new anonymous visitor id', () => {
    const result = resolveVisitorId();
    expect(result.created).toBe(true);
    expect(result.visitorId.length).toBeGreaterThan(0);
  });
});

describe('getLastOffersVisit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads last visit from ClickHouse via site-visits', async () => {
    const visit = new Date('2026-06-01T10:00:00.000Z');
    getLastSiteVisit.mockResolvedValue(visit);

    await expect(getLastOffersVisit('user_1', 'anon_1')).resolves.toEqual(visit);
    expect(getLastSiteVisit).toHaveBeenCalledWith('user_1', 'offers');
  });

  it('falls back to seen-at cookie when ClickHouse has no visit', async () => {
    getLastSiteVisit.mockResolvedValue(null);

    await expect(getLastOffersVisit('user_1', undefined, '2026-06-01T10:00:00.000Z')).resolves.toEqual(
      new Date('2026-06-01T10:00:00.000Z'),
    );
  });

  it('uses cookie for first-time anonymous visitors without visitor id', async () => {
    await expect(getLastOffersVisit(undefined, undefined, '2026-06-01T10:00:00.000Z')).resolves.toEqual(
      new Date('2026-06-01T10:00:00.000Z'),
    );
    expect(getLastSiteVisit).not.toHaveBeenCalled();
  });
});

describe('countNewListingsSince', () => {
  it('delegates to ClickHouse listing analytics', async () => {
    const since = new Date('2026-06-01T10:00:00.000Z');
    countPublishedListingsSince.mockResolvedValue(7);

    await expect(countNewListingsSince(since)).resolves.toBe(7);
    expect(countPublishedListingsSince).toHaveBeenCalledWith(since);
  });
});

describe('recordOffersVisit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordSiteVisit.mockResolvedValue(undefined);
  });

  it('records visit in ClickHouse and sets cookies for authenticated users', async () => {
    const setCookie = vi.fn();

    await recordOffersVisit('user_1', undefined, setCookie);

    expect(recordSiteVisit).toHaveBeenCalledWith('user_1', 'offers', expect.any(Date));
    expect(setCookie).toHaveBeenCalledWith(
      OFFERS_SEEN_COOKIE,
      expect.any(String),
      expect.objectContaining({ path: '/', sameSite: 'lax' }),
    );
    expect(setCookie).not.toHaveBeenCalledWith(VISITOR_COOKIE, expect.anything(), expect.anything());
  });

  it('creates visitor id cookie for new anonymous users', async () => {
    const setCookie = vi.fn();

    await recordOffersVisit(undefined, undefined, setCookie);

    expect(recordSiteVisit).toHaveBeenCalledWith(expect.any(String), 'offers', expect.any(Date));
    expect(setCookie).toHaveBeenCalledWith(
      VISITOR_COOKIE,
      expect.any(String),
      expect.objectContaining({ path: '/', sameSite: 'lax' }),
    );
  });
});
