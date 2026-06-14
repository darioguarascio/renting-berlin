import { describe, expect, it } from 'vitest';
import { authEntryUrl, isPublicApi, isPublicPage, isStaticAsset } from './public-routes';

describe('isPublicPage', () => {
  it('allows marketing and auth pages', () => {
    expect(isPublicPage('/')).toBe(true);
    expect(isPublicPage('/login')).toBe(true);
    expect(isPublicPage('/signup')).toBe(true);
    expect(isPublicPage('/signup/handle')).toBe(true);
  });

  it('allows neighborhood SEO pages', () => {
    expect(isPublicPage('/rent-in/neukolln')).toBe(true);
  });

  it('allows guide pages', () => {
    expect(isPublicPage('/guides')).toBe(true);
    expect(isPublicPage('/guides/anmeldung')).toBe(true);
    expect(isPublicPage('/guides/schufa')).toBe(true);
  });

  it('blocks app pages', () => {
    expect(isPublicPage('/offers')).toBe(false);
    expect(isPublicPage('/requests')).toBe(false);
    expect(isPublicPage('/listings/foo--abc')).toBe(false);
  });
});

describe('isPublicApi', () => {
  it('allows auth routes only', () => {
    expect(isPublicApi('/api/auth/sign-in')).toBe(true);
    expect(isPublicApi('/api/search')).toBe(false);
  });
});

describe('isStaticAsset', () => {
  it('allows built assets and icons', () => {
    expect(isStaticAsset('/favicon.ico')).toBe(true);
    expect(isStaticAsset('/favicon.svg')).toBe(true);
    expect(isStaticAsset('/_astro/page.js')).toBe(true);
  });
});

describe('authEntryUrl', () => {
  it('builds login redirect links', () => {
    expect(authEntryUrl('/offers')).toBe('/login?redirect=%2Foffers');
    expect(authEntryUrl('/offers?view=map', 'signup')).toBe('/signup?redirect=%2Foffers%3Fview%3Dmap');
  });
});
