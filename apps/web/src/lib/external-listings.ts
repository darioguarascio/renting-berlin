import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  BERLIN_NEIGHBORHOODS,
  EQUIPMENT,
  LISTING_CATEGORIES,
  RENT_TYPES,
  REQUIRED_DOCUMENTS,
} from '../types/listing';

export const EXTERNAL_PUBLISHER = {
  email: 'external@renting.berlin',
  name: 'External listings',
  handle: 'external-listings',
} as const;

export const EXTERNAL_PROVIDER_LABELS: Record<string, string> = {
  immoscout: 'ImmoScout24',
  immowelt: 'Immowelt',
  immonet: 'Immonet',
  kleinanzeigen: 'eBay Kleinanzeigen',
  wggesucht: 'WG-Gesucht',
  'wg-gesucht': 'WG-Gesucht',
};

export function externalProviderLabel(provider: string | null | undefined): string {
  if (!provider) return 'original site';
  return EXTERNAL_PROVIDER_LABELS[provider] ?? provider;
}

export const externalListingImportSchema = z.object({
  externalProvider: z.string().min(1),
  externalSourceId: z.string().min(1),
  externalUrl: z.string().url(),
  title: z.string().min(5).max(120),
  category: z.enum(LISTING_CATEGORIES),
  rentType: z.enum(RENT_TYPES),
  availableFrom: z.string().date(),
  availableTo: z.string().date().nullable().optional(),
  sizeSqm: z.number().int().min(5).max(500),
  rooms: z.number().int().min(1).max(20),
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
  equipment: z.array(z.enum(EQUIPMENT)).default([]),
  photoUrls: z.array(z.string().url()).max(20).default([]),
  status: z.enum(['draft', 'active', 'paused']).default('active'),
});

export type ExternalListingImport = z.infer<typeof externalListingImportSchema>;

export const externalListingExportSchema = z.object({
  convertedAt: z.string().optional(),
  sourceExport: z.string().optional(),
  count: z.number().optional(),
  skipped: z.number().optional(),
  listings: z.array(externalListingImportSchema),
});

export type ExternalListingExport = z.infer<typeof externalListingExportSchema>;

export function defaultExternalExportPath(): string {
  if (process.env.FREDY_EXPORT_PATH) {
    return process.env.FREDY_EXPORT_PATH;
  }
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
  return path.join(repoRoot, '.local/fredy/export/listings.json');
}
