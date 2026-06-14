import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AUDIENCE_PAGES } from './audience-pages';
import { GUIDES } from './guides';
import { BERLIN_NEIGHBORHOODS } from '../types/listing';
import { renderRobotsTxt, renderSitemapXml } from './sitemap-xml';

const findManyListings = vi.fn();

vi.mock('../db', () => ({
  db: {
    query: {
      listings: {
        findMany: findManyListings,
      },
    },
  },
}));

describe('renderSitemapXml', () => {
  it('renders valid urlset XML', () => {
    const xml = renderSitemapXml([
      { loc: 'https://renting.berlin/', priority: 1, changefreq: 'weekly' },
      { loc: 'https://renting.berlin/offers', lastmod: '2026-03-01', changefreq: 'hourly', priority: 0.9 },
    ]);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<loc>https://renting.berlin/</loc>');
    expect(xml).toContain('<lastmod>2026-03-01</lastmod>');
  });

  it('escapes special characters in URLs', () => {
    const xml = renderSitemapXml([{ loc: 'https://renting.berlin/offers?q=a&b=c' }]);
    expect(xml).toContain('&amp;');
  });
});

describe('renderRobotsTxt', () => {
  it('includes sitemap reference', () => {
    const txt = renderRobotsTxt('https://renting.berlin');
    expect(txt).toContain('Sitemap: https://renting.berlin/sitemap.xml');
    expect(txt).toContain('Allow: /');
  });
});

describe('getSitemapEntries', () => {
  beforeEach(() => {
    findManyListings.mockReset();
  });

  it('includes static pages, guides, neighborhoods, and active listings', async () => {
    findManyListings.mockResolvedValue([
      {
        slug: 'bright-flat-kreuzberg',
        shortCode: 'abc12345',
        updatedAt: new Date('2026-03-01T12:00:00Z'),
      },
    ]);

    const { getSitemapEntries } = await import('./sitemap');
    const entries = await getSitemapEntries('https://renting.berlin');

    expect(entries.some((entry) => entry.loc === 'https://renting.berlin/')).toBe(true);
    for (const { href } of AUDIENCE_PAGES) {
      expect(entries.some((entry) => entry.loc === `https://renting.berlin${href}`)).toBe(true);
    }
    expect(entries.filter((entry) => entry.loc.includes('/guides/')).length).toBe(GUIDES.length);
    expect(entries.filter((entry) => entry.loc.includes('/rent-in/')).length).toBe(
      BERLIN_NEIGHBORHOODS.length,
    );
    expect(entries.some((entry) => entry.loc === 'https://renting.berlin/listings/bright-flat-kreuzberg--abc12345')).toBe(true);
  });

  it('returns static pages when listing lookup fails', async () => {
    findManyListings.mockRejectedValue(new Error('db down'));

    const { getSitemapEntries } = await import('./sitemap');
    const entries = await getSitemapEntries('https://renting.berlin');

    expect(entries.some((entry) => entry.loc === 'https://renting.berlin/offers')).toBe(true);
    expect(entries.some((entry) => entry.loc.includes('/listings/'))).toBe(false);
  });
});
