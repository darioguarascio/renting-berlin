import { beforeEach, describe, expect, it } from 'vitest';
import {
  getDefaultTableColumns,
  loadTableColumns,
  saveTableColumns,
} from './listing-table-columns';
import {
  getDefaultRequestTableColumns,
  loadRequestTableColumns,
  saveRequestTableColumns,
} from './request-table-columns';

describe('listing table columns', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when storage is empty', () => {
    expect(loadTableColumns()).toEqual(getDefaultTableColumns());
  });

  it('persists valid column selections and keeps required columns', () => {
    saveTableColumns(['neighborhood', 'rooms']);
    expect(loadTableColumns()).toEqual(['title', 'neighborhood', 'rooms']);
  });

  it('falls back to defaults for invalid storage', () => {
    localStorage.setItem('offers-table-columns', '{bad json');
    expect(loadTableColumns()).toEqual(getDefaultTableColumns());
  });
});

describe('request table columns', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns defaults when storage is empty', () => {
    expect(loadRequestTableColumns()).toEqual(getDefaultRequestTableColumns());
  });

  it('persists valid column selections and keeps required columns', () => {
    saveRequestTableColumns(['budget', 'hasPets']);
    expect(loadRequestTableColumns()).toEqual(['handle', 'budget', 'hasPets']);
  });
});
