export const REQUEST_TABLE_COLUMNS = [
  { id: 'handle', label: 'Profile', default: true, required: true },
  { id: 'title', label: 'Title', default: false },
  { id: 'category', label: 'Looking for', default: true },
  { id: 'rentType', label: 'Rent type', default: true },
  { id: 'budget', label: 'Budget (€/mo)', default: true },
  { id: 'neighborhoods', label: 'Areas', default: true },
  { id: 'householdType', label: 'Household', default: true },
  { id: 'availableFrom', label: 'Available from', default: true },
  { id: 'availableTo', label: 'Available to', default: false },
  { id: 'anmeldungNeeded', label: 'Anmeldung', default: false },
  { id: 'hasSchufa', label: 'SCHUFA', default: false },
  { id: 'isStudent', label: 'Student', default: false },
  { id: 'hasPets', label: 'Pets', default: false },
  { id: 'landlordsOnly', label: 'Landlords only', default: false },
  { id: 'createdAt', label: 'Posted', default: false },
] as const;

export type RequestTableColumnId = (typeof REQUEST_TABLE_COLUMNS)[number]['id'];

const STORAGE_KEY = 'requests-table-columns';

const DEFAULT_COLUMN_IDS = REQUEST_TABLE_COLUMNS.filter((c) => c.default).map((c) => c.id);
const REQUIRED_IDS = new Set(REQUEST_TABLE_COLUMNS.filter((c) => c.required).map((c) => c.id));
const VALID_IDS = new Set(REQUEST_TABLE_COLUMNS.map((c) => c.id));

export function getDefaultRequestTableColumns(): RequestTableColumnId[] {
  return [...DEFAULT_COLUMN_IDS];
}

export function loadRequestTableColumns(): RequestTableColumnId[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultRequestTableColumns();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return getDefaultRequestTableColumns();
    const valid = parsed.filter((id): id is RequestTableColumnId =>
      VALID_IDS.has(id as RequestTableColumnId),
    );
    for (const required of REQUIRED_IDS) {
      if (!valid.includes(required)) valid.unshift(required);
    }
    return valid.length > 0 ? valid : getDefaultRequestTableColumns();
  } catch {
    return getDefaultRequestTableColumns();
  }
}

export function saveRequestTableColumns(columns: RequestTableColumnId[]) {
  const withRequired = [...columns];
  for (const required of REQUIRED_IDS) {
    if (!withRequired.includes(required)) withRequired.unshift(required);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withRequired));
}
