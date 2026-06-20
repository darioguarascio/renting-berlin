import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClickHouse, findMany, select } = vi.hoisted(() => ({
  getClickHouse: vi.fn(),
  findMany: vi.fn(),
  select: vi.fn(),
}));

vi.mock('../clickhouse/client', () => ({
  getClickHouse,
  clickhouseConfigured: vi.fn(() => true),
}));

vi.mock('../../db', () => ({
  db: {
    query: {
      listings: { findMany },
    },
    select: () => ({
      from: () => ({
        where: select,
      }),
    }),
  },
}));

import { countPublishedListingsSince, recordListingEvent } from './listing-events';
import { clickhouseConfigured } from '../clickhouse/client';

describe('recordListingEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts into ClickHouse when configured', async () => {
    const insert = vi.fn();
    getClickHouse.mockResolvedValue({ insert, query: vi.fn() });

    await recordListingEvent('listing_1', 'published', new Date('2026-06-01T10:00:00.000Z'));

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'listing_events',
        values: [
          expect.objectContaining({
            listing_id: 'listing_1',
            event_type: 'published',
          }),
        ],
      }),
    );
  });

  it('no-ops when ClickHouse is unavailable', async () => {
    getClickHouse.mockResolvedValue(null);

    await expect(recordListingEvent('listing_1', 'unpublished')).resolves.toBeUndefined();
  });
});

describe('countPublishedListingsSince', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses ClickHouse when available', async () => {
    const query = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue([{ count: 4 }]),
    });
    getClickHouse.mockResolvedValue({
      insert: vi.fn(),
      query,
    });

    const since = new Date('2026-06-01T10:00:00.000Z');
    await expect(countPublishedListingsSince(since)).resolves.toBe(4);
    expect(query).toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it('falls back to Postgres when ClickHouse is unavailable', async () => {
    vi.mocked(clickhouseConfigured).mockReturnValue(false);
    getClickHouse.mockResolvedValue(null);
    select.mockResolvedValue([{ count: 2 }]);

    const since = new Date('2026-06-01T10:00:00.000Z');
    await expect(countPublishedListingsSince(since)).resolves.toBe(2);
  });

  it('falls back to Postgres when ClickHouse query fails', async () => {
    getClickHouse.mockResolvedValue({
      insert: vi.fn(),
      query: vi.fn().mockRejectedValue(new Error('down')),
    });
    select.mockResolvedValue([{ count: 3 }]);

    const since = new Date('2026-06-01T10:00:00.000Z');
    await expect(countPublishedListingsSince(since)).resolves.toBe(3);
  });
});
