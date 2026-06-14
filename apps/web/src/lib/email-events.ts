import { REDIS_KEYS } from './redis';
import { enqueueStreamEvent } from './queue-stream';

export type EmailJob = {
  userId: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  event: string;
};

function emailsSyncEnabled(): boolean {
  return process.env.EMAILS_SYNC === '1';
}

export async function enqueueEmailJob(job: Omit<EmailJob, 'to'> & { to?: string }): Promise<void> {
  if (emailsSyncEnabled()) {
    const { deliverEmailJob } = await import('./email-delivery');
    await deliverEmailJob(job as EmailJob);
    return;
  }

  await enqueueStreamEvent(REDIS_KEYS.emailEvents, {
    userId: job.userId,
    to: job.to ?? '',
    subject: job.subject,
    text: job.text,
    html: job.html,
    event: job.event,
  });
}

export function parseEmailJob(data: Record<string, string>): EmailJob | null {
  const { userId, to, subject, text, html, event } = data;
  if (!userId || !subject || !text || !html || !event) return null;
  return { userId, to, subject, text, html, event };
}

export async function processEmailJob(job: EmailJob): Promise<void> {
  const { deliverEmailJob } = await import('./email-delivery');
  await deliverEmailJob(job);
}
