import { describe, expect, it } from 'vitest';
import {
  agreementActionSchema,
  proposeAgreementSchema,
  rejectOthersSchema,
  DEFAULT_REJECTION_MESSAGE,
} from './agreement-schema';

describe('proposeAgreementSchema', () => {
  const base = {
    title: 'Rental agreement',
    monthlyRent: 1200,
    startDate: '2026-02-01',
    signatureName: 'Pat Owner',
  };

  it('applies defaults for optional fields', () => {
    const parsed = proposeAgreementSchema.parse(base);
    expect(parsed.deposit).toBeNull();
    expect(parsed.endDate).toBeNull();
    expect(parsed.rejectOthers).toBe(false);
    expect(parsed.terms).toBeUndefined();
  });

  it('accepts a fully specified agreement', () => {
    const parsed = proposeAgreementSchema.parse({
      ...base,
      deposit: 2400,
      endDate: '2027-02-01',
      terms: 'Tenant pays utilities.',
      rejectOthers: true,
      rejectMessage: 'Sorry, taken!',
    });
    expect(parsed.deposit).toBe(2400);
    expect(parsed.endDate).toBe('2027-02-01');
    expect(parsed.rejectOthers).toBe(true);
  });

  it('rejects a short title', () => {
    expect(() => proposeAgreementSchema.parse({ ...base, title: 'x' })).toThrow();
  });

  it('rejects a short signature', () => {
    expect(() => proposeAgreementSchema.parse({ ...base, signatureName: 'x' })).toThrow();
  });

  it('rejects a negative rent', () => {
    expect(() => proposeAgreementSchema.parse({ ...base, monthlyRent: -1 })).toThrow();
  });

  it('rejects a non-integer rent', () => {
    expect(() => proposeAgreementSchema.parse({ ...base, monthlyRent: 12.5 })).toThrow();
  });

  it('rejects an invalid start date', () => {
    expect(() => proposeAgreementSchema.parse({ ...base, startDate: 'soon' })).toThrow();
  });
});

describe('agreementActionSchema', () => {
  it('requires a signature when signing', () => {
    expect(agreementActionSchema.parse({ action: 'sign', signatureName: 'Sam Tenant' })).toEqual({
      action: 'sign',
      signatureName: 'Sam Tenant',
    });
    expect(() => agreementActionSchema.parse({ action: 'sign' })).toThrow();
    expect(() => agreementActionSchema.parse({ action: 'sign', signatureName: 'a' })).toThrow();
  });

  it('allows declining with an optional reason', () => {
    expect(agreementActionSchema.parse({ action: 'decline' })).toEqual({ action: 'decline' });
    expect(
      agreementActionSchema.parse({ action: 'decline', reason: 'Found another place' }),
    ).toMatchObject({ action: 'decline', reason: 'Found another place' });
  });

  it('allows withdrawing', () => {
    expect(agreementActionSchema.parse({ action: 'withdraw' })).toEqual({ action: 'withdraw' });
  });

  it('rejects an unknown action', () => {
    expect(() => agreementActionSchema.parse({ action: 'nope' })).toThrow();
  });
});

describe('rejectOthersSchema', () => {
  it('accepts an empty object', () => {
    expect(rejectOthersSchema.parse({})).toEqual({});
  });

  it('accepts an except id and message', () => {
    expect(
      rejectOthersSchema.parse({ exceptConversationId: 'conv_1', message: 'Taken, sorry' }),
    ).toMatchObject({ exceptConversationId: 'conv_1', message: 'Taken, sorry' });
  });

  it('rejects an empty message', () => {
    expect(() => rejectOthersSchema.parse({ message: '' })).toThrow();
  });

  it('exposes a default rejection message', () => {
    expect(DEFAULT_REJECTION_MESSAGE.length).toBeGreaterThan(0);
  });
});
