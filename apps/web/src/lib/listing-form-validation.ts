import { z } from 'zod';
import { listingInputSchema, type ListingInput } from './listing-input-schema';

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  address: 'Address',
  category: 'Category',
  rentType: 'Rent type',
  availableFrom: 'Available from',
  availableTo: 'Available until',
  sizeSqm: 'Size',
  rooms: 'Rooms',
  floorLevel: 'Floor',
  neighborhood: 'Neighborhood',
  lat: 'Latitude',
  lng: 'Longitude',
  costs: 'Costs',
  descriptions: 'Description',
  requiredDocumentsOther: 'Other requirements',
  photoUrls: 'Photos',
  status: 'Status',
};

function fieldLabel(path: (string | number)[]): string {
  const root = String(path[0] ?? 'field');
  if (root === 'costs' && path[1]) {
    return `Rent / costs (${String(path[1])})`;
  }
  if (root === 'descriptions' && path[1]) {
    return `Description (${String(path[1])})`;
  }
  return FIELD_LABELS[root] ?? root;
}

export function listingValidationMessage(issue: z.core.$ZodIssue): string {
  const label = fieldLabel(issue.path);

  switch (issue.code) {
    case 'too_small':
      if (issue.origin === 'string') {
        return `${label} must be at least ${issue.minimum} characters`;
      }
      if (issue.origin === 'number') {
        return `${label} must be at least ${issue.minimum}`;
      }
      if (issue.origin === 'array') {
        return `${label} must include at least ${issue.minimum} item(s)`;
      }
      break;
    case 'too_big':
      if (issue.origin === 'string') {
        return `${label} must be at most ${issue.maximum} characters`;
      }
      if (issue.origin === 'number') {
        return `${label} must be at most ${issue.maximum}`;
      }
      break;
    case 'invalid_format':
      if (issue.format === 'url') {
        return `${label} must be a valid URL`;
      }
      break;
    default:
      break;
  }

  return issue.message;
}

export type ListingFieldErrors = Partial<Record<string, string>>;

export function listingFieldKey(path: (string | number)[]): string {
  if (path[0] === 'costs' && path[1]) return `costs.${String(path[1])}`;
  if (path[0] === 'descriptions' && path[1]) return `descriptions.${String(path[1])}`;
  return String(path[0] ?? 'form');
}

export function validateListingPayload(
  payload: unknown,
  options: { partial?: boolean } = {},
):
  | { success: true; data: Partial<ListingInput> | ListingInput }
  | { success: false; fieldErrors: ListingFieldErrors; message: string } {
  const schema = options.partial ? listingInputSchema.partial() : listingInputSchema;
  const result = schema.safeParse(payload);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: ListingFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = listingFieldKey(issue.path);
    if (!fieldErrors[key]) {
      fieldErrors[key] = listingValidationMessage(issue);
    }
  }

  const message = Object.values(fieldErrors).join('. ');
  return { success: false, fieldErrors, message };
}

export function pickValidListingPatch(payload: Record<string, unknown>): Record<string, unknown> {
  const result = listingInputSchema.partial().safeParse(payload);
  if (result.success) {
    return payload;
  }

  const invalidKeys = new Set(result.error.issues.map((issue) => String(issue.path[0])));
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!invalidKeys.has(key)) {
      patch[key] = value;
    }
  }
  return patch;
}

export function formatListingApiError(body: string): string {
  const trimmed = body.trim();
  if (!trimmed.startsWith('[')) {
    return trimmed;
  }

  try {
    const parsed = JSON.parse(trimmed) as z.core.$ZodIssue[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return trimmed;
    }
    return parsed.map((issue) => listingValidationMessage(issue)).join('. ');
  } catch {
    return trimmed;
  }
}
