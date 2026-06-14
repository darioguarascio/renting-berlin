import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findFirst, insertReturning, deleteReturning } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  insertReturning: vi.fn(),
  deleteReturning: vi.fn(),
}));

vi.mock('../db', () => ({
  db: {
    query: {
      messageTemplates: { findMany: vi.fn() },
      userNotificationPreferences: { findFirst },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: insertReturning,
        onConflictDoNothing: vi.fn(() => ({
          returning: insertReturning,
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: deleteReturning,
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: insertReturning,
        })),
      })),
    })),
  },
}));

import {
  createMessageTemplate,
  deleteMessageTemplate,
  saveMessageAsTemplate,
} from './message-templates';
import { shouldNotifyEmail, shouldNotifyInApp } from './notification-preferences';

describe('message templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates template input', async () => {
    await expect(createMessageTemplate('user_1', { label: ' ', body: 'Hello' })).rejects.toThrow(
      /name is required/i,
    );
    await expect(createMessageTemplate('user_1', { label: 'Intro', body: ' ' })).rejects.toThrow(
      /body is required/i,
    );
  });

  it('creates templates with trimmed values', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    insertReturning.mockResolvedValue([
      {
        id: 'tmpl_1',
        label: 'Intro',
        body: 'Hello there',
        kind: 'general',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const template = await createMessageTemplate('user_1', {
      label: ' Intro ',
      body: ' Hello there ',
    });

    expect(template.label).toBe('Intro');
    expect(template.body).toBe('Hello there');
  });

  it('skips save-as-template when disabled or empty', async () => {
    expect(await saveMessageAsTemplate('user_1', 'Hello', { saveAsTemplate: false })).toBeNull();
    expect(await saveMessageAsTemplate('user_1', '   ', { saveAsTemplate: true })).toBeNull();
  });

  it('deletes owned templates', async () => {
    deleteReturning.mockResolvedValue([{ id: 'tmpl_1' }]);
    expect(await deleteMessageTemplate('user_1', 'tmpl_1')).toBe(true);
    deleteReturning.mockResolvedValue([]);
    expect(await deleteMessageTemplate('user_1', 'missing')).toBe(false);
  });
});

describe('notification preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns defaults when no row exists', async () => {
    findFirst.mockResolvedValue(null);
    await expect(shouldNotifyInApp('user_1', 'messages')).resolves.toBe(true);
    await expect(shouldNotifyEmail('user_1', 'product_news')).resolves.toBe(false);
  });

  it('respects disabled channels and event toggles', async () => {
    findFirst.mockResolvedValue({
      inAppEnabled: false,
      emailEnabled: true,
      notifyMessages: true,
      notifySavedSearches: true,
      notifyProfileViews: true,
      notifyListingUpdates: true,
      notifyProductNews: true,
      emailDigest: 'instant',
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      acceptInquiries: true,
      preferredContactHours: null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(shouldNotifyInApp('user_1', 'messages')).resolves.toBe(false);
    await expect(shouldNotifyEmail('user_1', 'product_news')).resolves.toBe(true);
  });
});
