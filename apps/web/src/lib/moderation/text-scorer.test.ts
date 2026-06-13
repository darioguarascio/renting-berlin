import { describe, expect, it } from 'vitest';
import { moderateText } from './text-scorer';

describe('moderateText', () => {
  it('approves normal listing copy', async () => {
    const verdict = await moderateText('Bright 2-room apartment in Prenzlauer Berg, available from July.');
    expect(verdict.approved).toBe(true);
  });

  it('flags obvious spam patterns', async () => {
    const verdict = await moderateText('CLICK HERE for 100% FREE crypto giveaway http://spam.example/a http://spam.example/b http://spam.example/c');
    expect(verdict.approved).toBe(false);
    expect(verdict.labels).toContain('spam_pattern');
  });
});
