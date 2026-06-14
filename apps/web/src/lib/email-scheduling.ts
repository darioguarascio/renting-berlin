import type { EmailDigest, NotificationEvent, NotificationPreferences } from './notification-preferences';

function berlinMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

function parseTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function isInQuietHours(prefs: NotificationPreferences, now = new Date()): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const start = parseTime(prefs.quietHoursStart ?? '22:00');
  const end = parseTime(prefs.quietHoursEnd ?? '08:00');
  if (start === null || end === null) return false;

  const nowMinutes = berlinMinutes(now);
  if (start === end) return true;
  if (start < end) return nowMinutes >= start && nowMinutes < end;
  return nowMinutes >= start || nowMinutes < end;
}

export function shouldBufferEmail(
  prefs: NotificationPreferences,
  event: NotificationEvent,
  now = new Date(),
): boolean {
  if (event === 'messages') return false;
  if (prefs.emailDigest !== 'instant') return true;
  return isInQuietHours(prefs, now);
}

export const DIGEST_MS: Record<Exclude<EmailDigest, 'instant'>, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};
