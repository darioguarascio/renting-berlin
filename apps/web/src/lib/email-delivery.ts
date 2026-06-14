import type { EmailJob } from './email-events';
import { connectRedis, getRedis } from './redis';
import {
  getNotificationPreferences,
  shouldNotifyEmail,
  type NotificationEvent,
} from './notification-preferences';
import { DIGEST_MS, isInQuietHours, shouldBufferEmail } from './email-scheduling';

const BUFFER_PREFIX = 'emails:buffer:';
const META_PREFIX = 'emails:meta:';
const BUFFER_INDEX = 'emails:buffer:users';

function bufferKey(userId: string) {
  return `${BUFFER_PREFIX}${userId}`;
}

function metaKey(userId: string) {
  return `${META_PREFIX}${userId}`;
}

async function bufferEmailJob(userId: string, job: EmailJob): Promise<void> {
  await connectRedis();
  const redis = getRedis();
  await redis.rpush(bufferKey(userId), JSON.stringify(job));
  await redis.sadd(BUFFER_INDEX, userId);
}

async function sendEmailJobNow(job: EmailJob): Promise<void> {
  const { sendEmailToUser } = await import('./email');
  await sendEmailToUser(job);
}

export async function deliverEmailJob(job: EmailJob): Promise<void> {
  const event = job.event as NotificationEvent;
  if (!(await shouldNotifyEmail(job.userId, event))) return;

  const prefs = await getNotificationPreferences(job.userId);
  if (shouldBufferEmail(prefs, event)) {
    await bufferEmailJob(job.userId, job);
    return;
  }

  await sendEmailJobNow(job);
}

export async function flushBufferedEmailsForUser(userId: string, now = Date.now()): Promise<number> {
  await connectRedis();
  const redis = getRedis();
  const rawJobs = await redis.lrange(bufferKey(userId), 0, -1);
  if (rawJobs.length === 0) return 0;

  const prefs = await getNotificationPreferences(userId);
  if (prefs.emailDigest !== 'instant') {
    const metaRaw = await redis.get(metaKey(userId));
    const lastFlushAt = metaRaw ? Number(JSON.parse(metaRaw).lastFlushAt ?? 0) : 0;
    const interval = DIGEST_MS[prefs.emailDigest as Exclude<EmailDigest, 'instant'>];
    if (now - lastFlushAt < interval) return 0;
  } else if (isInQuietHours(prefs, new Date(now))) {
    return 0;
  }

  await redis.del(bufferKey(userId));
  await redis.srem(BUFFER_INDEX, userId);

  let sent = 0;
  for (const raw of rawJobs) {
    const job = JSON.parse(raw) as EmailJob;
    if (!(await shouldNotifyEmail(job.userId, job.event as NotificationEvent))) continue;
    await sendEmailJobNow(job);
    sent += 1;
  }

  if (sent > 0) {
    await redis.set(metaKey(userId), JSON.stringify({ lastFlushAt: now }));
  }

  return sent;
}

export async function flushDueBufferedEmails(now = Date.now()): Promise<number> {
  await connectRedis();
  const redis = getRedis();
  const userIds = await redis.smembers(BUFFER_INDEX);
  let total = 0;
  for (const userId of userIds) {
    total += await flushBufferedEmailsForUser(userId, now);
  }
  return total;
}
