export const EMAIL_BRAND = {
  name: 'renting.berlin',
  tagline: 'Berlin rentals',
  colors: {
    brand: '#2679a3',
    brandDeep: '#006699',
    brandLight: '#d4eaf5',
    brandMuted: '#e8f4fa',
    ink: '#1a2332',
    inkMuted: '#5c6b7a',
    border: '#e2e8f0',
    white: '#ffffff',
  },
} as const;

export function emailLogoUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, '')}/email/logo.png`;
}

export const DEFAULT_EMAIL_FOOTER =
  'You received this email from renting.berlin. If you did not expect it, you can ignore it.';
