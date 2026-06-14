import { describe, expect, it } from 'vitest';
import { floorLevelLabel } from './listing';

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
