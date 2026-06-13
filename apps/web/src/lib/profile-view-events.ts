import { connectRedis, getRedis, REDIS_KEYS } from './redis';

export type ProfileViewEvent = {
  profileUserId: string;
  viewerId: string;
  viewedAt: string;
};

export async function enqueueProfileViewEvent(profileUserId: string, viewerId: string): Promise<void> {
  await connectRedis();
  const redis = getRedis();
  const viewedAt = new Date().toISOString();

  await redis.xadd(
    REDIS_KEYS.profileViewEvents,
    '*',
    'profileUserId',
    profileUserId,
    'viewerId',
    viewerId,
    'viewedAt',
    viewedAt,
  );
}

export function parseProfileViewEvent(fields: string[]): ProfileViewEvent | null {
  const data: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]!] = fields[i + 1]!;
  }

  const { profileUserId, viewerId, viewedAt } = data;
  if (!profileUserId || !viewerId || !viewedAt) return null;

  return { profileUserId, viewerId, viewedAt };
}

export async function ensureProfileViewConsumerGroup(): Promise<void> {
  await connectRedis();
  const redis = getRedis();

  try {
    await redis.xgroup(
      'CREATE',
      REDIS_KEYS.profileViewEvents,
      REDIS_KEYS.profileViewWorkers,
      '0',
      'MKSTREAM',
    );
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes('BUSYGROUP')) {
      throw err;
    }
  }
}
