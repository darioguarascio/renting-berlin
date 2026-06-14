import type { EmailContent, RenderedEmail } from './template';
import { renderBrandedEmail } from './template';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../db/schema';
import { getSiteUrl } from '../site-url';
import { sendEmail } from '../email';
import {
  createEmailSend,
  trackingOpenUrl,
  wrapLinksForTracking,
} from './tracking';

export type { EmailContent, RenderedEmail };

export async function prepareBrandedEmail(
  input: {
    to: string;
    userId?: string | null;
    category: string;
    content: EmailContent;
  },
  siteUrl = getSiteUrl(),
): Promise<RenderedEmail & { sendId: string | null }> {
  const links = input.content.cta ? [input.content.cta.href] : [];
  let sendId: string | null = null;
  let trackedLinks: string[] | undefined;
  let openPixelUrl: string | undefined;

  try {
    sendId = await createEmailSend({
      toEmail: input.to,
      userId: input.userId,
      category: input.category,
      subject: input.content.subject,
      links,
    });
    trackedLinks = wrapLinksForTracking(sendId, links, siteUrl);
    openPixelUrl = trackingOpenUrl(sendId, siteUrl);
  } catch (error) {
    console.warn('[email] tracking unavailable, sending without analytics:', error);
  }

  const rendered = renderBrandedEmail(input.content, {
    siteUrl,
    trackedLinks,
    openPixelUrl,
  });

  return { ...rendered, sendId };
}

export async function sendBrandedEmail(input: {
  to: string;
  userId?: string | null;
  category: string;
  content: EmailContent;
}): Promise<void> {
  const { subject, text, html } = await prepareBrandedEmail(input);
  await sendEmail(input.to, subject, text, html);
}

export async function buildNotificationEmail(input: {
  userId: string;
  category: string;
  title: string;
  body: string;
  link: string;
  ctaLabel?: string;
  siteUrl?: string;
  to?: string;
}) {
  const siteUrl = input.siteUrl ?? getSiteUrl();
  let to = input.to;
  if (!to) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, input.userId),
      columns: { email: true },
    });
    if (!user?.email) {
      throw new Error(`User email not found: ${input.userId}`);
    }
    to = user.email;
  }

  const absoluteLink = input.link.startsWith('http') ? input.link : `${siteUrl}${input.link}`;
  const content: EmailContent = {
    subject: input.title,
    preview: input.body,
    title: input.title,
    paragraphs: [input.body],
    cta: { label: input.ctaLabel ?? 'View on renting.berlin', href: absoluteLink },
  };

  const { subject, text, html } = await prepareBrandedEmail({
    to,
    userId: input.userId,
    category: input.category,
    content,
  }, siteUrl);

  return {
    userId: input.userId,
    to,
    subject,
    text,
    html,
    event: input.category,
  };
}
