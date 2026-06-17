import { readFileSync } from 'node:fs';
import path from 'node:path';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { closeDb, db } from '../db';
import { listings, users } from '../db/schema';
import {
  EXTERNAL_PUBLISHER,
  externalListingExportSchema,
  type ExternalListingImport,
} from '../lib/external-listings';
import { indexListing } from '../lib/search';
import { enqueueTelegramJob } from '../lib/telegram-events';
import { setUserHandle } from '../lib/user-handle';
import { generateShortCode, seoSlug } from '../lib/urls';

function parseDate(value: string): Date {
  return value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00.000Z`);
}

function resolveExportPath(): string {
  const fileFlagIndex = process.argv.indexOf('--file');
  if (fileFlagIndex !== -1) {
    const fromCli = process.argv[fileFlagIndex + 1];
    if (!fromCli || fromCli.startsWith('-')) {
      throw new Error('Missing path after --file');
    }
    return path.isAbsolute(fromCli) ? fromCli : path.resolve(process.cwd(), fromCli);
  }

  if (process.env.EXTERNAL_LISTINGS_EXPORT_PATH) {
    return path.isAbsolute(process.env.EXTERNAL_LISTINGS_EXPORT_PATH)
      ? process.env.EXTERNAL_LISTINGS_EXPORT_PATH
      : path.resolve(process.cwd(), process.env.EXTERNAL_LISTINGS_EXPORT_PATH);
  }

  throw new Error(
    'Export file required. Pass --file <path> or set EXTERNAL_LISTINGS_EXPORT_PATH. ' +
      'Run the import locally against the target DATABASE_URL (e.g. from an external exporter on another host).',
  );
}

function describeDatabaseTarget(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'unknown (DATABASE_URL not set)';
  try {
    const normalized = url.replace(/^postgres:/, 'postgresql:');
    const parsed = new URL(normalized);
    const db = parsed.pathname.replace(/^\//, '') || 'postgres';
    return `${parsed.hostname}:${parsed.port || '5432'}/${db}`;
  } catch {
    return 'unknown (invalid DATABASE_URL)';
  }
}

async function ensureExternalPublisher(): Promise<string> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, EXTERNAL_PUBLISHER.email),
    columns: { id: true, handle: true },
  });

  if (existing) {
    if (!existing.handle) {
      await setUserHandle(existing.id, EXTERNAL_PUBLISHER.handle);
    }
    return existing.id;
  }

  const id = nanoid();
  await db.insert(users).values({
    id,
    name: EXTERNAL_PUBLISHER.name,
    email: EXTERNAL_PUBLISHER.email,
    emailVerified: false,
  });
  await setUserHandle(id, EXTERNAL_PUBLISHER.handle);
  return id;
}

async function upsertExternalListing(publisherId: string, item: ExternalListingImport): Promise<'inserted' | 'updated'> {
  const existing = await db.query.listings.findFirst({
    where: and(
      eq(listings.externalProvider, item.externalProvider),
      eq(listings.externalSourceId, item.externalSourceId),
    ),
  });

  const now = new Date();
  const values = {
    publisherId,
    title: item.title,
    status: item.status,
    category: item.category,
    rentType: item.rentType,
    availableFrom: parseDate(item.availableFrom),
    availableTo: item.availableTo ? parseDate(item.availableTo) : null,
    sizeSqm: item.sizeSqm,
    rooms: item.rooms,
    onlineViewingAvailable: item.onlineViewingAvailable,
    anmeldungAvailable: item.anmeldungAvailable,
    schufaRequired: item.schufaRequired,
    address: item.address,
    neighborhood: item.neighborhood,
    lat: item.lat,
    lng: item.lng,
    approximateLocation: item.approximateLocation,
    costs: item.costs,
    descriptions: item.descriptions,
    requiredDocuments: item.requiredDocuments,
    equipment: item.equipment,
    photoUrls: item.photoUrls,
    sourceType: 'external' as const,
    externalUrl: item.externalUrl,
    externalProvider: item.externalProvider,
    externalSourceId: item.externalSourceId,
    externalSyncedAt: now,
    moderationStatus: 'approved' as const,
    publishedAt: now,
    updatedAt: now,
  };

  if (existing) {
    await db.update(listings).set(values).where(eq(listings.id, existing.id));
    await indexListing(existing.id);
    return 'updated';
  }

  const id = nanoid();
  const slug = seoSlug(item.title);
  const shortCode = generateShortCode();

  await db.insert(listings).values({
    id,
    slug,
    shortCode,
    ...values,
  });
  await indexListing(id);
  await enqueueTelegramJob('new_listing', id);
  return 'inserted';
}

async function importExternalListings() {
  const exportPath = resolveExportPath();
  const dryRun = process.argv.includes('--dry-run');
  const target = describeDatabaseTarget();

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(exportPath, 'utf8'));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot read export at ${exportPath}: ${message}`);
  }

  const parsed = externalListingExportSchema.parse(raw);
  if (parsed.listings.length === 0) {
    console.log(`No listings in ${exportPath}`);
    return;
  }

  if (dryRun) {
    console.log(`Dry run: would import ${parsed.listings.length} listings from ${exportPath}`);
    console.log(`Target database: ${target}`);
    for (const item of parsed.listings.slice(0, 5)) {
      console.log(`  - [${item.externalProvider}] ${item.title}`);
    }
    if (parsed.listings.length > 5) {
      console.log(`  ... and ${parsed.listings.length - 5} more`);
    }
    return;
  }

  console.log(`Importing into ${target}`);

  const publisherId = await ensureExternalPublisher();
  let inserted = 0;
  let updated = 0;

  for (const item of parsed.listings) {
    const result = await upsertExternalListing(publisherId, item);
    if (result === 'inserted') inserted += 1;
    else updated += 1;
  }

  console.log(
    `Imported ${parsed.listings.length} external listings from ${exportPath} (${inserted} new, ${updated} updated)`,
  );
}

importExternalListings()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDb();
  });
