import { afterEach, describe, expect, it } from 'vitest';
import { getSiteUrl } from './site-url';

describe('getSiteUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers SITE_URL and strips trailing slash', () => {
    process.env.SITE_URL = 'https://renting.berlin/';
    delete process.env.BETTER_AUTH_URL;
    expect(getSiteUrl()).toBe('https://renting.berlin');
  });

  it('falls back to BETTER_AUTH_URL', () => {
    delete process.env.SITE_URL;
    process.env.BETTER_AUTH_URL = 'http://localhost:4321/';
    expect(getSiteUrl()).toBe('http://localhost:4321');
  });

  it('uses localhost in non-production when unset', () => {
    delete process.env.SITE_URL;
    delete process.env.BETTER_AUTH_URL;
    process.env.NODE_ENV = 'test';
    expect(getSiteUrl()).toBe('http://localhost:4321');
  });

  it('throws in production when unset', () => {
    delete process.env.SITE_URL;
    delete process.env.BETTER_AUTH_URL;
    process.env.NODE_ENV = 'production';
    expect(() => getSiteUrl()).toThrow(/SITE_URL or BETTER_AUTH_URL/i);
  });
});
