export const LISTING_CATEGORIES = ['full_flat', 'shared_room', 'swap'] as const;
export const RENT_TYPES = ['long_term', 'short_term', 'overnight'] as const;
export const LISTING_STATUSES = ['draft', 'active', 'paused', 'closed'] as const;
export const LISTING_SOURCES = ['native', 'external'] as const;

export const REQUIRED_DOCUMENTS = [
  'schufa',
  'passport',
  'proof_of_income',
  'tenant_self_disclosure',
  'cert_of_enrollment',
  'guarantee',
  'parental_guarantee',
  'household_contents_insurance',
  'liability_insurance',
  'loss_of_rent_insurance',
] as const;

export const EQUIPMENT = [
  'furnished',
  'partly_furnished',
  'bathroom_bath',
  'shower',
  'fitted_kitchen',
  'tv',
  'washing_machine',
  'dishwasher',
  'terrace',
  'balcony',
  'garden',
  'shared_garden',
  'basement',
  'elevator',
  'pets_welcome',
  'bike_storage',
  'other',
] as const;

export type ListingCategory = (typeof LISTING_CATEGORIES)[number];
export type RentType = (typeof RENT_TYPES)[number];
export type ListingStatus = (typeof LISTING_STATUSES)[number];
export type ListingSource = (typeof LISTING_SOURCES)[number];
export type RequiredDocument = (typeof REQUIRED_DOCUMENTS)[number];
export type Equipment = (typeof EQUIPMENT)[number];

export interface ListingCosts {
  rentPerMonth: number;
  utilities?: number;
  deposit?: number;
  equipmentFee?: number;
  other?: number;
}

export interface ListingDescriptions {
  apartment?: string;
  location?: string;
  misc?: string;
}

export interface ListingSearchFilters {
  q?: string;
  category?: ListingCategory;
  rentType?: RentType;
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;
  maxSize?: number;
  minRooms?: number;
  maxRooms?: number;
  availableFrom?: string;
  availableTo?: string;
  anmeldungAvailable?: boolean;
  schufaRequired?: boolean;
  neighborhood?: string;
  page?: number;
  limit?: number;
  sort?: 'updated';
}

