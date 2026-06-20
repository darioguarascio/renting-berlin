import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildListingBreadcrumbJsonLd,
  buildListingDescription,
  buildListingJsonLd,
  listingPageUrl,
  resolveListingOgImage,
} from './listing-seo';

const siteUrl = 'https://renting.berlin';

const baseListing = {
  title: 'WG room in Neukölln',
  slug: 'wg-room-neukolln',
  shortCode: 'abc12345',
  neighborhood: 'neukolln' as const,
  rentPerMonth: 550,
  sizeSqm: 14,
  rooms: 1,
  category: 'shared_room' as const,
  rentType: 'long_term' as const,
  anmeldungAvailable: false,
  lat: 52.48,
  lng: 13.44,
  photoUrls: ['/uploads/photo.jpg'],
  updatedAt: new Date('2026-03-01T12:00:00Z'),
  publishedAt: new Date('2026-02-15T12:00:00Z'),
};

describe('buildListingDescription', () => {
  it('includes neighborhood, price, and Anmeldung when available', () => {
    const description = buildListingDescription({
      title: 'Bright 2-room flat',
      neighborhood: 'kreuzberg',
      rentPerMonth: 950,
      sizeSqm: 55,
      rooms: 2,
      category: 'full_flat',
      rentType: 'long_term',
      anmeldungAvailable: true,
    });

    expect(description).toContain('Kreuzberg');
    expect(description).toContain('€950/mo');
    expect(description).toContain('Anmeldung available');
  });

  it('omits Anmeldung when unavailable', () => {
    const description = buildListingDescription({
      ...baseListing,
      neighborhood: 'mitte',
      category: 'full_flat',
      rentType: 'short_term',
      anmeldungAvailable: false,
    });

    expect(description).not.toContain('Anmeldung');
    expect(description).toContain('short term');
  });
});

describe('resolveListingOgImage', () => {
  it('prefixes relative photo paths with the site URL', () => {
    expect(resolveListingOgImage(['/uploads/photo.jpg'], siteUrl)).toBe(`${siteUrl}/uploads/photo.jpg`);
  });

  it('uses absolute photo URLs as-is', () => {
    expect(resolveListingOgImage(['https://cdn.example.com/photo.jpg'], siteUrl)).toBe(
      'https://cdn.example.com/photo.jpg',
    );
  });

  it('falls back to og image when there are no photos', () => {
    expect(resolveListingOgImage([], siteUrl)).toBe(`${siteUrl}/api/og.png`);
  });
});

describe('buildListingJsonLd', () => {
  it('emits Apartment schema with offer price', () => {
    const jsonLd = buildListingJsonLd(baseListing, siteUrl);

    expect(jsonLd['@type']).toBe('Apartment');
    expect(jsonLd.url).toBe(`${siteUrl}/listings/wg-room-neukolln--abc12345`);
    expect(jsonLd.offers).toMatchObject({ price: 550, priceCurrency: 'EUR' });
    expect(jsonLd.image).toBe(`${siteUrl}/uploads/photo.jpg`);
  });

  it('uses absolute photo URLs as-is', () => {
    const jsonLd = buildListingJsonLd(
      {
        ...baseListing,
        photoUrls: ['https://cdn.example.com/photo.jpg'],
      },
      siteUrl,
    );

    expect(jsonLd.image).toBe('https://cdn.example.com/photo.jpg');
  });

  it('falls back to og image when there are no photos', () => {
    const jsonLd = buildListingJsonLd({ ...baseListing, photoUrls: [] }, siteUrl);
    expect(jsonLd.image).toBe(`${siteUrl}/api/og.png`);
  });

  it('uses updatedAt when publishedAt is missing', () => {
    const jsonLd = buildListingJsonLd({ ...baseListing, publishedAt: null }, siteUrl);
    expect(jsonLd.datePublished).toBe(baseListing.updatedAt.toISOString());
  });
});

describe('buildListingBreadcrumbJsonLd', () => {
  it('links home, offers, neighborhood, and listing', () => {
    const jsonLd = buildListingBreadcrumbJsonLd(baseListing, siteUrl);

    expect(jsonLd['@type']).toBe('BreadcrumbList');
    expect(jsonLd.itemListElement).toHaveLength(4);
    expect(jsonLd.itemListElement[2]).toMatchObject({
      name: 'Neukölln',
      item: `${siteUrl}/rent-in/neukolln`,
    });
    expect(jsonLd.itemListElement[3]?.item).toBe(`${siteUrl}/listings/wg-room-neukolln--abc12345`);
  });
});

describe('listingPageUrl', () => {
  it('builds absolute listing URLs', () => {
    expect(listingPageUrl('flat-mitte', 'xyz98765', siteUrl)).toBe(
      `${siteUrl}/listings/flat-mitte--xyz98765`,
    );
  });
});
