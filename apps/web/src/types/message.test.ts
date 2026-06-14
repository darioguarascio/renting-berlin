import { describe, expect, it } from 'vitest';
import { isImageAttachment } from './message';

describe('isImageAttachment', () => {
  it('detects image mime types', () => {
    expect(isImageAttachment('image/jpeg')).toBe(true);
    expect(isImageAttachment('image/png')).toBe(true);
    expect(isImageAttachment('application/pdf')).toBe(false);
  });
});
