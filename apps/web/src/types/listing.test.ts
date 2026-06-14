import { describe, expect, it } from 'vitest';
import { BERLIN_NEIGHBORHOODS_SORTED, NEIGHBORHOOD_LABELS, floorLevelLabel } from './listing';

describe('BERLIN_NEIGHBORHOODS_SORTED', () => {
  it('is sorted alphabetically by display label', () => {
    const labels = BERLIN_NEIGHBORHOODS_SORTED.map((slug) => NEIGHBORHOOD_LABELS[slug]);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'de')));
  });
});

describe('floorLevelLabel', () => {
  it('returns labels for known floor values', () => {
    expect(floorLevelLabel(1)).toBe('Ground floor');
    expect(floorLevelLabel(2)).toBe('1st floor');
    expect(floorLevelLabel(11)).toBe('Loft / Attic');
  });

  it('returns null for missing or unknown values', () => {
    expect(floorLevelLabel(null)).toBeNull();
    expect(floorLevelLabel(undefined)).toBeNull();
    expect(floorLevelLabel(99 as never)).toBeNull();
  });
});
