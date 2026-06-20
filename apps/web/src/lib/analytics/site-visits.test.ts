import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getClickHouse, findFirst, update } = vi.hoisted(() => ({
  getClickHouse: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
}));

vi.mock('../clickhouse/client', () => ({
  getClickHouse,
}));

vi.mock('../../db', () => ({
  db: {
    query: {
      users: { findFirst },
    },
    update: () => ({
      set: () => ({
        where: update,
      }),
    }),
  },
}));

import { getLastSiteVisit, recordSiteVisit } from './site-visits';

describe('getLastSiteVisit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads from ClickHouse when configured', async () => {
    const query = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue([{ last_visit: '2026-06-01 10:00:00.000' }]),
    });
    getClickHouse.mockResolvedValue({ query, insert: vi.fn() });

    const lastVisit = await getLastSiteVisit('user_1', 'offers');
    expect(lastVisit).toEqual(new Date('2026-06-01 10:00:00.000'));
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('falls back to Postgres when ClickHouse is unavailable', async () => {
    getClickHouse.mockResolvedValue(null);
    findFirst.mockResolvedValue({ lastOffersVisitAt: new Date('2026-06-01T09:00:00.000Z') });

    const lastVisit = await getLastSiteVisit('user_1', 'offers');
    expect(lastVisit).toEqual(new Date('2026-06-01T09:00:00.000Z'));
  });
});

describe('recordSiteVisit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    update.mockResolvedValue(undefined);
  });

  it('inserts into ClickHouse when configured', async () => {
    const insert = vi.fn();
    getClickHouse.mockResolvedValue({ insert, query: vi.fn() });

    await recordSiteVisit('user_1', 'offers', new Date('2026-06-01T10:00:00.000Z'));

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'site_visits',
        values: [
          expect.objectContaining({
            visitor_id: 'user_1',
            page: 'offers',
          }),
        ],
      }),
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('falls back to Postgres for known users when ClickHouse is unavailable', async () => {
    getClickHouse.mockResolvedValue(null);
    findFirst.mockResolvedValue({ id: 'user_1' });

    await recordSiteVisit('user_1', 'offers', new Date('2026-06-01T10:00:00.000Z'));

    expect(update).toHaveBeenCalledWith(expect.anything());
  });
});
