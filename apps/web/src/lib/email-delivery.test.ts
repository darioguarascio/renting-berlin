import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationPreferences } from './notification-preferences';
import { isInQuietHours, shouldBufferEmail } from './email-scheduling';

const { connectRedis, getRedis, getNotificationPreferences, shouldNotifyEmail, sendEmailToUser } = vi.hoisted(
  () => ({
    connectRedis: vi.fn(),
    getRedis: vi.fn(),
    getNotificationPreferences: vi.fn(),
    shouldNotifyEmail: vi.fn(),
    sendEmailToUser: vi.fn(),
  }),
);

vi.mock('./redis', () => ({
  connectRedis,
  getRedis,
}));

vi.mock('./notification-preferences', () => ({
  getNotificationPreferences,
  shouldNotifyEmail,
}));

vi.mock('./email', () => ({
  sendEmailToUser,
}));

import { deliverEmailJob } from './email-delivery';

const basePrefs: NotificationPreferences = {
  inAppEnabled: true,
  emailEnabled: true,
  notifyMessages: true,
  notifySavedSearches: true,
  notifyProfileViews: true,
  notifyListingUpdates: true,
  notifyProductNews: false,
  emailDigest: 'instant',
  quietHoursEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  acceptInquiries: true,
  preferredContactHours: null,
  updatedAt: new Date().toISOString(),
};

describe('isInQuietHours', () => {
  it('returns false when quiet hours are disabled', () => {
    expect(isInQuietHours(basePrefs)).toBe(false);
  });

  it('returns false for invalid quiet-hour times', () => {
    const prefs = {
      ...basePrefs,
      quietHoursEnabled: true,
      quietHoursStart: 'invalid',
      quietHoursEnd: '08:00',
    };
    expect(isInQuietHours(prefs)).toBe(false);
  });

  it('returns false when the quiet-hour end time is invalid', () => {
    const prefs = {
      ...basePrefs,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: 'bad',
    };
    expect(isInQuietHours(prefs)).toBe(false);
  });

  it('treats identical start and end as always quiet', () => {
    const prefs = {
      ...basePrefs,
      quietHoursEnabled: true,
      quietHoursStart: '12:00',
      quietHoursEnd: '12:00',
    };
    expect(isInQuietHours(prefs, new Date('2026-06-14T10:00:00.000Z'))).toBe(true);
  });

  it('detects daytime quiet windows', () => {
    const prefs = {
      ...basePrefs,
      quietHoursEnabled: true,
      quietHoursStart: '12:00',
      quietHoursEnd: '14:00',
    };
    const inside = new Date('2026-06-14T10:30:00.000Z'); // 12:30 Berlin (CEST)
    const outside = new Date('2026-06-14T08:00:00.000Z'); // 10:00 Berlin

    expect(isInQuietHours(prefs, inside)).toBe(true);
    expect(isInQuietHours(prefs, outside)).toBe(false);
  });

  it('detects overnight quiet windows in Berlin time', () => {
    const prefs = {
      ...basePrefs,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    };
    const late = new Date('2026-06-14T21:00:00.000Z'); // 23:00 Berlin (CEST)
    const early = new Date('2026-06-14T05:00:00.000Z'); // 07:00 Berlin
    const midday = new Date('2026-06-14T10:00:00.000Z'); // 12:00 Berlin

    expect(isInQuietHours(prefs, late)).toBe(true);
    expect(isInQuietHours(prefs, early)).toBe(true);
    expect(isInQuietHours(prefs, midday)).toBe(false);
  });
});

describe('shouldBufferEmail', () => {
  it('always sends message emails immediately', () => {
    const prefs = {
      ...basePrefs,
      emailDigest: 'weekly',
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    };
    expect(shouldBufferEmail(prefs, 'messages')).toBe(false);
  });

  it('buffers saved-search emails when digest is enabled', () => {
    const prefs = {
      ...basePrefs,
      emailDigest: 'daily',
    };
    expect(shouldBufferEmail(prefs, 'saved_searches')).toBe(true);
  });

  it('buffers instant emails during quiet hours', () => {
    const prefs = {
      ...basePrefs,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    };
    const late = new Date('2026-06-14T21:00:00.000Z'); // 23:00 Berlin

    expect(shouldBufferEmail(prefs, 'saved_searches', late)).toBe(true);
  });
});

describe('deliverEmailJob', () => {
  const job = {
    userId: 'user_1',
    to: 'user@example.com',
    subject: 'Saved search matches',
    text: 'text',
    html: 'html',
    event: 'saved_searches' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    connectRedis.mockResolvedValue(undefined);
    getRedis.mockReturnValue({
      rpush: vi.fn().mockResolvedValue(1),
      sadd: vi.fn().mockResolvedValue(1),
    });
    shouldNotifyEmail.mockResolvedValue(true);
    getNotificationPreferences.mockResolvedValue({ ...basePrefs, emailDigest: 'instant' });
    sendEmailToUser.mockResolvedValue(undefined);
  });

  it('skips delivery when email notifications are disabled', async () => {
    shouldNotifyEmail.mockResolvedValue(false);

    await deliverEmailJob(job);

    expect(sendEmailToUser).not.toHaveBeenCalled();
    expect(getRedis).not.toHaveBeenCalled();
  });

  it('buffers digestable emails instead of sending immediately', async () => {
    getNotificationPreferences.mockResolvedValue({ ...basePrefs, emailDigest: 'daily' });
    const redis = {
      rpush: vi.fn().mockResolvedValue(1),
      sadd: vi.fn().mockResolvedValue(1),
    };
    getRedis.mockReturnValue(redis);

    await deliverEmailJob(job);

    expect(redis.rpush).toHaveBeenCalledOnce();
    expect(sendEmailToUser).not.toHaveBeenCalled();
  });

  it('sends instant emails immediately', async () => {
    await deliverEmailJob(job);

    expect(sendEmailToUser).toHaveBeenCalledWith(job);
  });
});
