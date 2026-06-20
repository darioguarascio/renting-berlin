import { EMAIL_BRAND } from './brand';

export function getEmailFromName(): string {
  return process.env.EMAIL_FROM_NAME?.trim() || EMAIL_BRAND.name;
}

/** RFC 5322 From with display name, e.g. `"renting.berlin" <noreply@renting.berlin>`. */
export function formatEmailFrom(from = process.env.EMAIL_FROM, name = getEmailFromName()): string {
  const address = from?.trim();
  if (!address) return '';

  if (/^[^<]*<[^>]+>$/.test(address)) return address;

  const displayName = name.trim() || EMAIL_BRAND.name;
  const escaped = displayName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}" <${address}>`;
}
