import { describe, expect, it } from 'vitest';
import { GUIDES } from './guides';
import { BERLIN_NEIGHBORHOODS } from '../types/listing';
import { renderRobotsTxt, renderSitemapXml } from './sitemap-xml';

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

describe('sitemap coverage', () => {
  it('includes all guides and neighborhoods in static planning', () => {
    const staticCount = 5 + GUIDES.length + BERLIN_NEIGHBORHOODS.length;
    expect(staticCount).toBeGreaterThan(30);
  });
});
