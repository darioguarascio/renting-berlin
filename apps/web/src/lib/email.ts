import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import type { EmailJob } from './email-events';
import { buildNotificationEmail } from './email/send';

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM);
}

export async function sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
  if (!smtpConfigured()) {
    console.info(`[email] to=${to} subject=${subject}\n${text}`);
    return;
  }

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === '1',
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}

export async function sendEmailToUser(job: EmailJob): Promise<void> {
  let to = job.to;
  if (!to) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, job.userId),
      columns: { email: true },
    });
    if (!user?.email) return;
    to = user.email;
  }

  await sendEmail(to, job.subject, job.text, job.html);
}

export async function buildSavedSearchEmail(input: {
  userId: string;
  title: string;
  body: string;
  link: string;
  siteUrl: string;
}) {
  return buildNotificationEmail({
    userId: input.userId,
    category: 'saved_searches',
    title: input.title,
    body: input.body,
    link: input.link,
    siteUrl: input.siteUrl,
  });
}
