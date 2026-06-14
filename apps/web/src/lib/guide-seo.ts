import { GUIDE_CATEGORIES, type Guide } from './guides';
import { getSiteUrl } from './site-url';

const SITE_NAME = 'renting.berlin';

export function guidePath(slug: string): string {
  return `/guides/${slug}`;
}

export function guideUrl(slug: string): string {
  return `${getSiteUrl()}${guidePath(slug)}`;
}

export function guidesIndexUrl(): string {
  return `${getSiteUrl()}/guides`;
}

export function sectionAnchorId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function organizationRef(siteUrl: string) {
  return {
    '@type': 'Organization',
    name: SITE_NAME,
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/og.svg`,
    },
  };
}

export function buildGuideBreadcrumbJsonLd(guide: Guide, siteUrl = getSiteUrl()) {
  const pageUrl = `${siteUrl}${guidePath(guide.slug)}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Guides',
        item: `${siteUrl}/guides`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: guide.title,
        item: pageUrl,
      },
    ],
  };
}

export function buildGuideArticleJsonLd(guide: Guide, siteUrl = getSiteUrl()) {
  const pageUrl = `${siteUrl}${guidePath(guide.slug)}`;
  const modifiedAt = guide.updatedAt ?? guide.publishedAt;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': pageUrl,
    headline: guide.title,
    description: guide.description,
    url: pageUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
    image: [`${siteUrl}/og.svg`],
    inLanguage: 'en-GB',
    isAccessibleForFree: true,
    datePublished: toIsoDateTime(guide.publishedAt),
    dateModified: toIsoDateTime(modifiedAt),
    timeRequired: `PT${guide.readMinutes}M`,
    articleSection: GUIDE_CATEGORIES[guide.category],
    author: organizationRef(siteUrl),
    publisher: organizationRef(siteUrl),
    keywords: [GUIDE_CATEGORIES[guide.category], 'Berlin rental', 'Berlin guide', guide.slug].join(', '),
    about: {
      '@type': 'Thing',
      name: guide.title.replace(/ — .*/, ''),
    },
    hasPart: guide.sections.map((section) => ({
      '@type': 'WebPageElement',
      isAccessibleForFree: true,
      name: section.heading,
      cssSelector: `#${sectionAnchorId(section.heading)}`,
    })),
  };
}

export function buildGuidesIndexJsonLd(guides: Guide[], siteUrl = getSiteUrl()) {
  const pageUrl = `${siteUrl}/guides`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': pageUrl,
        name: 'Berlin rental guides',
        description:
          'Practical guides on Anmeldung, SCHUFA, rent costs, tenant rights, and finding a flat in Berlin.',
        url: pageUrl,
        inLanguage: 'en-GB',
        isPartOf: {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: siteUrl,
        },
        publisher: organizationRef(siteUrl),
      },
      {
        '@type': 'ItemList',
        name: 'Berlin rental guides',
        numberOfItems: guides.length,
        itemListElement: guides.map((guide, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${siteUrl}${guidePath(guide.slug)}`,
          name: guide.title,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: siteUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Guides',
            item: pageUrl,
          },
        ],
      },
    ],
  };
}

export function toIsoDateTime(date: string): string {
  if (date.includes('T')) return date;
  return `${date}T00:00:00+01:00`;
}

export function formatGuideDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(new Date(isoDate));
}
