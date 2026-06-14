import { REDIS_KEYS } from './redis';
import { enqueueStreamEvent } from './queue-stream';

export type TelegramJobType = 'new_listing' | 'new_tenant_request';

export type TelegramJob = {
  type: TelegramJobType;
  entityId: string;
};

function telegramSyncEnabled(): boolean {
  return process.env.TELEGRAM_SYNC === '1';
}

export async function enqueueTelegramJob(type: TelegramJobType, entityId: string): Promise<void> {
  if (telegramSyncEnabled()) {
    return;
  }

  await enqueueStreamEvent(REDIS_KEYS.telegramEvents, {
    type,
    entityId,
  });
}

export function parseTelegramJob(data: Record<string, string>): TelegramJob | null {
  const { type, entityId } = data;
  if (type !== 'new_listing' && type !== 'new_tenant_request') return null;
  if (!entityId) return null;
  return { type, entityId };
}
