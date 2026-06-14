import { describe, expect, it } from 'vitest';
import { moderateText } from './text-scorer';

describe('moderateText', () => {
  it('approves normal listing copy', async () => {
    const verdict = await moderateText('Bright 2-room apartment in Prenzlauer Berg, available from July.');
    expect(verdict.approved).toBe(true);
  });

  it('approves empty text', async () => {
    const verdict = await moderateText('   ');
    expect(verdict.approved).toBe(true);
    expect(verdict.score).toBe(0);
  });

  it('flags obvious spam patterns', async () => {
    const verdict = await moderateText(
      'CLICK HERE for 100% FREE crypto giveaway http://spam.example/a http://spam.example/b http://spam.example/c',
    );
    expect(verdict.approved).toBe(false);
    expect(verdict.labels).toContain('spam_pattern');
  });

  it('flags profanity and phone-number spam', async () => {
    const profanity = await moderateText('This listing is shit and fuck this market.');
    expect(profanity.approved).toBe(false);
    expect(profanity.labels).toContain('profanity');

    const phone = await moderateText('Call me now at 030 1234567 for this flat.');
    expect(phone.labels).toContain('spam_pattern');
  });

  it('flags excessive caps and repetitive wording', async () => {
    const caps = await moderateText('AMAZING AMAZING AMAZING FLAT IN BERLIN NOW NOW NOW');
    expect(caps.labels).toContain('excessive_caps');

    const repetitive = await moderateText(
      'flat flat flat room room room berlin berlin berlin cheap cheap cheap now now now please please please contact contact contact today today today deal deal deal offer offer offer rent rent rent',
    );
    expect(repetitive.labels).toContain('repetitive');
    expect(repetitive.score).toBeGreaterThanOrEqual(0.5);
  });
});