export interface ListingSummary {
  id: string;
  slug: string;
  shortCode: string;
  /** Public URL segment: `{seo-slug}--{shortCode}` */
  path: string;
  title: string;
  category: ListingCategory;
  rentType: RentType;
  rentPerMonth: number;
  sizeSqm: number;
  rooms: number;
  floorLevel: FloorLevel | null;
  neighborhood: string;
  availableFrom: string;
  availableTo: string | null;
  anmeldungAvailable: boolean;
  schufaRequired: boolean;
  onlineViewingAvailable: boolean;
  lat: number;
  lng: number;
  approximateLocation: boolean;
  primaryPhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListingDetail extends ListingSummary {
  address: string;
  descriptions: ListingDescriptions;
  costs: ListingCosts;
  requiredDocuments: RequiredDocument[];
  requiredDocumentsOther: string | null;
  equipment: Equipment[];
  photoUrls: string[];
  publisherId: string;
  publisherName: string;
  sourceType: ListingSource;
  externalUrl: string | null;
  externalProvider: string | null;
}

export interface SearchResult {
  items: ListingSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const BERLIN_NEIGHBORHOODS = [
  'mitte',
  'kreuzberg',
  'neukolln',
  'friedrichshain',
  'prenzlauer-berg',
  'charlottenburg',
  'schoneberg',
  'tempelhof',
  'wedding',
  'pankow',
  'lichtenberg',
  'treptow',
  'steglitz',
  'zehlendorf',
  'spandau',
  'reinickendorf',
  'marzahn',
  'hellersdorf',
  'koepenick',
] as const;

export type BerlinNeighborhood = (typeof BERLIN_NEIGHBORHOODS)[number];

export const NEIGHBORHOOD_LABELS: Record<BerlinNeighborhood, string> = {
  mitte: 'Mitte',
  kreuzberg: 'Kreuzberg',
  neukolln: 'Neukölln',
  friedrichshain: 'Friedrichshain',
  'prenzlauer-berg': 'Prenzlauer Berg',
  charlottenburg: 'Charlottenburg',
  schoneberg: 'Schöneberg',
  tempelhof: 'Tempelhof',
  wedding: 'Wedding',
  pankow: 'Pankow',
  lichtenberg: 'Lichtenberg',
  treptow: 'Treptow',
  steglitz: 'Steglitz',
  zehlendorf: 'Zehlendorf',
  spandau: 'Spandau',
  reinickendorf: 'Reinickendorf',
  marzahn: 'Marzahn',
  hellersdorf: 'Hellersdorf',
  koepenick: 'Köpenick',
};

/** Berlin neighborhoods sorted alphabetically by display label (for selects and checkboxes). */
export const BERLIN_NEIGHBORHOODS_SORTED: BerlinNeighborhood[] = [...BERLIN_NEIGHBORHOODS].sort((a, b) =>
  NEIGHBORHOOD_LABELS[a].localeCompare(NEIGHBORHOOD_LABELS[b], 'de'),
);

export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  full_flat: 'Full flat',
  shared_room: 'Shared room',
  swap: 'Swap',
};

export const RENT_TYPE_LABELS: Record<RentType, string> = {
  long_term: 'Long term',
  short_term: 'Short term',
  overnight: 'Overnight',
};

export const FLOOR_LEVEL_OPTIONS = [
  { value: 8, label: 'Cellar' },
  { value: 9, label: 'Basement' },
  { value: 1, label: 'Ground floor' },
  { value: 10, label: 'Raised ground floor / Mezzanine' },
  { value: 2, label: '1st floor' },
  { value: 3, label: '2nd floor' },
  { value: 4, label: '3rd floor' },
  { value: 5, label: '4th floor' },
  { value: 6, label: '5th floor' },
  { value: 7, label: 'Higher than the 5th floor' },
  { value: 11, label: 'Loft / Attic' },
] as const;

export type FloorLevel = (typeof FLOOR_LEVEL_OPTIONS)[number]['value'];

export const FLOOR_LEVEL_VALUES = FLOOR_LEVEL_OPTIONS.map((option) => option.value);

export function floorLevelLabel(value: FloorLevel | null | undefined): string | null {
  if (value == null) return null;
  return FLOOR_LEVEL_OPTIONS.find((option) => option.value === value)?.label ?? null;
}

export const DOCUMENT_LABELS: Record<RequiredDocument, string> = {
  schufa: 'SCHUFA',
  passport: 'Passport / ID',
  proof_of_income: 'Proof of income',
  tenant_self_disclosure: 'Tenant self-disclosure',
  cert_of_enrollment: 'Certificate of enrollment',
  guarantee: 'Guarantee',
  parental_guarantee: 'Parental guarantee',
  household_contents_insurance: 'Household contents insurance',
  liability_insurance: 'Liability insurance',
  loss_of_rent_insurance: 'Loss of rent insurance',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  furnished: 'Furnished',
  partly_furnished: 'Partly furnished',
  bathroom_bath: 'Bath',
  shower: 'Shower',
  fitted_kitchen: 'Fitted kitchen',
  tv: 'TV',
  washing_machine: 'Washing machine',
  dishwasher: 'Dishwasher',
  terrace: 'Terrace',
  balcony: 'Balcony',
  garden: 'Garden',
  shared_garden: 'Shared garden',
  basement: 'Basement',
  elevator: 'Elevator',
  pets_welcome: 'Pets welcome',
  bike_storage: 'Bike storage',
  other: 'Other',
};

export interface ConversationOtherUser {
  id: string;
  name: string;
  image: string | null;
  handle: string | null;
  profileHref: string | null;
  hasSeekerProfile: boolean;
  activeListingCount: number;
}

export interface ConversationSummary {
  id: string;
  contextKind: 'listing' | 'seeker';
  listing: {
    id: string;
    title: string;
    href: string;
    photoUrl: string | null;
  } | null;
  seekerProfile: {
    id: string;
    title: string;
    href: string;
  } | null;
  otherUserName: string;
  otherUserImage: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  updatedAt: string;
}
