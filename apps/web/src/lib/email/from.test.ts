import { describe, expect, it } from 'vitest';
import { formatEmailFrom, getEmailFromName } from './from';

describe('formatEmailFrom', () => {
  it('adds display name to bare address', () => {
    expect(formatEmailFrom('noreply@renting.berlin', 'renting.berlin')).toBe(
      '"renting.berlin" <noreply@renting.berlin>',
    );
  });

  it('leaves already formatted addresses unchanged', () => {
    expect(formatEmailFrom('"Custom" <hello@example.com>')).toBe('"Custom" <hello@example.com>');
  });

  it('escapes quotes in display name', () => {
    expect(formatEmailFrom('noreply@renting.berlin', 'Rent "Berlin"')).toBe(
      '"Rent \\"Berlin\\"" <noreply@renting.berlin>',
    );
  });

  it('defaults to brand name', () => {
    expect(getEmailFromName()).toBe('renting.berlin');
  });
});
