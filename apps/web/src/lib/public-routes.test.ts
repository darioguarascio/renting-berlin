import { describe, expect, it } from 'vitest';
import { AUDIENCE_PAGES } from './audience-pages';
import { authEntryUrl, isPublicApi, isPublicPage, isStaticAsset } from './public-routes';

describe('isPublicPage', () => {
  it('allows marketing and auth pages', () => {
    expect(isPublicPage('/')).toBe(true);
    expect(isPublicPage('/login')).toBe(true);
    expect(isPublicPage('/signup')).toBe(true);
    expect(isPublicPage('/signup/handle')).toBe(true);
    for (const { href } of AUDIENCE_PAGES) {
      expect(isPublicPage(href)).toBe(true);
    }
    expect(isPublicPage('/offers')).toBe(true);
    expect(isPublicPage('/sitemap.xml')).toBe(true);
    expect(isPublicPage('/robots.txt')).toBe(true);
  });

  it('allows neighborhood SEO pages', () => {
    expect(isPublicPage('/rent-in/neukolln')).toBe(true);
  });

  it('allows guide pages', () => {
    expect(isPublicPage('/guides')).toBe(true);
    expect(isPublicPage('/guides/anmeldung')).toBe(true);
    expect(isPublicPage('/guides/schufa')).toBe(true);
  });

  it('allows public listing detail pages', () => {
    expect(isPublicPage('/listings/2-room-flat-neukolln--abc12345')).toBe(true);
  });

  it('blocks app pages that require auth', () => {
    expect(isPublicPage('/requests')).toBe(false);
    expect(isPublicPage('/dashboard')).toBe(false);
    expect(isPublicPage('/messages')).toBe(false);
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
    expect(isStaticAsset('/uploads/listing.jpg')).toBe(true);
  });

  it('does not treat sitemap or robots as static assets', () => {
    expect(isStaticAsset('/robots.txt')).toBe(false);
    expect(isStaticAsset('/sitemap.xml')).toBe(false);
  });
});

describe('authEntryUrl', () => {
  it('builds login redirect links', () => {
    expect(authEntryUrl('/offers')).toBe('/login?redirect=%2Foffers');
    expect(authEntryUrl('/offers?view=map', 'signup')).toBe('/signup?redirect=%2Foffers%3Fview%3Dmap');
  });
});
