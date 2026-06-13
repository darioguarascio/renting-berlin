import { describe, expect, it } from 'vitest';
import { receiptStatusFromReadAt } from './MessageReceipt';

describe('receiptStatusFromReadAt', () => {
  it('returns sent when readAt is missing', () => {
    expect(receiptStatusFromReadAt(null)).toBe('sent');
    expect(receiptStatusFromReadAt(undefined)).toBe('sent');
  });

  it('returns read when readAt is set', () => {
    expect(receiptStatusFromReadAt('2026-06-12T10:00:00.000Z')).toBe('read');
  });
});
