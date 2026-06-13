export function parseDate(value: string): Date {
  return value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00.000Z`);
}

/** Postgres aggregates often return timestamps as strings, not Date instances. */
export function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
