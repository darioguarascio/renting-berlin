export const LISTING_TABLE_COLUMNS = [
  { id: 'title', label: 'Title', default: true, required: true },
  { id: 'neighborhood', label: 'Neighborhood', default: true },
  { id: 'category', label: 'Category', default: true },
  { id: 'rentType', label: 'Rent type', default: true },
  { id: 'rentPerMonth', label: 'Rent (€/mo)', default: true },
  { id: 'sizeSqm', label: 'Size (m²)', default: true },
  { id: 'rooms', label: 'Rooms', default: true },
  { id: 'availableFrom', label: 'Available from', default: true },
  { id: 'availableTo', label: 'Available to', default: false },
  { id: 'anmeldungAvailable', label: 'Anmeldung', default: false },
  { id: 'schufaRequired', label: 'SCHUFA', default: false },
  { id: 'onlineViewingAvailable', label: 'Online viewing', default: false },
  { id: 'createdAt', label: 'Listed', default: false },
] as const;

export type ListingTableColumnId = (typeof LISTING_TABLE_COLUMNS)[number]['id'];

const STORAGE_KEY = 'offers-table-columns';

const DEFAULT_COLUMN_IDS = LISTING_TABLE_COLUMNS.filter((c) => c.default).map((c) => c.id);
const REQUIRED_IDS = new Set(
  LISTING_TABLE_COLUMNS.filter((c) => c.required).map((c) => c.id),
);
const VALID_IDS = new Set(LISTING_TABLE_COLUMNS.map((c) => c.id));

export function getDefaultTableColumns(): ListingTableColumnId[] {
  return [...DEFAULT_COLUMN_IDS];
}

export function loadTableColumns(): ListingTableColumnId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultTableColumns();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return getDefaultTableColumns();
    const valid = parsed.filter((id): id is ListingTableColumnId =>
      VALID_IDS.has(id as ListingTableColumnId),
    );
    for (const required of REQUIRED_IDS) {
      if (!valid.includes(required)) valid.unshift(required);
    }
    return valid.length > 0 ? valid : getDefaultTableColumns();
  } catch {
    return getDefaultTableColumns();
  }
}

export function saveTableColumns(columns: ListingTableColumnId[]) {
  const withRequired = [...columns];
  for (const required of REQUIRED_IDS) {
    if (!withRequired.includes(required)) withRequired.unshift(required);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withRequired));
}
