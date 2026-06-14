import { describe, expect, it } from 'vitest';
import { neighborhoodCenter, requestMapPosition } from './berlin-neighborhood-centers';

describe('neighborhoodCenter', () => {
  it('returns known neighborhood coordinates', () => {
    expect(neighborhoodCenter('kreuzberg')).toEqual([52.499, 13.418]);
  });

  it('falls back to Berlin center for unknown slugs', () => {
    expect(neighborhoodCenter('unknown-area')).toEqual([52.52, 13.405]);
  });
});

describe('requestMapPosition', () => {
  it('averages selected neighborhoods', () => {
    const [lat, lng] = requestMapPosition(['kreuzberg', 'mitte']);
    expect(lat).toBeCloseTo(52.5095, 3);
    expect(lng).toBeCloseTo(13.4115, 3);
  });

  it('returns Berlin center when no neighborhoods are selected', () => {
    expect(requestMapPosition([])).toEqual([52.52, 13.405]);
  });
});
