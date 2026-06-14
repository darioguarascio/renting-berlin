import { describe, expect, it } from 'vitest';
import { buildListingDescription, buildListingJsonLd, listingPageUrl } from './listing-seo';

const siteUrl = 'https://renting.berlin';

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
});

describe('buildListingJsonLd', () => {
  it('emits Apartment schema with offer price', () => {
    const jsonLd = buildListingJsonLd(
      {
        title: 'WG room in Neukölln',
        slug: 'wg-room-neukolln',
        shortCode: 'abc12345',
        neighborhood: 'neukolln',
        rentPerMonth: 550,
        sizeSqm: 14,
        rooms: 1,
        category: 'shared_room',
        rentType: 'long_term',
        anmeldungAvailable: false,
        lat: 52.48,
        lng: 13.44,
        photoUrls: ['/uploads/photo.jpg'],
        updatedAt: new Date('2026-03-01T12:00:00Z'),
        publishedAt: new Date('2026-02-15T12:00:00Z'),
      },
      siteUrl,
    );

    expect(jsonLd['@type']).toBe('Apartment');
    expect(jsonLd.url).toBe(`${siteUrl}/listings/wg-room-neukolln--abc12345`);
    expect(jsonLd.offers).toMatchObject({ price: 550, priceCurrency: 'EUR' });
    expect(jsonLd.image).toBe(`${siteUrl}/uploads/photo.jpg`);
  });
});

describe('listingPageUrl', () => {
  it('builds absolute listing URLs', () => {
    expect(listingPageUrl('flat-mitte', 'xyz98765', siteUrl)).toBe(
      `${siteUrl}/listings/flat-mitte--xyz98765`,
    );
  });
});
