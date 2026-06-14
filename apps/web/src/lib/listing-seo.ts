import {
  CATEGORY_LABELS,
  NEIGHBORHOOD_LABELS,
  RENT_TYPE_LABELS,
  type BerlinNeighborhood,
  type ListingCategory,
  type RentType,
} from '../types/listing';
import { getSiteUrl } from './site-url';
import { buildListingPath, listingHref } from './urls';

const SITE_NAME = 'renting.berlin';

export function listingPageUrl(slug: string, shortCode: string, siteUrl = getSiteUrl()): string {
  return `${siteUrl}${listingHref(slug, shortCode)}`;
}

export function buildListingDescription(input: {
  title: string;
  neighborhood: string;
  rentPerMonth: number;
  sizeSqm: number;
  rooms: number;
  category: ListingCategory;
  rentType: RentType;
  anmeldungAvailable: boolean;
}): string {
  const neighborhood =
    NEIGHBORHOOD_LABELS[input.neighborhood as BerlinNeighborhood] ?? input.neighborhood;
  const parts = [
    `${input.rooms}-room ${CATEGORY_LABELS[input.category].toLowerCase()} in ${neighborhood}, Berlin.`,
    `€${input.rentPerMonth}/mo · ${input.sizeSqm} m² · ${RENT_TYPE_LABELS[input.rentType].toLowerCase()}.`,
  ];
  if (input.anmeldungAvailable) parts.push('Anmeldung available.');
  parts.push('Browse and apply on renting.berlin.');
  return parts.join(' ');
}

export function buildListingJsonLd(
  listing: {
    title: string;
    slug: string;
    shortCode: string;
    neighborhood: string;
    rentPerMonth: number;
    sizeSqm: number;
    rooms: number;
    category: ListingCategory;
    rentType: RentType;
    anmeldungAvailable: boolean;
    lat: number;
    lng: number;
    photoUrls: string[];
    updatedAt: Date;
    publishedAt: Date | null;
  },
  siteUrl = getSiteUrl(),
) {
  const pageUrl = listingPageUrl(listing.slug, listing.shortCode, siteUrl);
  const neighborhood =
    NEIGHBORHOOD_LABELS[listing.neighborhood as BerlinNeighborhood] ?? listing.neighborhood;
  const primaryPhoto = listing.photoUrls[0];
  const image = primaryPhoto?.startsWith('http')
    ? primaryPhoto
    : primaryPhoto
      ? `${siteUrl}${primaryPhoto}`
      : `${siteUrl}/og.svg`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Apartment',
    name: listing.title,
    description: buildListingDescription({
      title: listing.title,
      neighborhood: listing.neighborhood,
      rentPerMonth: listing.rentPerMonth,
      sizeSqm: listing.sizeSqm,
      rooms: listing.rooms,
      category: listing.category,
      rentType: listing.rentType,
      anmeldungAvailable: listing.anmeldungAvailable,
    }),
    url: pageUrl,
    image,
    numberOfRooms: listing.rooms,
    floorSize: {
      '@type': 'QuantitativeValue',
      value: listing.sizeSqm,
      unitCode: 'MTK',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: listing.lat,
      longitude: listing.lng,
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: neighborhood,
      addressRegion: 'Berlin',
      addressCountry: 'DE',
    },
    offers: {
      '@type': 'Offer',
      price: listing.rentPerMonth,
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: pageUrl,
    },
    dateModified: listing.updatedAt.toISOString(),
    datePublished: (listing.publishedAt ?? listing.updatedAt).toISOString(),
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteUrl,
    },
  };
}

export function buildListingBreadcrumbJsonLd(
  listing: { title: string; slug: string; shortCode: string; neighborhood: string },
  siteUrl = getSiteUrl(),
) {
  const pageUrl = listingPageUrl(listing.slug, listing.shortCode, siteUrl);
  const neighborhood =
    NEIGHBORHOOD_LABELS[listing.neighborhood as BerlinNeighborhood] ?? listing.neighborhood;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Offers', item: `${siteUrl}/offers` },
      {
        '@type': 'ListItem',
        position: 3,
        name: neighborhood,
        item: `${siteUrl}/rent-in/${listing.neighborhood}`,
      },
      { '@type': 'ListItem', position: 4, name: listing.title, item: pageUrl },
    ],
  };
}

export { buildListingPath };
