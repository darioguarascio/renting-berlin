import { and, desc, eq, gt, inArray, lte, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { notifications, users } from '../db/schema';
import { buildNotificationEmail } from './email/send';
import { enqueueEmailJob } from './email-events';
import { shouldNotifyEmail, shouldNotifyInApp, type NotificationEvent } from './notification-preferences';
import { getSiteUrl } from './site-url';

export type NotificationType =
  | 'saved_search_listing'
  | 'saved_search_seeker'
  | 'connection_accepted'
  | 'stay_offer_new'
  | 'stay_claim_new'
  | 'stay_claim_accepted'
  | 'stay_claim_declined';

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  createdAt: string;
  isNew: boolean;
}

function toRecord(
  row: typeof notifications.$inferSelect,
  isNew: boolean,
): NotificationRecord {
  return {
    id: row.id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    link: row.link,
    createdAt: row.createdAt.toISOString(),
    isNew,
  };
}

export async function getLastNotificationsVisit(userId: string): Promise<Date | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { lastNotificationsVisitAt: true },
  });
  return user?.lastNotificationsVisitAt ?? null;
}

/** Marks the inbox as viewed — clears the header badge until new items arrive. */
export async function recordNotificationsVisit(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ lastNotificationsVisitAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

function sinceLastVisitWhere(userId: string, lastVisit: Date | null) {
  if (!lastVisit) return eq(notifications.userId, userId);
  return and(eq(notifications.userId, userId), gt(notifications.createdAt, lastVisit));
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  dedupeKey?: string | null;
}): Promise<void> {
  try {
    await db.insert(notifications).values({
      id: nanoid(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      dedupeKey: input.dedupeKey ?? null,
    });
  } catch {
    // duplicate (same userId + dedupeKey) — ignore
  }
}

/**
 * High-level helper that respects per-user preferences and fans out to both the
 * in-app inbox and email (best-effort). Used by connections and house-sitting.
 */
export async function notifyUser(input: {
  userId: string;
  event: NotificationEvent;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  dedupeKey?: string | null;
}): Promise<void> {
  const [inApp, email] = await Promise.all([
    shouldNotifyInApp(input.userId, input.event),
    shouldNotifyEmail(input.userId, input.event),
  ]);

  if (inApp) {
    await createNotification(input);
  }
  if (email) {
    try {
      await enqueueEmailJob(
        await buildNotificationEmail({
          userId: input.userId,
          category: input.event,
          title: input.title,
          body: input.body,
          link: input.link,
          siteUrl: getSiteUrl(),
        }),
      );
    } catch {
      // email best-effort
    }
  }
}

/** Notifications created after the user last opened the inbox. */
export async function listNewNotifications(
  userId: string,
  opts: { types?: NotificationType[]; limit?: number } = {},
): Promise<NotificationRecord[]> {
  const lastVisit = await getLastNotificationsVisit(userId);
  const base = sinceLastVisitWhere(userId, lastVisit);
  const where = opts.types?.length
    ? and(base, inArray(notifications.type, opts.types))
    : base;

  const rows = await db.query.notifications.findMany({
    where,
    orderBy: [desc(notifications.createdAt)],
    limit: opts.limit ?? 50,
  });
  return rows.map((r) => toRecord(r, true));
}

/** Recent history for context below the "new since last visit" section. */
export async function listOlderNotifications(
  userId: string,
  opts: { types?: NotificationType[]; limit?: number } = {},
): Promise<NotificationRecord[]> {
  const lastVisit = await getLastNotificationsVisit(userId);
  if (!lastVisit) return [];

  const base = and(eq(notifications.userId, userId), lte(notifications.createdAt, lastVisit));
  const where = opts.types?.length
    ? and(base, inArray(notifications.type, opts.types))
    : base;

  const rows = await db.query.notifications.findMany({
    where,
    orderBy: [desc(notifications.createdAt)],
    limit: opts.limit ?? 30,
  });
  return rows.map((r) => toRecord(r, false));
}

export async function getNewNotificationCount(
  userId: string,
  types?: NotificationType[],
): Promise<number> {
  const lastVisit = await getLastNotificationsVisit(userId);
  const base = sinceLastVisitWhere(userId, lastVisit);
  const where = types?.length ? and(base, inArray(notifications.type, types)) : base;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(where);
  return count;
}
