import { connectRedis, getRedis, REDIS_KEYS } from '../lib/redis';
import {
  ensureProfileViewConsumerGroup,
  parseProfileViewEvent,
} from '../lib/profile-view-events';
import { upsertProfileView } from '../lib/profile-views';

const CONSUMER_NAME = process.env.PROFILE_VIEW_WORKER_NAME ?? `worker-${process.pid}`;
const BATCH_SIZE = 10;
const BLOCK_MS = 5000;

async function processEntry(id: string, fields: string[]): Promise<void> {
  const event = parseProfileViewEvent(fields);
  if (!event) {
    console.warn(`Skipping malformed profile view event ${id}`);
    return;
  }

  if (event.viewerId === event.profileUserId) return;

  await upsertProfileView(event.profileUserId, event.viewerId, new Date(event.viewedAt));
}

async function processBatch(): Promise<void> {
  const redis = getRedis();
  const result = await redis.xreadgroup(
    'GROUP',
    REDIS_KEYS.profileViewWorkers,
    CONSUMER_NAME,
    'COUNT',
    BATCH_SIZE,
    'BLOCK',
    BLOCK_MS,
    'STREAMS',
    REDIS_KEYS.profileViewEvents,
    '>',
  );

  if (!result) return;

  for (const [, entries] of result) {
    for (const [id, fields] of entries) {
      try {
        await processEntry(id, fields);
        await redis.xack(REDIS_KEYS.profileViewEvents, REDIS_KEYS.profileViewWorkers, id);
      } catch (err) {
        console.error(`Failed to process profile view event ${id}:`, err);
      }
    }
  }
}

async function main(): Promise<void> {
  await connectRedis();
  await ensureProfileViewConsumerGroup();

  console.log(`Profile view worker started (${CONSUMER_NAME})`);

  let running = true;
  const shutdown = () => {
    running = false;
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  while (running) {
    await processBatch();
  }

  await getRedis().quit();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
