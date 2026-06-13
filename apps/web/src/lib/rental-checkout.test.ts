import { describe, expect, it } from 'vitest';
import { checkoutInputSchema } from './rental-checkout-schema';

describe('checkoutInputSchema', () => {
  it('accepts unlist without tenant', () => {
    const parsed = checkoutInputSchema.parse({
      intent: 'unlist',
      rentedToUserId: null,
      rentalEndDate: null,
    });

    expect(parsed.intent).toBe('unlist');
    expect(parsed.updateListingEndDate).toBe(true);
  });

  it('requires rental end date when tenant is selected', () => {
    expect(() =>
      checkoutInputSchema.parse({
        intent: 'close',
        rentedToUserId: 'user_123',
        rentalEndDate: null,
      }),
    ).not.toThrow();

    expect(() =>
      checkoutInputSchema.parse({
        intent: 'close',
        rentedToUserId: 'user_123',
        rentalEndDate: 'not-a-date',
      }),
    ).toThrow();
  });

  it('defaults intent to unlist', () => {
    expect(checkoutInputSchema.parse({ rentedToUserId: null, rentalEndDate: null }).intent).toBe(
      'unlist',
    );
  });
});
