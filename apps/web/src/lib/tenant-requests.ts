import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '../db';
import { tenantRequests, users } from '../db/schema';
import { BERLIN_NEIGHBORHOODS, LISTING_CATEGORIES, RENT_TYPES } from '../types/listing';
import { HOUSEHOLD_TYPES, NATIONALITIES, SPOKEN_LANGUAGES, type HouseholdType, type TenantRequestFull } from '../types/tenant-request';
import { getUserByHandle, requireUserHandle } from './user-handle';
import {
  isValidHandle,
  normalizeHandle,
  parseAccountHandle,
  seoSlug,
  suggestHandleFromTitle,
} from './urls';

export const tenantRequestInputSchema = z.object({
  title: z.string().min(5).max(120),
  category: z.enum(LISTING_CATEGORIES),
  rentType: z.enum(RENT_TYPES),
  budgetMin: z.number().int().min(0).optional(),
  budgetMax: z.number().int().min(1),
  desiredNeighborhoods: z.array(z.enum(BERLIN_NEIGHBORHOODS)).min(1).max(8),
  availableFrom: z.string().datetime().or(z.string().date()),
  availableTo: z.string().datetime().or(z.string().date()).optional().nullable(),
  sizeMin: z.number().int().min(5).max(500).optional().nullable(),
  roomsMin: z.number().int().min(1).max(20).optional().nullable(),
  anmeldungNeeded: z.boolean().default(false),
  hasSchufa: z.boolean().default(false),
  householdType: z.enum(HOUSEHOLD_TYPES).default('single'),
  monthlyIncome: z.number().int().min(0).optional().nullable(),
  hasPets: z.boolean().default(false),
  nationality: z.enum(NATIONALITIES).optional().nullable(),
  birthYear: z.number().int().min(1920).max(new Date().getFullYear()).optional().nullable(),
  needsBedLinens: z.boolean().default(false),
  occupation: z.string().max(120).optional().nullable(),
  isStudent: z.boolean().default(false),
  isSmoker: z.boolean().default(false),
  spokenLanguages: z.array(z.enum(SPOKEN_LANGUAGES)).max(10).default([]),
  description: z.string().min(20).max(5000),
  photoUrls: z
    .array(z.union([z.string().url(), z.string().regex(/^\/uploads\//)]))
    .max(10)
    .default([]),
  landlordsOnly: z.boolean().default(false),
  status: z.enum(['draft', 'active']).default('active'),
});

export type TenantRequestInput = z.infer<typeof tenantRequestInputSchema>;

export function parseHouseholdTypesParam(params: URLSearchParams): HouseholdType[] | undefined {
  const valid = new Set<string>(HOUSEHOLD_TYPES);
  const values = params.getAll('householdTypes').filter((v): v is HouseholdType => valid.has(v));
  return values.length > 0 ? values : undefined;
}

export function matchesTenantRequestFilters(
  item: {
    category: string;
    rentType: string;
    budgetMin: number;
    budgetMax: number;
    desiredNeighborhoods: string[];
    anmeldungNeeded: boolean;
    hasSchufa: boolean;
    householdType: string;
  },
  filters: TenantRequestFilters,
): boolean {
  if (filters.category && item.category !== filters.category) return false;
  if (filters.rentType && item.rentType !== filters.rentType) return false;
  if (filters.minBudget !== undefined && item.budgetMax < filters.minBudget) return false;
  if (filters.maxBudget !== undefined && item.budgetMax > filters.maxBudget) return false;
  if (filters.anmeldungNeeded && !item.anmeldungNeeded) return false;
  if (filters.hasSchufa && !item.hasSchufa) return false;
  if (filters.neighborhood && !item.desiredNeighborhoods.includes(filters.neighborhood)) return false;
  if (filters.householdTypes?.length && !filters.householdTypes.includes(item.householdType as HouseholdType)) {
    return false;
  }
  return true;
}

export interface TenantRequestFilters {
  category?: (typeof LISTING_CATEGORIES)[number];
  rentType?: (typeof RENT_TYPES)[number];
  neighborhood?: string;
  minBudget?: number;
  maxBudget?: number;
  anmeldungNeeded?: boolean;
  hasSchufa?: boolean;
  householdTypes?: HouseholdType[];
  page?: number;
  limit?: number;
}

function parseDate(value: string): Date {
  return value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00.000Z`);
}

function toFull(
  row: typeof tenantRequests.$inferSelect,
  seeker: { id: string; name: string; image: string | null; handle: string | null },
): TenantRequestFull {
  return {
    id: row.id,
    slug: row.slug,
    handle: seeker.handle ?? '',
    title: row.title,
    category: row.category,
    rentType: row.rentType,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    desiredNeighborhoods: row.desiredNeighborhoods,
    availableFrom: row.availableFrom.toISOString(),
    availableTo: row.availableTo?.toISOString() ?? null,
    sizeMin: row.sizeMin,
    roomsMin: row.roomsMin,
    anmeldungNeeded: row.anmeldungNeeded,
    hasSchufa: row.hasSchufa,
    householdType: row.householdType,
    monthlyIncome: row.monthlyIncome,
    hasPets: row.hasPets,
    nationality: row.nationality,
    birthYear: row.birthYear,
    needsBedLinens: row.needsBedLinens,
    occupation: row.occupation,
    isStudent: row.isStudent,
    isSmoker: row.isSmoker,
    spokenLanguages: row.spokenLanguages,
    description: row.description,
    photoUrls: row.photoUrls,
    landlordsOnly: row.landlordsOnly,
    seekerName: seeker.name,
    seekerImage: seeker.image,
    seekerId: seeker.id,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createTenantRequest(seekerId: string, input: TenantRequestInput) {
  const data = tenantRequestInputSchema.parse(input);
  const budgetMin = data.budgetMin ?? 0;

  await requireUserHandle(seekerId);

  const id = nanoid();
  const slug = `seeker-${seoSlug(data.title)}-${nanoid(6)}`;
  const now = new Date();

  const [row] = await db
    .insert(tenantRequests)
    .values({
      id,
      slug,
      seekerId,
      title: data.title,
      status: data.status,
      category: data.category,
      rentType: data.rentType,
      budgetMin,
      budgetMax: data.budgetMax,
      desiredNeighborhoods: data.desiredNeighborhoods,
      availableFrom: parseDate(data.availableFrom),
      availableTo: data.availableTo ? parseDate(data.availableTo) : null,
      sizeMin: data.sizeMin ?? null,
      roomsMin: data.roomsMin ?? null,
      anmeldungNeeded: data.anmeldungNeeded,
      hasSchufa: data.hasSchufa,
      householdType: data.householdType,
      monthlyIncome: data.monthlyIncome ?? null,
      hasPets: data.hasPets,
      nationality: data.nationality ?? null,
      birthYear: data.birthYear ?? null,
      needsBedLinens: data.needsBedLinens,
      occupation: data.occupation ?? null,
      isStudent: data.isStudent,
      isSmoker: data.isSmoker,
      spokenLanguages: data.spokenLanguages,
      description: data.description,
      photoUrls: data.photoUrls,
      landlordsOnly: data.landlordsOnly,
      publishedAt: data.status === 'active' ? now : null,
      updatedAt: now,
    })
    .returning();

  if (data.status === 'active') {
    const { notifyNewTenantRequest } = await import('./saved-searches');
    notifyNewTenantRequest(id).catch(() => {});
  }

  return row;
}

export async function searchTenantRequests(filters: TenantRequestFilters = {}) {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 12;
  const offset = (page - 1) * limit;

  const conditions = [eq(tenantRequests.status, 'active')];

  if (filters.category) conditions.push(eq(tenantRequests.category, filters.category));
  if (filters.rentType) conditions.push(eq(tenantRequests.rentType, filters.rentType));
  if (filters.minBudget) conditions.push(gte(tenantRequests.budgetMax, filters.minBudget));
  if (filters.maxBudget) conditions.push(lte(tenantRequests.budgetMax, filters.maxBudget));
  if (filters.anmeldungNeeded) conditions.push(eq(tenantRequests.anmeldungNeeded, true));
  if (filters.hasSchufa) conditions.push(eq(tenantRequests.hasSchufa, true));
  if (filters.neighborhood) {
    conditions.push(sql`${tenantRequests.desiredNeighborhoods} @> ${JSON.stringify([filters.neighborhood])}::jsonb`);
  }
  if (filters.householdTypes?.length) {
    conditions.push(inArray(tenantRequests.householdType, filters.householdTypes));
  }

  const where = and(...conditions);

  const rows = await db
    .select({
      request: tenantRequests,
      seekerId: users.id,
      seekerName: users.name,
      seekerImage: users.image,
      seekerHandle: users.handle,
    })
    .from(tenantRequests)
    .innerJoin(users, eq(tenantRequests.seekerId, users.id))
    .where(where)
    .orderBy(desc(tenantRequests.publishedAt), desc(tenantRequests.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tenantRequests)
    .where(where);

  return {
    items: rows
      .filter((r) => r.seekerHandle)
      .map((r) =>
        toFull(r.request, {
          id: r.seekerId,
          name: r.seekerName,
          image: r.seekerImage,
          handle: r.seekerHandle,
        }),
      ),
    total: count,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(count / limit)),
  };
}

async function fetchTenantRequest(
  where: ReturnType<typeof eq>,
): Promise<TenantRequestFull | null> {
  const rows = await db
    .select({
      request: tenantRequests,
      seekerId: users.id,
      seekerName: users.name,
      seekerImage: users.image,
      seekerHandle: users.handle,
    })
    .from(tenantRequests)
    .innerJoin(users, eq(tenantRequests.seekerId, users.id))
    .where(where)
    .limit(1);

  const row = rows[0];
  if (!row || !row.seekerHandle) return null;

  return toFull(row.request, {
    id: row.seekerId,
    name: row.seekerName,
    image: row.seekerImage,
    handle: row.seekerHandle,
  });
}

export async function getActiveTenantRequestForUser(userId: string): Promise<TenantRequestFull | null> {
  const rows = await db
    .select({
      request: tenantRequests,
      seekerId: users.id,
      seekerName: users.name,
      seekerImage: users.image,
      seekerHandle: users.handle,
    })
    .from(tenantRequests)
    .innerJoin(users, eq(tenantRequests.seekerId, users.id))
    .where(and(eq(tenantRequests.seekerId, userId), eq(tenantRequests.status, 'active')))
    .orderBy(desc(tenantRequests.updatedAt))
    .limit(1);

  const row = rows[0];
  if (!row || !row.seekerHandle) return null;

  return toFull(row.request, {
    id: row.seekerId,
    name: row.seekerName,
    image: row.seekerImage,
    handle: row.seekerHandle,
  });
}

export async function getTenantRequestByHandle(param: string): Promise<TenantRequestFull | null> {
  const handle = parseAccountHandle(param);
  const user = await getUserByHandle(handle);
  if (user) {
    return getActiveTenantRequestForUser(user.id);
  }

  return fetchTenantRequest(eq(tenantRequests.slug, param));
}

/** @deprecated Use getTenantRequestByHandle */
export async function getTenantRequestBySlug(slug: string): Promise<TenantRequestFull | null> {
  return getTenantRequestByHandle(slug);
}

export { suggestHandleFromTitle, normalizeHandle, isValidHandle };
