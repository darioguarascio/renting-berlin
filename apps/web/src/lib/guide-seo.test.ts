import { describe, expect, it } from 'vitest';
import { GUIDES } from './guides';
import {
  buildGuideArticleJsonLd,
  buildGuideBreadcrumbJsonLd,
  buildGuidesIndexJsonLd,
  sectionAnchorId,
} from './guide-seo';

const siteUrl = 'https://renting.berlin';
const anmeldung = GUIDES.find((g) => g.slug === 'anmeldung')!;

describe('sectionAnchorId', () => {
  it('slugifies section headings', () => {
    expect(sectionAnchorId('What is Anmeldung?')).toBe('what-is-anmeldung');
  });
});

describe('buildGuideArticleJsonLd', () => {
  it('emits Article schema with guide metadata', () => {
    const jsonLd = buildGuideArticleJsonLd(anmeldung, siteUrl);

    expect(jsonLd['@type']).toBe('Article');
    expect(jsonLd.headline).toBe(anmeldung.title);
    expect(jsonLd.url).toBe(`${siteUrl}/guides/anmeldung`);
    expect(jsonLd.datePublished).toBe('2025-01-15T00:00:00+01:00');
    expect(jsonLd.hasPart).toHaveLength(anmeldung.sections.length);
    expect(jsonLd.author).toMatchObject({ '@type': 'Organization', name: 'renting.berlin' });
  });
});

describe('buildGuideBreadcrumbJsonLd', () => {
  it('includes home, guides index, and article', () => {
    const jsonLd = buildGuideBreadcrumbJsonLd(anmeldung, siteUrl);

    expect(jsonLd.itemListElement).toHaveLength(3);
    expect(jsonLd.itemListElement[2].item).toBe(`${siteUrl}/guides/anmeldung`);
  });
});

describe('buildGuidesIndexJsonLd', () => {
  it('lists all guides', () => {
    const jsonLd = buildGuidesIndexJsonLd(GUIDES, siteUrl);
    const itemList = jsonLd['@graph'].find((node) => node['@type'] === 'ItemList');

    expect(itemList?.numberOfItems).toBe(GUIDES.length);
    expect(itemList?.itemListElement[0].url).toBe(`${siteUrl}/guides/${GUIDES[0].slug}`);
  });
});
