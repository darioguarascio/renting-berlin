import { connectRedis, getRedis } from './redis';

export function parseStreamFields(fields: string[]): Record<string, string> {
  const data: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]!] = fields[i + 1]!;
  }
  return data;
}

export async function enqueueStreamEvent(
  streamKey: string,
  fields: Record<string, string>,
): Promise<void> {
  await connectRedis();
  const redis = getRedis();
  const args: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    args.push(key, value);
  }
  await redis.xadd(streamKey, '*', ...args);
}

export async function ensureConsumerGroup(streamKey: string, groupName: string): Promise<void> {
  await connectRedis();
  const redis = getRedis();

  try {
    await redis.xgroup('CREATE', streamKey, groupName, '0', 'MKSTREAM');
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes('BUSYGROUP')) {
      throw err;
    }
  }
}

export type StreamWorkerConfig = {
  streamKey: string;
  groupName: string;
  consumerName?: string;
  batchSize?: number;
  blockMs?: number;
};

export async function runStreamWorker(
  config: StreamWorkerConfig,
  handler: (id: string, data: Record<string, string>) => Promise<void>,
): Promise<void> {
  const consumerName = config.consumerName ?? `worker-${process.pid}`;
  const batchSize = config.batchSize ?? 10;
  const blockMs = config.blockMs ?? 5000;

  await connectRedis();
  await ensureConsumerGroup(config.streamKey, config.groupName);

  console.log(`Worker started: ${config.streamKey} (${consumerName})`);

  let running = true;
  const shutdown = () => {
    running = false;
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  while (running) {
    const redis = getRedis();
    const result = await redis.xreadgroup(
      'GROUP',
      config.groupName,
      consumerName,
      'COUNT',
      batchSize,
      'BLOCK',
      blockMs,
      'STREAMS',
      config.streamKey,
      '>',
    );

    if (!result) continue;

    for (const [, entries] of result) {
      for (const [id, fields] of entries) {
        try {
          await handler(id, parseStreamFields(fields));
          await redis.xack(config.streamKey, config.groupName, id);
        } catch (err) {
          console.error(`Failed to process ${config.streamKey} event ${id}:`, err);
        }
      }
    }
  }

  await getRedis().quit();
}
