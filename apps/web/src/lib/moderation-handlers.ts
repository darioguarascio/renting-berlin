import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { listings, moderationResults, tenantRequests } from '../db/schema';
import type { ModerationJob } from './moderation-events';
import { enqueueNotificationJob } from './notification-events';
import { enqueueTelegramJob } from './telegram-events';
import { moderateImageUrl } from './moderation/image-scorer';
import { moderateText } from './moderation/text-scorer';
import { indexListing, removeListingFromIndex } from './search';
import type { ModerationVerdict } from './moderation/text-scorer';

type ModerationField = 'title' | 'description' | 'photo';

async function storeResult(input: {
  entityType: 'listing' | 'tenant_request' | 'image';
  entityId: string;
  field: ModerationField;
  verdict: ModerationVerdict;
}) {
  await db.insert(moderationResults).values({
    id: nanoid(),
    entityType: input.entityType,
    entityId: input.entityId,
    field: input.field,
    score: input.verdict.score,
    labels: input.verdict.labels,
    approved: input.verdict.approved,
  });
}

async function moderateListing(listingId: string): Promise<void> {
  const row = await db.query.listings.findFirst({ where: eq(listings.id, listingId) });
  if (!row) return;

  const verdicts: ModerationVerdict[] = [];

  verdicts.push(await moderateText(row.title));
  await storeResult({
    entityType: 'listing',
    entityId: listingId,
    field: 'title',
    verdict: verdicts.at(-1)!,
  });

  const descriptionParts = [
    row.descriptions.apartment,
    row.descriptions.location,
    row.descriptions.misc,
  ].filter(Boolean) as string[];

  for (const part of descriptionParts) {
    const verdict = await moderateText(part);
    verdicts.push(verdict);
    await storeResult({
      entityType: 'listing',
      entityId: listingId,
      field: 'description',
      verdict,
    });
  }

  for (const photoUrl of row.photoUrls) {
    const verdict = await moderateImageUrl(photoUrl);
    verdicts.push(verdict);
    await storeResult({
      entityType: 'listing',
      entityId: listingId,
      field: 'photo',
      verdict,
    });
  }

  const flagged = verdicts.some((verdict) => !verdict.approved);
  const moderationStatus = flagged ? 'flagged' : 'approved';

  await db
    .update(listings)
    .set({ moderationStatus, updatedAt: new Date() })
    .where(eq(listings.id, listingId));

  if (moderationStatus === 'approved' && row.status === 'active') {
    await indexListing(listingId);
    await enqueueNotificationJob('new_listing', listingId);
    await enqueueTelegramJob('new_listing', listingId);
    return;
  }

  await removeListingFromIndex(listingId);
}

async function moderateTenantRequest(requestId: string): Promise<void> {
  const row = await db.query.tenantRequests.findFirst({ where: eq(tenantRequests.id, requestId) });
  if (!row) return;

  const verdicts: ModerationVerdict[] = [];

  verdicts.push(await moderateText(row.title));
  await storeResult({
    entityType: 'tenant_request',
    entityId: requestId,
    field: 'title',
    verdict: verdicts.at(-1)!,
  });

  const descriptionVerdict = await moderateText(row.description);
  verdicts.push(descriptionVerdict);
  await storeResult({
    entityType: 'tenant_request',
    entityId: requestId,
    field: 'description',
    verdict: descriptionVerdict,
  });

  for (const photoUrl of row.photoUrls) {
    const verdict = await moderateImageUrl(photoUrl);
    verdicts.push(verdict);
    await storeResult({
      entityType: 'tenant_request',
      entityId: requestId,
      field: 'photo',
      verdict,
    });
  }

  const flagged = verdicts.some((verdict) => !verdict.approved);
  const moderationStatus = flagged ? 'flagged' : 'approved';

  await db
    .update(tenantRequests)
    .set({ moderationStatus, updatedAt: new Date() })
    .where(eq(tenantRequests.id, requestId));

  if (moderationStatus === 'approved' && row.status === 'active') {
    await enqueueNotificationJob('new_tenant_request', requestId);
    await enqueueTelegramJob('new_tenant_request', requestId);
  }
}

async function moderateUploadedImage(photoUrl: string): Promise<void> {
  const verdict = await moderateImageUrl(photoUrl);
  await storeResult({
    entityType: 'image',
    entityId: photoUrl,
    field: 'photo',
    verdict,
  });
}

export async function handleModerationJob(job: ModerationJob): Promise<void> {
  if (job.type === 'listing') {
    await moderateListing(job.entityId);
    return;
  }

  if (job.type === 'tenant_request') {
    await moderateTenantRequest(job.entityId);
    return;
  }

  const photoUrl = job.photoUrl ?? job.entityId;
  await moderateUploadedImage(photoUrl);
}

export async function requestListingModeration(listingId: string): Promise<void> {
  await db
    .update(listings)
    .set({ moderationStatus: 'pending', updatedAt: new Date() })
    .where(eq(listings.id, listingId));

  await removeListingFromIndex(listingId);

  const { enqueueModerationJob, moderationEnabled } = await import('./moderation-events');
  if (!moderationEnabled()) {
    await db
      .update(listings)
      .set({ moderationStatus: 'approved', updatedAt: new Date() })
      .where(eq(listings.id, listingId));
    await indexListing(listingId);
    await enqueueNotificationJob('new_listing', listingId);
    await enqueueTelegramJob('new_listing', listingId);
    return;
  }

  await enqueueModerationJob({ type: 'listing', entityId: listingId });
}

export async function requestTenantRequestModeration(requestId: string): Promise<void> {
  await db
    .update(tenantRequests)
    .set({ moderationStatus: 'pending', updatedAt: new Date() })
    .where(eq(tenantRequests.id, requestId));

  const { enqueueModerationJob, moderationEnabled } = await import('./moderation-events');
  if (!moderationEnabled()) {
    await db
      .update(tenantRequests)
      .set({ moderationStatus: 'approved', updatedAt: new Date() })
      .where(eq(tenantRequests.id, requestId));
    await enqueueNotificationJob('new_tenant_request', requestId);
    await enqueueTelegramJob('new_tenant_request', requestId);
    return;
  }

  await enqueueModerationJob({ type: 'tenant_request', entityId: requestId });
}
