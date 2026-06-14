import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findFirst, insertReturning, updateReturning } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  insertReturning: vi.fn(),
  updateReturning: vi.fn(),
}));

vi.mock('../db', () => ({
  db: {
    query: {
      userNotificationPreferences: { findFirst },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({
          returning: insertReturning,
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: updateReturning,
        })),
      })),
    })),
  },
}));

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  getOrCreateNotificationPreferences,
  shouldNotifyEmail,
  shouldNotifyInApp,
  updateNotificationPreferences,
} from './notification-preferences';

const storedRow = {
  userId: 'user_1',
  inAppEnabled: true,
  emailEnabled: false,
  notifyMessages: true,
  notifySavedSearches: false,
  notifyProfileViews: true,
  notifyListingUpdates: true,
  notifyProductNews: false,
  emailDigest: 'daily' as const,
  quietHoursEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  acceptInquiries: true,
  preferredContactHours: null,
  updatedAt: new Date('2026-01-01'),
};

describe('getNotificationPreferences', () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it('returns defaults when no row exists', async () => {
    findFirst.mockResolvedValue(null);

    const prefs = await getNotificationPreferences('user_1');

    expect(prefs.inAppEnabled).toBe(DEFAULT_NOTIFICATION_PREFERENCES.inAppEnabled);
    expect(prefs.notifyProductNews).toBe(false);
  });

  it('maps stored preferences', async () => {
    findFirst.mockResolvedValue(storedRow);

    const prefs = await getNotificationPreferences('user_1');

    expect(prefs.emailEnabled).toBe(false);
    expect(prefs.emailDigest).toBe('daily');
  });
});

describe('getOrCreateNotificationPreferences', () => {
  beforeEach(() => {
    findFirst.mockReset();
    insertReturning.mockReset();
  });

  it('returns existing preferences', async () => {
    findFirst.mockResolvedValue(storedRow);

    await expect(getOrCreateNotificationPreferences('user_1')).resolves.toMatchObject({
      emailEnabled: false,
    });
  });

  it('inserts defaults when missing', async () => {
    findFirst.mockResolvedValueOnce(null);
    insertReturning.mockResolvedValue([storedRow]);

    await expect(getOrCreateNotificationPreferences('user_1')).resolves.toMatchObject({
      emailEnabled: false,
    });
  });

  it('falls back to read after conflict', async () => {
    findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(storedRow);
    insertReturning.mockResolvedValue([]);

    await expect(getOrCreateNotificationPreferences('user_1')).resolves.toMatchObject({
      emailEnabled: false,
    });
  });
});

describe('updateNotificationPreferences', () => {
  beforeEach(() => {
    findFirst.mockReset();
    insertReturning.mockReset();
    updateReturning.mockReset();
    findFirst.mockResolvedValue(storedRow);
    insertReturning.mockResolvedValue([storedRow]);
    updateReturning.mockResolvedValue([
      { ...storedRow, notifyMessages: false, notifySavedSearches: true },
    ]);
  });

  it('updates selected fields', async () => {
    const prefs = await updateNotificationPreferences('user_1', {
      notifyMessages: false,
      notifySavedSearches: true,
      emailDigest: 'weekly',
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      acceptInquiries: false,
      preferredContactHours: '10:00-18:00',
      notifyProfileViews: false,
      notifyListingUpdates: false,
      notifyProductNews: true,
      inAppEnabled: false,
      emailEnabled: true,
    });

    expect(prefs.notifyMessages).toBe(false);
    expect(prefs.notifySavedSearches).toBe(true);
  });
});

describe('notification gates', () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it('respects in-app master switch and event toggles', async () => {
    findFirst.mockResolvedValue({ ...storedRow, inAppEnabled: false });
    expect(await shouldNotifyInApp('user_1', 'messages')).toBe(false);

    findFirst.mockResolvedValue({ ...storedRow, notifySavedSearches: false });
    expect(await shouldNotifyInApp('user_1', 'saved_searches')).toBe(false);

    findFirst.mockResolvedValue(storedRow);
    expect(await shouldNotifyInApp('user_1', 'messages')).toBe(true);
  });

  it('respects email master switch and event toggles', async () => {
    findFirst.mockResolvedValue({ ...storedRow, emailEnabled: false });
    expect(await shouldNotifyEmail('user_1', 'messages')).toBe(false);

    findFirst.mockResolvedValue({ ...storedRow, emailEnabled: true, notifyMessages: true });
    expect(await shouldNotifyEmail('user_1', 'messages')).toBe(true);
  });
});
