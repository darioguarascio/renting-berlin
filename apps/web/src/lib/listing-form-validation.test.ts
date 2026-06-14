import { describe, expect, it } from 'vitest';
import {
  formatListingApiError,
  pickValidListingPatch,
  validateListingPayload,
} from './listing-form-validation';

const validListing = {
  title: 'Bright flat in Kreuzberg',
  category: 'full_flat' as const,
  rentType: 'long_term' as const,
  availableFrom: '2026-04-01',
  sizeSqm: 55,
  rooms: 2,
  floorLevel: 2,
  address: 'Oranienstraße 1, Berlin',
  neighborhood: 'kreuzberg' as const,
  lat: 52.499,
  lng: 13.418,
  approximateLocation: false,
  costs: { rentPerMonth: 1200 },
  descriptions: {},
  requiredDocuments: [],
  equipment: [],
  photoUrls: [],
  status: 'draft' as const,
};

describe('validateListingPayload', () => {
  it('accepts valid payloads', () => {
    expect(validateListingPayload(validListing).success).toBe(true);
  });

  it('returns friendly field errors', () => {
    const result = validateListingPayload({ ...validListing, title: 'Hi', address: '123' });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors.title).toBe('Title must be at least 5 characters');
    expect(result.fieldErrors.address).toBe('Address must be at least 5 characters');
  });
});

describe('pickValidListingPatch', () => {
  it('drops invalid top-level fields from patch payloads', () => {
    const patch = pickValidListingPatch({
      ...validListing,
      title: 'Hi',
      rooms: 3,
    });

    expect(patch.title).toBeUndefined();
    expect(patch.rooms).toBe(3);
  });
});

describe('formatListingApiError', () => {
  it('formats zod issue arrays from the API', () => {
    const message = formatListingApiError(
      JSON.stringify([
        {
          origin: 'string',
          code: 'too_small',
          minimum: 5,
          inclusive: true,
          path: ['title'],
          message: 'Too small: expected string to have >=5 characters',
        },
      ]),
    );

    expect(message).toBe('Title must be at least 5 characters');
  });

  it('returns plain text errors unchanged', () => {
    expect(formatListingApiError('Something went wrong')).toBe('Something went wrong');
  });

  it('returns original body for invalid JSON arrays', () => {
    expect(formatListingApiError('[not-json')).toBe('[not-json');
  });
});

describe('validateListingPayload partial mode', () => {
  it('accepts partial patches', () => {
    const result = validateListingPayload({ title: 'Updated listing title' }, { partial: true });
    expect(result.success).toBe(true);
  });

  it('labels nested cost and description fields', () => {
    const result = validateListingPayload({
      ...validListing,
      costs: { rentPerMonth: -1 },
      descriptions: { apartment: 'x'.repeat(5001) },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors['costs.rentPerMonth']).toContain('at least');
    expect(result.fieldErrors['descriptions.apartment']).toContain('at most');
  });
});
