import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AUDIENCE_PAGES } from './audience-pages';
import { isPublicPage } from './public-routes';

const pagesDir = join(import.meta.dirname, '../pages');

describe('AUDIENCE_PAGES', () => {
  it('lists four distinct public marketing pages', () => {
    expect(AUDIENCE_PAGES).toHaveLength(4);

    const hrefs = AUDIENCE_PAGES.map((page) => page.href);
    expect(new Set(hrefs).size).toBe(4);

    for (const { href, label } of AUDIENCE_PAGES) {
      expect(label.length).toBeGreaterThan(0);
      expect(isPublicPage(href)).toBe(true);
    }
  });
});

describe('audience page cross-links', () => {
  for (const page of AUDIENCE_PAGES) {
    it(`${page.href} links to the other audience pages`, () => {
      const file = join(pagesDir, `${page.href.slice(1)}.astro`);
      expect(existsSync(file)).toBe(true);

      const content = readFileSync(file, 'utf8');
      const others = AUDIENCE_PAGES.filter((entry) => entry.href !== page.href);

      for (const other of others) {
        expect(content).toContain(`href="${other.href}"`);
      }
    });
  }
});
