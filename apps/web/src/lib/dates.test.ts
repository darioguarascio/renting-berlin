import { describe, expect, it } from 'vitest';
import { parseDate, toIsoString } from './dates';

describe('parseDate', () => {
  it('parses ISO datetime strings unchanged', () => {
    const value = '2026-06-12T14:30:00.000Z';
    expect(parseDate(value).toISOString()).toBe(value);
  });

  it('parses date-only strings at noon UTC', () => {
    expect(parseDate('2026-06-12').toISOString()).toBe('2026-06-12T12:00:00.000Z');
  });
});

describe('toIsoString', () => {
  it('serializes Date instances', () => {
    const date = new Date('2026-01-15T10:00:00.000Z');
    expect(toIsoString(date)).toBe('2026-01-15T10:00:00.000Z');
  });

  it('serializes ISO strings from Postgres aggregates', () => {
    expect(toIsoString('2026-01-15T10:00:00.000Z')).toBe('2026-01-15T10:00:00.000Z');
  });
});
