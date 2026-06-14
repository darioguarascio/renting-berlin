import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { buildNotificationEmail } from './email/send';
import { deliverEmailJob } from './email-delivery';
import { getSiteUrl } from './site-url';

export async function notifyNewMessageEmail(input: {
  recipientId: string;
  senderName: string;
  conversationId: string;
  preview: string;
}) {
  const preview = input.preview.trim() || 'New message';
  const link = `/messages/${input.conversationId}`;
  const job = await buildNotificationEmail({
    userId: input.recipientId,
    category: 'messages',
    title: `New message from ${input.senderName}`,
    body: preview.length > 180 ? `${preview.slice(0, 177)}…` : preview,
    link,
    siteUrl: getSiteUrl(),
  });
  await deliverEmailJob(job);
}

export async function notifyProfileViewEmail(input: {
  profileUserId: string;
  viewerId: string;
}) {
  const [profileUser, viewer] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, input.profileUserId),
      columns: { handle: true },
    }),
    db.query.users.findFirst({
      where: eq(users.id, input.viewerId),
      columns: { name: true, handle: true },
    }),
  ]);
  if (!profileUser?.handle || !viewer) return;

  const viewerLabel = viewer.handle ? `@${viewer.handle}` : viewer.name;
  const job = await buildNotificationEmail({
    userId: input.profileUserId,
    category: 'profile_views',
    title: 'Someone viewed your seeker profile',
    body: `${viewerLabel} viewed your profile.`,
    link: '/account/profile-views',
    siteUrl: getSiteUrl(),
  });
  await deliverEmailJob(job);
}

export async function notifyListingActivityEmail(input: {
  publisherId: string;
  title: string;
  body: string;
  link: string;
}) {
  const job = await buildNotificationEmail({
    userId: input.publisherId,
    category: 'listing_updates',
    title: input.title,
    body: input.body,
    link: input.link,
    siteUrl: getSiteUrl(),
  });
  await deliverEmailJob(job);
}

export async function notifyProductNewsEmail(input: {
  userId: string;
  title: string;
  body: string;
  link?: string;
}) {
  const job = await buildNotificationEmail({
    userId: input.userId,
    category: 'product_news',
    title: input.title,
    body: input.body,
    link: input.link ?? '/dashboard',
    siteUrl: getSiteUrl(),
  });
  await deliverEmailJob(job);
}
