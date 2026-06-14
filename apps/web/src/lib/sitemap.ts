import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { listings } from '../db/schema';
import { AUDIENCE_PAGES } from './audience-pages';
import { GUIDES } from './guides';
import { buildListingPath } from './urls';
import { BERLIN_NEIGHBORHOODS } from '../types/listing';
import { getSiteUrl } from './site-url';
import type { SitemapEntry } from './sitemap-xml';

export type { SitemapEntry } from './sitemap-xml';
export { renderRobotsTxt, renderSitemapXml } from './sitemap-xml';

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getSitemapEntries(siteUrl = getSiteUrl()): Promise<SitemapEntry[]> {
  const staticPages: SitemapEntry[] = [
    { loc: `${siteUrl}/`, changefreq: 'weekly', priority: 1 },
    { loc: `${siteUrl}/offers`, changefreq: 'hourly', priority: 0.9 },
    ...AUDIENCE_PAGES.map(({ href }) => ({
      loc: `${siteUrl}${href}`,
      changefreq: 'monthly' as const,
      priority: 0.8,
    })),
    { loc: `${siteUrl}/guides`, changefreq: 'weekly', priority: 0.8 },
    { loc: `${siteUrl}/privacy`, changefreq: 'yearly', priority: 0.3 },
    { loc: `${siteUrl}/signup`, changefreq: 'monthly', priority: 0.5 },
  ];

  const guidePages: SitemapEntry[] = GUIDES.map((guide) => ({
    loc: `${siteUrl}/guides/${guide.slug}`,
    lastmod: guide.updatedAt ?? guide.publishedAt,
    changefreq: 'monthly' as const,
    priority: 0.7,
  }));

  const neighborhoodPages: SitemapEntry[] = BERLIN_NEIGHBORHOODS.map((slug) => ({
    loc: `${siteUrl}/rent-in/${slug}`,
    changefreq: 'daily' as const,
    priority: 0.75,
  }));

  let listingPages: SitemapEntry[] = [];
  try {
    const rows = await db.query.listings.findMany({
      where: and(eq(listings.status, 'active'), eq(listings.moderationStatus, 'approved')),
      columns: {
        slug: true,
        shortCode: true,
        updatedAt: true,
      },
      orderBy: [desc(listings.updatedAt)],
      limit: 5000,
    });
    listingPages = rows.map((row) => ({
      loc: `${siteUrl}/listings/${buildListingPath(row.slug, row.shortCode)}`,
      lastmod: toIsoDate(row.updatedAt),
      changefreq: 'daily' as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable — static pages only
  }

  return [...staticPages, ...guidePages, ...neighborhoodPages, ...listingPages];
}
