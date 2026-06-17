import { z } from 'zod';
import {
  BERLIN_NEIGHBORHOODS,
  EQUIPMENT,
  LISTING_CATEGORIES,
  RENT_TYPES,
  REQUIRED_DOCUMENTS,
  FLOOR_LEVEL_VALUES,
} from '../types/listing';

export const listingInputSchema = z.object({
  title: z.string().min(5).max(120),
  category: z.enum(LISTING_CATEGORIES),
  rentType: z.enum(RENT_TYPES),
  availableFrom: z.string().datetime().or(z.string().date()),
  availableTo: z.string().datetime().or(z.string().date()).optional().nullable(),
  sizeSqm: z.number().int().min(5).max(500),
  rooms: z.number().int().min(1).max(20),
  floorLevel: z
    .number()
    .int()
    .refine((value) => FLOOR_LEVEL_VALUES.includes(value as (typeof FLOOR_LEVEL_VALUES)[number]))
    .optional()
    .nullable(),
  onlineViewingAvailable: z.boolean().default(false),
  anmeldungAvailable: z.boolean().default(false),
  schufaRequired: z.boolean().default(false),
  address: z.string().min(5).max(200),
  neighborhood: z.enum(BERLIN_NEIGHBORHOODS),
  lat: z.number().min(52.3).max(52.7),
  lng: z.number().min(13.0).max(13.8),
  approximateLocation: z.boolean().default(false),
  hidePublisherName: z.boolean().default(false),
  hideReviewerNames: z.boolean().default(false),
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
