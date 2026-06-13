import {
  CATEGORY_LABELS,
  LISTING_CATEGORIES,
  RENT_TYPE_LABELS,
  RENT_TYPES,
  type ListingCategory,
  type RentType,
} from '../types/listing';

export interface NeighborhoodListingStats {
  neighborhood: string;
  totalListings: number;
  rent: {
    min: number | null;
    max: number | null;
    median: number | null;
    average: number | null;
  };
  size: {
    averageSqm: number | null;
    averageRooms: number | null;
  };
  byCategory: Record<ListingCategory, number>;
  byRentType: Record<RentType, number>;
  anmeldungAvailableCount: number;
  noSchufaCount: number;
  onlineViewingCount: number;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function emptyCategoryCounts(): Record<ListingCategory, number> {
  return Object.fromEntries(LISTING_CATEGORIES.map((c) => [c, 0])) as Record<ListingCategory, number>;
}

function emptyRentTypeCounts(): Record<RentType, number> {
  return Object.fromEntries(RENT_TYPES.map((t) => [t, 0])) as Record<RentType, number>;
}

export function buildNeighborhoodStatsFromRows(
  neighborhood: string,
  rows: Array<{
    category: ListingCategory;
    rentType: RentType;
    sizeSqm: number;
    rooms: number;
    anmeldungAvailable: boolean;
    schufaRequired: boolean;
    onlineViewingAvailable: boolean;
    costs: { rentPerMonth: number };
  }>,
): NeighborhoodListingStats {
  const rents = rows.map((row) => row.costs.rentPerMonth);
  const byCategory = emptyCategoryCounts();
  const byRentType = emptyRentTypeCounts();

  let anmeldungAvailableCount = 0;
  let noSchufaCount = 0;
  let onlineViewingCount = 0;

  for (const row of rows) {
    byCategory[row.category] += 1;
    byRentType[row.rentType] += 1;
    if (row.anmeldungAvailable) anmeldungAvailableCount += 1;
    if (!row.schufaRequired) noSchufaCount += 1;
    if (row.onlineViewingAvailable) onlineViewingCount += 1;
  }

  return {
    neighborhood,
    totalListings: rows.length,
    rent: {
      min: rents.length > 0 ? Math.min(...rents) : null,
      max: rents.length > 0 ? Math.max(...rents) : null,
      median: median(rents),
      average: average(rents),
    },
    size: {
      averageSqm: average(rows.map((row) => row.sizeSqm)),
      averageRooms: average(rows.map((row) => row.rooms)),
    },
    byCategory,
    byRentType,
    anmeldungAvailableCount,
    noSchufaCount,
    onlineViewingCount,
  };
}

export function buildNeighborhoodSeoDescription(
  label: string,
  stats: NeighborhoodListingStats,
): string {
  if (stats.totalListings === 0) {
    return `Rent in ${label}, Berlin on renting.berlin. Browse verified listings from international-friendly landlords — sign up free to search apartments and rooms.`;
  }

  const parts = [`${stats.totalListings} active rental${stats.totalListings === 1 ? '' : 's'} in ${label}, Berlin`];
  if (stats.rent.median != null) {
    parts.push(`median rent around €${stats.rent.median}/mo`);
  }
  if (stats.rent.min != null && stats.rent.max != null) {
    parts.push(`range €${stats.rent.min}–€${stats.rent.max}`);
  }
  parts.push('Sign up free to browse live listings with photos and contact landlords.');
  return parts.join('. ') + '.';
}

export function formatStatPercent(count: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

export { CATEGORY_LABELS, RENT_TYPE_LABELS };
