import { REDIS_KEYS } from './redis';
import { enqueueStreamEvent } from './queue-stream';

export type NotificationJobType = 'new_listing' | 'new_tenant_request';

export type NotificationJob = {
  type: NotificationJobType;
  entityId: string;
};

function notificationsSyncEnabled(): boolean {
  return process.env.NOTIFICATIONS_SYNC === '1';
}

export async function enqueueNotificationJob(type: NotificationJobType, entityId: string): Promise<void> {
  if (notificationsSyncEnabled()) {
    await processNotificationJob({ type, entityId });
    return;
  }

  await enqueueStreamEvent(REDIS_KEYS.notificationEvents, {
    type,
    entityId,
  });
}

export function parseNotificationJob(data: Record<string, string>): NotificationJob | null {
  const { type, entityId } = data;
  if (type !== 'new_listing' && type !== 'new_tenant_request') return null;
  if (!entityId) return null;
  return { type, entityId };
}

export async function processNotificationJob(job: NotificationJob): Promise<void> {
  if (job.type === 'new_listing') {
    const { notifyNewListing } = await import('./saved-searches');
    await notifyNewListing(job.entityId);
    return;
  }

  const { notifyNewTenantRequest } = await import('./saved-searches');
  await notifyNewTenantRequest(job.entityId);
}
