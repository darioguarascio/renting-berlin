import { eq } from 'drizzle-orm';
import { db } from '../db';
import { userNotificationPreferences } from '../db/schema';

export type EmailDigest = 'instant' | 'daily' | 'weekly';

export type NotificationEvent =
  | 'messages'
  | 'saved_searches'
  | 'profile_views'
  | 'listing_updates'
  | 'product_news';

export interface NotificationPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  notifyMessages: boolean;
  notifySavedSearches: boolean;
  notifyProfileViews: boolean;
  notifyListingUpdates: boolean;
  notifyProductNews: boolean;
  emailDigest: EmailDigest;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  acceptInquiries: boolean;
  preferredContactHours: string | null;
  updatedAt: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
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

const EVENT_FIELD: Record<NotificationEvent, keyof NotificationPreferences> = {
  messages: 'notifyMessages',
  saved_searches: 'notifySavedSearches',
  profile_views: 'notifyProfileViews',
  listing_updates: 'notifyListingUpdates',
  product_news: 'notifyProductNews',
};

function toRecord(row: typeof userNotificationPreferences.$inferSelect): NotificationPreferences {
  return {
    inAppEnabled: row.inAppEnabled,
    emailEnabled: row.emailEnabled,
    notifyMessages: row.notifyMessages,
    notifySavedSearches: row.notifySavedSearches,
    notifyProfileViews: row.notifyProfileViews,
    notifyListingUpdates: row.notifyListingUpdates,
    notifyProductNews: row.notifyProductNews,
    emailDigest: row.emailDigest,
    quietHoursEnabled: row.quietHoursEnabled,
    quietHoursStart: row.quietHoursStart,
    quietHoursEnd: row.quietHoursEnd,
    acceptInquiries: row.acceptInquiries,
    preferredContactHours: row.preferredContactHours,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const row = await db.query.userNotificationPreferences.findFirst({
    where: eq(userNotificationPreferences.userId, userId),
  });
  if (!row) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  return toRecord(row);
}

export async function getOrCreateNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const existing = await db.query.userNotificationPreferences.findFirst({
    where: eq(userNotificationPreferences.userId, userId),
  });
  if (existing) return toRecord(existing);

  const [row] = await db
    .insert(userNotificationPreferences)
    .values({ userId })
    .onConflictDoNothing()
    .returning();

  if (row) return toRecord(row);
  return getNotificationPreferences(userId);
}

export type NotificationPreferencesPatch = Partial<
  Omit<NotificationPreferences, 'updatedAt'>
>;

export async function updateNotificationPreferences(
  userId: string,
  patch: NotificationPreferencesPatch,
): Promise<NotificationPreferences> {
  await getOrCreateNotificationPreferences(userId);

  const updates: Partial<typeof userNotificationPreferences.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.inAppEnabled !== undefined) updates.inAppEnabled = patch.inAppEnabled;
  if (patch.emailEnabled !== undefined) updates.emailEnabled = patch.emailEnabled;
  if (patch.notifyMessages !== undefined) updates.notifyMessages = patch.notifyMessages;
  if (patch.notifySavedSearches !== undefined) updates.notifySavedSearches = patch.notifySavedSearches;
  if (patch.notifyProfileViews !== undefined) updates.notifyProfileViews = patch.notifyProfileViews;
  if (patch.notifyListingUpdates !== undefined) updates.notifyListingUpdates = patch.notifyListingUpdates;
  if (patch.notifyProductNews !== undefined) updates.notifyProductNews = patch.notifyProductNews;
  if (patch.emailDigest !== undefined) updates.emailDigest = patch.emailDigest;
  if (patch.quietHoursEnabled !== undefined) updates.quietHoursEnabled = patch.quietHoursEnabled;
  if (patch.quietHoursStart !== undefined) updates.quietHoursStart = patch.quietHoursStart;
  if (patch.quietHoursEnd !== undefined) updates.quietHoursEnd = patch.quietHoursEnd;
  if (patch.acceptInquiries !== undefined) updates.acceptInquiries = patch.acceptInquiries;
  if (patch.preferredContactHours !== undefined) updates.preferredContactHours = patch.preferredContactHours;

  const [row] = await db
    .update(userNotificationPreferences)
    .set(updates)
    .where(eq(userNotificationPreferences.userId, userId))
    .returning();

  return toRecord(row);
}

export async function shouldNotifyInApp(userId: string, event: NotificationEvent): Promise<boolean> {
  const prefs = await getNotificationPreferences(userId);
  if (!prefs.inAppEnabled) return false;
  return Boolean(prefs[EVENT_FIELD[event]]);
}

export async function shouldNotifyEmail(userId: string, event: NotificationEvent): Promise<boolean> {
  const prefs = await getNotificationPreferences(userId);
  if (!prefs.emailEnabled) return false;
  return Boolean(prefs[EVENT_FIELD[event]]);
}
