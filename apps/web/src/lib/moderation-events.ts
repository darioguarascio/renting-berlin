import { REDIS_KEYS } from './redis';
import { enqueueStreamEvent } from './queue-stream';

export type ModerationJobType = 'listing' | 'tenant_request' | 'image';

export type ModerationJob = {
  type: ModerationJobType;
  entityId: string;
  photoUrl?: string;
};

export function moderationEnabled(): boolean {
  return process.env.MODERATION_DISABLED !== '1';
}

function moderationSyncEnabled(): boolean {
  return process.env.MODERATION_SYNC === '1';
}

export async function enqueueModerationJob(job: ModerationJob): Promise<void> {
  if (!moderationEnabled()) return;

  if (moderationSyncEnabled()) {
    await processModerationJob(job);
    return;
  }

  await enqueueStreamEvent(REDIS_KEYS.moderationEvents, {
    type: job.type,
    entityId: job.entityId,
    ...(job.photoUrl ? { photoUrl: job.photoUrl } : {}),
  });
}

export function parseModerationJob(data: Record<string, string>): ModerationJob | null {
  const { type, entityId, photoUrl } = data;
  if (type !== 'listing' && type !== 'tenant_request' && type !== 'image') return null;
  if (!entityId) return null;
  return { type, entityId, ...(photoUrl ? { photoUrl } : {}) };
}

export async function processModerationJob(job: ModerationJob): Promise<void> {
  const { handleModerationJob } = await import('./moderation-handlers');
  await handleModerationJob(job);
}
