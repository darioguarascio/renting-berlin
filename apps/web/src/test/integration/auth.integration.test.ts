import { beforeAll, describe, expect, it } from 'vitest';
import { loadTestFixtures } from '../integration/setup';

describe('auth API (integration)', () => {
  beforeAll(async () => {
    await loadTestFixtures();
  });

  it('starts Google OAuth without server error', async () => {
    const { auth } = await import('../../lib/auth');
    const result = await auth.api.signInSocial({
      body: {
        provider: 'google',
        callbackURL: '/dashboard',
        disableRedirect: true,
      },
    });

    expect(result.url).toMatch(/^https:\/\/accounts\.google\.com\//);
    expect(result.redirect).toBe(false);
  });
});
