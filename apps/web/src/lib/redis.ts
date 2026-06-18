import Redis from 'ioredis';

let redis: Redis | null = null;

function env(key: string, fallback?: string): string {
  if (process.env[key]) return process.env[key]!;
  if (typeof import.meta !== 'undefined' && 'env' in import.meta) {
    const val = (import.meta.env as Record<string, string | undefined>)[key];
    if (val) return val;
  }
  return fallback ?? '';
}

export function getRedis(): Redis {
  if (!redis) {
    const url = env('REDIS_URL');
    if (!url) {
      throw new Error('REDIS_URL is not set');
    }
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
  }
  return redis;
}

export const REDIS_KEYS = {
  listingsIndex: 'listings:active',
  listingsIndexReady: 'listings:active:ready',
  listingData: (id: string) => `listing:${id}`,
  geoIndex: 'listings:geo',
  favorites: (userId: string) => `favorites:${userId}`,
  searchCache: (hash: string) => `search:${hash}`,
  profileViewEvents: 'profile_views:events',
  profileViewWorkers: 'profile-view-workers',
  notificationEvents: 'notifications:events',
  notificationWorkers: 'notification-workers',
  emailEvents: 'emails:events',
  emailWorkers: 'email-workers',
  moderationEvents: 'moderation:events',
  moderationWorkers: 'moderation-workers',
  telegramEvents: 'telegram:events',
  telegramWorkers: 'telegram-workers',
  agreementEvents: 'agreements:events',
  agreementWorkers: 'agreement-workers',
} as const;

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  if (client.status === 'wait') {
    await client.connect();
  }
}
