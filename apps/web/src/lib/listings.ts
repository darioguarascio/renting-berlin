import { and, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '../db';
import { listings } from '../db/schema';
import type { ListingSummary } from '../types/listing';
import {
  BERLIN_NEIGHBORHOODS,
  EQUIPMENT,
  LISTING_CATEGORIES,
  RENT_TYPES,
  REQUIRED_DOCUMENTS,
  FLOOR_LEVEL_VALUES,
} from '../types/listing';
import { indexListing, removeListingFromIndex } from './search';
import { buildListingPath, generateShortCode, parseListingPath, seoSlug } from './urls';

export const listingInputSchema = z.object({
  title: z.string().min(5).max(120),
  category: z.enum(LISTING_CATEGORIES),
  rentType: z.enum(RENT_TYPES),
  availableFrom: z.string().datetime().or(z.string().date()),
  availableTo: z.string().datetime().or(z.string().date()).optional().nullable(),
  sizeSqm: z.number().int().min(5).max(500),
  rooms: z.number().int().min(1).max(20),
  floorLevel: z.number().int().refine((value) => FLOOR_LEVEL_VALUES.includes(value as (typeof FLOOR_LEVEL_VALUES)[number])).optional().nullable(),
  onlineViewingAvailable: z.boolean().default(false),
  anmeldungAvailable: z.boolean().default(false),
  schufaRequired: z.boolean().default(false),
  address: z.string().min(5).max(200),
  neighborhood: z.enum(BERLIN_NEIGHBORHOODS),
  lat: z.number().min(52.3).max(52.7),
  lng: z.number().min(13.0).max(13.8),
  approximateLocation: z.boolean().default(false),
  costs: z.object({
    rentPerMonth: z.number().int().min(0),
    utilities: z.number().int().min(0).optional(),
    deposit: z.number().int().min(0).optional(),
    equipmentFee: z.number().int().min(0).optional(),
    other: z.number().int().min(0).optional(),
  }),
  descriptions: z.object({
    apartment: z.string().max(5000).optional(),
    location: z.string().max(5000).optional(),
    misc: z.string().max(5000).optional(),
  }),
  requiredDocuments: z.array(z.enum(REQUIRED_DOCUMENTS)).default([]),
  requiredDocumentsOther: z.string().max(500).optional().nullable(),
  equipment: z.array(z.enum(EQUIPMENT)).default([]),
  photoUrls: z
    .array(z.union([z.string().url(), z.string().regex(/^\/uploads\//)]))
    .max(20)
    .default([]),
  status: z.enum(['draft', 'active', 'paused']).default('draft'),
});

export type ListingInput = z.infer<typeof listingInputSchema>;

function parseDate(value: string): Date {
  return value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00.000Z`);
}

export async function createListing(publisherId: string, input: ListingInput) {
  const data = listingInputSchema.parse(input);
  const id = nanoid();
  const slug = seoSlug(data.title);
  const shortCode = generateShortCode();

  const [row] = await db
    .insert(listings)
    .values({
      id,
      slug,
      shortCode,
      publisherId,
      title: data.title,
      status: data.status,
      category: data.category,
      rentType: data.rentType,
      availableFrom: parseDate(data.availableFrom),
      availableTo: data.availableTo ? parseDate(data.availableTo) : null,
      sizeSqm: data.sizeSqm,
      rooms: data.rooms,
      floorLevel: data.floorLevel ?? null,
      onlineViewingAvailable: data.onlineViewingAvailable,
      anmeldungAvailable: data.anmeldungAvailable,
      schufaRequired: data.schufaRequired,
      address: data.address,
      neighborhood: data.neighborhood,
      lat: data.lat,
      lng: data.lng,
      approximateLocation: data.approximateLocation,
      costs: data.costs,
      descriptions: data.descriptions,
      requiredDocuments: data.requiredDocuments,
      equipment: data.equipment,
      photoUrls: data.photoUrls,
      publishedAt: data.status === 'active' ? new Date() : null,
    })
    .returning();

  if (data.status === 'active') {
    const { requestListingModeration } = await import('./moderation-handlers');
    await requestListingModeration(id);
  }

  return row;
}

export async function updateListing(
  listingId: string,
  publisherId: string,
  input: Partial<ListingInput>,
) {
  const existing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.publisherId, publisherId)),
  });
  if (!existing) return null;

  const data = listingInputSchema.partial().parse(input);
  const wasActive = existing.status === 'active';

  const [row] = await db
    .update(listings)
    .set({
      ...('title' in data ? { title: data.title } : {}),
      ...('status' in data ? { status: data.status } : {}),
      ...('category' in data ? { category: data.category } : {}),
      ...('rentType' in data ? { rentType: data.rentType } : {}),
      ...('availableFrom' in data && data.availableFrom
        ? { availableFrom: parseDate(data.availableFrom) }
        : {}),
      ...('availableTo' in data
        ? { availableTo: data.availableTo ? parseDate(data.availableTo) : null }
        : {}),
      ...('sizeSqm' in data ? { sizeSqm: data.sizeSqm } : {}),
      ...('rooms' in data ? { rooms: data.rooms } : {}),
      ...('floorLevel' in data ? { floorLevel: data.floorLevel ?? null } : {}),
      ...('onlineViewingAvailable' in data
        ? { onlineViewingAvailable: data.onlineViewingAvailable }
        : {}),
      ...('anmeldungAvailable' in data ? { anmeldungAvailable: data.anmeldungAvailable } : {}),
      ...('schufaRequired' in data ? { schufaRequired: data.schufaRequired } : {}),
      ...('address' in data ? { address: data.address } : {}),
      ...('neighborhood' in data ? { neighborhood: data.neighborhood } : {}),
      ...('lat' in data ? { lat: data.lat } : {}),
      ...('lng' in data ? { lng: data.lng } : {}),
      ...('approximateLocation' in data ? { approximateLocation: data.approximateLocation } : {}),
      ...('costs' in data ? { costs: data.costs } : {}),
      ...('descriptions' in data ? { descriptions: data.descriptions } : {}),
      ...('requiredDocuments' in data ? { requiredDocuments: data.requiredDocuments } : {}),
      ...('requiredDocumentsOther' in data
        ? { requiredDocumentsOther: data.requiredDocumentsOther?.trim() || null }
        : {}),
      ...('equipment' in data ? { equipment: data.equipment } : {}),
      ...('photoUrls' in data ? { photoUrls: data.photoUrls } : {}),
      ...('status' in data && data.status === 'active' && !existing.publishedAt
        ? { publishedAt: new Date() }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(listings.id, listingId))
    .returning();

  if (row.status === 'active') {
    if (!wasActive) {
      const { requestListingModeration } = await import('./moderation-handlers');
      await requestListingModeration(listingId);
    } else if (row.moderationStatus === 'approved') {
      await indexListing(listingId);
    } else {
      await removeListingFromIndex(listingId);
    }
  } else if (wasActive || row.status === 'paused' || row.status === 'closed') {
    await removeListingFromIndex(listingId);
  }

  return row;
}

export async function closeListing(listingId: string, publisherId: string) {
  const existing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.publisherId, publisherId)),
  });
  if (!existing) return null;
  if (existing.status === 'closed') {
    throw new Error('This listing is already closed.');
  }

  const [row] = await db
    .update(listings)
    .set({ status: 'closed', updatedAt: new Date() })
    .where(eq(listings.id, listingId))
    .returning();

  await removeListingFromIndex(listingId);
  return row;
}

export async function getListingForPublisher(listingId: string, publisherId: string) {
  return db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.publisherId, publisherId)),
  });
}

export async function getListingByPath(pathParam: string) {
  const { shortCode, legacySlug } = parseListingPath(pathParam);

  if (shortCode) {
    const byCode = await db.query.listings.findFirst({ where: eq(listings.shortCode, shortCode) });
    if (byCode) return byCode;
  }

  return db.query.listings.findFirst({ where: eq(listings.slug, legacySlug) });
}

function toListingSummary(row: typeof listings.$inferSelect): ListingSummary {
  return {
    id: row.id,
    slug: row.slug,
    shortCode: row.shortCode,
    path: buildListingPath(row.slug, row.shortCode),
    title: row.title,
    category: row.category,
    rentType: row.rentType,
    rentPerMonth: row.costs.rentPerMonth,
    sizeSqm: row.sizeSqm,
    rooms: row.rooms,
    floorLevel: row.floorLevel,
    neighborhood: row.neighborhood,
    availableFrom: row.availableFrom.toISOString(),
    availableTo: row.availableTo?.toISOString() ?? null,
    anmeldungAvailable: row.anmeldungAvailable,
    schufaRequired: row.schufaRequired,
    onlineViewingAvailable: row.onlineViewingAvailable,
    lat: row.lat,
    lng: row.lng,
    approximateLocation: row.approximateLocation,
    primaryPhotoUrl: row.photoUrls[0] ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getActiveListingsForPublisher(publisherId: string): Promise<ListingSummary[]> {
  const rows = await db.query.listings.findMany({
    where: and(
      eq(listings.publisherId, publisherId),
      eq(listings.status, 'active'),
      eq(listings.moderationStatus, 'approved'),
    ),
    orderBy: [desc(listings.publishedAt), desc(listings.createdAt)],
  });
  return rows.map(toListingSummary);
}
