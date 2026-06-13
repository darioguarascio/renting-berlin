import type { ListingCategory, RentType, ListingStatus } from './listing';
import { NEIGHBORHOOD_LABELS } from './listing';

export const HOUSEHOLD_TYPES = ['single', 'couple', 'family_1_kid', 'family_2_kids', 'family_3_plus_kids'] as const;
export type HouseholdType = (typeof HOUSEHOLD_TYPES)[number];

export const SPOKEN_LANGUAGES = [
  'english',
  'german',
  'french',
  'spanish',
  'italian',
  'polish',
  'turkish',
  'arabic',
  'portuguese',
  'russian',
  'chinese',
  'dutch',
  'hindi',
  'other',
] as const;

export const HOUSEHOLD_LABELS: Record<HouseholdType, string> = {
  single: 'Single',
  couple: 'Couple',
  family_1_kid: 'Family (1 kid)',
  family_2_kids: 'Family (2 kids)',
  family_3_plus_kids: 'Family (3+ kids)',
};

export const NATIONALITIES = [
  'DE', 'AT', 'CH', 'IT', 'FR', 'ES', 'PT', 'NL', 'BE', 'LU',
  'PL', 'CZ', 'RO', 'BG', 'HU', 'SK', 'HR', 'GR', 'SE', 'NO', 'DK', 'FI', 'IE', 'GB',
  'TR', 'UA', 'RU', 'US', 'CA', 'AU', 'NZ', 'IN', 'CN', 'JP', 'KR', 'BR', 'AR', 'MX', 'CO',
  'IL', 'EG', 'MA', 'TN', 'NG', 'ZA', 'AE', 'IR', 'PK', 'BD', 'VN', 'TH', 'PH', 'ID', 'MY', 'SG',
  'OTHER',
] as const;

export type Nationality = (typeof NATIONALITIES)[number];

export const NATIONALITY_LABELS: Record<Nationality, string> = {
  DE: 'German',
  AT: 'Austrian',
  CH: 'Swiss',
  IT: 'Italian',
  FR: 'French',
  ES: 'Spanish',
  PT: 'Portuguese',
  NL: 'Dutch',
  BE: 'Belgian',
  LU: 'Luxembourgish',
  PL: 'Polish',
  CZ: 'Czech',
  RO: 'Romanian',
  BG: 'Bulgarian',
  HU: 'Hungarian',
  SK: 'Slovak',
  HR: 'Croatian',
  GR: 'Greek',
  SE: 'Swedish',
  NO: 'Norwegian',
  DK: 'Danish',
  FI: 'Finnish',
  IE: 'Irish',
  GB: 'British',
  TR: 'Turkish',
  UA: 'Ukrainian',
  RU: 'Russian',
  US: 'American',
  CA: 'Canadian',
  AU: 'Australian',
  NZ: 'New Zealander',
  IN: 'Indian',
  CN: 'Chinese',
  JP: 'Japanese',
  KR: 'South Korean',
  BR: 'Brazilian',
  AR: 'Argentine',
  MX: 'Mexican',
  CO: 'Colombian',
  IL: 'Israeli',
  EG: 'Egyptian',
  MA: 'Moroccan',
  TN: 'Tunisian',
  NG: 'Nigerian',
  ZA: 'South African',
  AE: 'Emirati',
  IR: 'Iranian',
  PK: 'Pakistani',
  BD: 'Bangladeshi',
  VN: 'Vietnamese',
  TH: 'Thai',
  PH: 'Filipino',
  ID: 'Indonesian',
  MY: 'Malaysian',
  SG: 'Singaporean',
  OTHER: 'Other',
};

/** Nationality options sorted by display label (for dropdowns). */
export const NATIONALITY_OPTIONS = [...NATIONALITIES].sort((a, b) =>
  NATIONALITY_LABELS[a].localeCompare(NATIONALITY_LABELS[b]),
);

export const LANGUAGE_LABELS: Record<(typeof SPOKEN_LANGUAGES)[number], string> = {
  english: 'English',
  german: 'German',
  french: 'French',
  spanish: 'Spanish',
  italian: 'Italian',
  polish: 'Polish',
  turkish: 'Turkish',
  arabic: 'Arabic',
  portuguese: 'Portuguese',
  russian: 'Russian',
  chinese: 'Chinese',
  dutch: 'Dutch',
  hindi: 'Hindi',
  other: 'Other',
};

export interface TenantRequestFull {
  id: string;
  slug: string;
  handle: string;
  title: string;
  category: ListingCategory;
  rentType: RentType;
  budgetMin: number;
  budgetMax: number;
  desiredNeighborhoods: string[];
  availableFrom: string;
  availableTo: string | null;
  sizeMin: number | null;
  roomsMin: number | null;
  anmeldungNeeded: boolean;
  hasSchufa: boolean;
  householdType: HouseholdType;
  monthlyIncome: number | null;
  hasPets: boolean;
  nationality: Nationality | null;
  birthYear: number | null;
  needsBedLinens: boolean;
  occupation: string | null;
  isStudent: boolean;
  isSmoker: boolean;
  spokenLanguages: string[];
  description: string;
  photoUrls: string[];
  landlordsOnly: boolean;
  seekerName: string;
  seekerImage: string | null;
  seekerId: string;
  status: ListingStatus;
  createdAt: string;
}

export type TenantRequestSummary = Omit<TenantRequestFull, 'seekerId' | 'status'>;

export interface TenantRequestPublic {
  id: string;
  handle: string;
  title: string;
  category: ListingCategory;
  rentType: RentType;
  budgetMin: number;
  budgetMax: number;
  areaCount: number;
  availableFrom: string;
  anmeldungNeeded: boolean;
  hasSchufa: boolean;
  householdType: HouseholdType;
  isStudent: boolean;
}

export interface ProfileVisitor {
  viewerId: string;
  viewerName: string;
  viewerImage: string | null;
  viewerHandle: string | null;
  firstViewedAt: string;
  lastViewedAt: string;
}

export function formatNeighborhoodList(slugs: string[]): string {
  if (slugs.length === 0) return 'Anywhere in Berlin';
  return slugs
    .map((s) => NEIGHBORHOOD_LABELS[s as keyof typeof NEIGHBORHOOD_LABELS] ?? s.replace(/-/g, ' '))
    .join(', ');
}

export function formatBudget(amount: number): string {
  return new Intl.NumberFormat('en-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export function formatIncome(amount: number): string {
  return new Intl.NumberFormat('en-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export function formatLanguageList(codes: string[]): string {
  if (codes.length === 0) return '—';
  return codes.map((c) => LANGUAGE_LABELS[c as keyof typeof LANGUAGE_LABELS] ?? c).join(', ');
}

export function formatNationality(code: string | null): string {
  if (!code) return '—';
  return NATIONALITY_LABELS[code as Nationality] ?? code;
}

export function toPublicProfile(profile: TenantRequestFull): TenantRequestPublic {
  return {
    id: profile.id,
    handle: profile.handle,
    title: profile.title,
    category: profile.category,
    rentType: profile.rentType,
    budgetMin: profile.budgetMin,
    budgetMax: profile.budgetMax,
    areaCount: profile.desiredNeighborhoods.length,
    availableFrom: profile.availableFrom,
    anmeldungNeeded: profile.anmeldungNeeded,
    hasSchufa: profile.hasSchufa,
    householdType: profile.householdType,
    isStudent: profile.isStudent,
  };
}

export type { ListingCategory, RentType, ListingStatus };
