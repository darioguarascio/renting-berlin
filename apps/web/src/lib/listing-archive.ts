import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { and, eq, isNotNull, isNull, lt, notExists, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { listingArchives, listings } from '../db/schema';

export const ARCHIVE_REASONS = [
  'stale_external',
  'expired_availability',
  'closed_stale',
  'draft_stale',
] as const;

export type ArchiveReason = (typeof ARCHIVE_REASONS)[number];

export type ArchivePolicy = {
  staleExternalDays: number;
  expiredGraceDays: number;
  closedStaleDays: number;
  draftStaleDays: number;
};

export const DEFAULT_ARCHIVE_POLICY: ArchivePolicy = {
  staleExternalDays: 30,
  expiredGraceDays: 7,
  closedStaleDays: 90,
  draftStaleDays: 180,
};

export type ArchiveCandidate = {
  row: typeof listings.$inferSelect;
  reason: ArchiveReason;
};

export type ArchiveRunOptions = ArchivePolicy & {
  batchSize: number;
  limit?: number;
  now?: Date;
};

export type ArchiveBatchResult = {
  archived: number;
  filesDeleted: number;
  localPhotoUrls: string[];
};

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function isLocalUploadUrl(url: string): boolean {
  return url.startsWith('/uploads/');
}

export function resolveLocalUploadPath(url: string, uploadsDir: string): string | null {
  if (!isLocalUploadUrl(url) || url.includes('..')) return null;
  const filename = path.basename(url);
  if (!filename || filename === '.' || filename === '..') return null;
  const resolved = path.resolve(uploadsDir, filename);
  const uploadsRoot = path.resolve(uploadsDir);
  if (!resolved.startsWith(`${uploadsRoot}${path.sep}`) && resolved !== uploadsRoot) {
    return null;
  }
  return resolved;
}

export function serializeListingSnapshot(row: typeof listings.$inferSelect): Record<string, unknown> {
  return {
    ...row,
    availableFrom: row.availableFrom.toISOString(),
    availableTo: row.availableTo?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    externalSyncedAt: row.externalSyncedAt?.toISOString() ?? null,
  };
}

export function classifyArchiveReason(
  row: typeof listings.$inferSelect,
  policy: ArchivePolicy,
  now = new Date(),
): ArchiveReason | null {
  if (
    row.status === 'active' &&
    row.sourceType === 'external' &&
    row.externalSyncedAt &&
    row.externalSyncedAt < daysAgo(now, policy.staleExternalDays)
  ) {
    return 'stale_external';
  }

  if (
    row.status === 'active' &&
    row.availableTo &&
    row.availableTo < daysAgo(now, policy.expiredGraceDays)
  ) {
    return 'expired_availability';
  }

  if (row.status === 'closed' && row.updatedAt < daysAgo(now, policy.closedStaleDays)) {
    return 'closed_stale';
  }

  if (
    row.status === 'draft' &&
    !row.publishedAt &&
    row.createdAt < daysAgo(now, policy.draftStaleDays)
  ) {
    return 'draft_stale';
  }

  return null;
}

async function getDb() {
  const { db } = await import('../db');
  return db;
}

function buildCandidateFilters(
  db: Awaited<ReturnType<typeof getDb>>,
  policy: ArchivePolicy,
  now: Date,
) {
  const staleExternalCutoff = daysAgo(now, policy.staleExternalDays);
  const expiredCutoff = daysAgo(now, policy.expiredGraceDays);
  const closedCutoff = daysAgo(now, policy.closedStaleDays);
  const draftCutoff = daysAgo(now, policy.draftStaleDays);

  return and(
    notExists(
      db
        .select({ id: listingArchives.id })
        .from(listingArchives)
        .where(eq(listingArchives.listingId, listings.id)),
    ),
    or(
      and(
        eq(listings.sourceType, 'external'),
        eq(listings.status, 'active'),
        isNotNull(listings.externalSyncedAt),
        lt(listings.externalSyncedAt, staleExternalCutoff),
      ),
      and(
        eq(listings.status, 'active'),
        isNotNull(listings.availableTo),
        lt(listings.availableTo, expiredCutoff),
      ),
      and(eq(listings.status, 'closed'), lt(listings.updatedAt, closedCutoff)),
      and(
        eq(listings.status, 'draft'),
        isNull(listings.publishedAt),
        lt(listings.createdAt, draftCutoff),
      ),
    ),
  );
}

export async function findArchiveCandidates(options: ArchiveRunOptions): Promise<ArchiveCandidate[]> {
  const db = await getDb();
  const now = options.now ?? new Date();
  const limit = options.limit ?? options.batchSize;

  const rows = await db.query.listings.findMany({
    where: buildCandidateFilters(db, options, now),
    limit,
  });

  const candidates: ArchiveCandidate[] = [];
  for (const row of rows) {
    const reason = classifyArchiveReason(row, options, now);
    if (reason) candidates.push({ row, reason });
  }
  return candidates;
}

async function purgeLocalUploadFiles(urls: string[], uploadsDir?: string): Promise<number> {
  if (!uploadsDir) return 0;

  const uniqueUrls = [...new Set(urls.filter(isLocalUploadUrl))];
  let deleted = 0;

  for (const url of uniqueUrls) {
    const filePath = resolveLocalUploadPath(url, uploadsDir);
    if (!filePath) continue;
    try {
      await unlink(filePath);
      deleted += 1;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw err;
    }
  }

  return deleted;
}

export async function archiveListingBatch(
  candidates: ArchiveCandidate[],
  options: { dryRun: boolean; uploadsDir?: string },
): Promise<ArchiveBatchResult> {
  const localPhotoUrls = candidates.flatMap(({ row }) => row.photoUrls.filter(isLocalUploadUrl));

  if (candidates.length === 0) {
    return { archived: 0, filesDeleted: 0, localPhotoUrls: [] };
  }

  if (options.dryRun) {
    return {
      archived: candidates.length,
      filesDeleted: 0,
      localPhotoUrls: [...new Set(localPhotoUrls)],
    };
  }

  const db = await getDb();
  const archivedAt = new Date();

  await db.transaction(async (tx) => {
    for (const { row, reason } of candidates) {
      await tx.insert(listingArchives).values({
        id: nanoid(),
        listingId: row.id,
        archivedAt,
        reason,
        snapshot: serializeListingSnapshot(row),
      });

      await tx
        .update(listings)
        .set({
          status: 'closed',
          photoUrls: [],
          descriptions: {},
          updatedAt: archivedAt,
        })
        .where(eq(listings.id, row.id));
    }
  });

  const filesDeleted = await purgeLocalUploadFiles(localPhotoUrls, options.uploadsDir);

  return {
    archived: candidates.length,
    filesDeleted,
    localPhotoUrls: [...new Set(localPhotoUrls)],
  };
}

export async function archiveOldListings(options: ArchiveRunOptions & { dryRun: boolean; uploadsDir?: string }) {
  const totals = {
    archived: 0,
    filesDeleted: 0,
    batches: 0,
    localPhotoUrls: new Set<string>(),
    byReason: Object.fromEntries(ARCHIVE_REASONS.map((reason) => [reason, 0])) as Record<
      ArchiveReason,
      number
    >,
  };

  while (true) {
    const remainingLimit =
      options.limit !== undefined ? Math.max(0, options.limit - totals.archived) : undefined;
    if (remainingLimit === 0) break;

    const candidates = await findArchiveCandidates({
      ...options,
      batchSize: options.batchSize,
      limit: remainingLimit ?? options.batchSize,
    });
    if (candidates.length === 0) break;

    for (const candidate of candidates) {
      totals.byReason[candidate.reason] += 1;
    }

    const result = await archiveListingBatch(candidates, {
      dryRun: options.dryRun,
      uploadsDir: options.uploadsDir,
    });

    totals.archived += result.archived;
    totals.filesDeleted += result.filesDeleted;
    totals.batches += 1;
    for (const url of result.localPhotoUrls) totals.localPhotoUrls.add(url);

    if (options.dryRun) break;
  }

  if (!options.dryRun && totals.archived > 0) {
    const { warmListingCache } = await import('./search');
    await warmListingCache();
  }

  return {
    ...totals,
    localPhotoUrls: [...totals.localPhotoUrls],
  };
}

export function parseArchivePolicyFromArgs(argv: string[]): ArchivePolicy & {
  batchSize: number;
  limit?: number;
  dryRun: boolean;
} {
  const readNumberFlag = (flag: string, fallback: number) => {
    const index = argv.indexOf(flag);
    if (index === -1) return fallback;
    const value = Number(argv[index + 1]);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid value for ${flag}`);
    }
    return value;
  };

  const limitFlag = argv.indexOf('--limit');
  const limit =
    limitFlag === -1 ? undefined : readNumberFlag('--limit', Number.NaN);

  return {
    staleExternalDays: readNumberFlag('--stale-external-days', DEFAULT_ARCHIVE_POLICY.staleExternalDays),
    expiredGraceDays: readNumberFlag('--expired-grace-days', DEFAULT_ARCHIVE_POLICY.expiredGraceDays),
    closedStaleDays: readNumberFlag('--closed-days', DEFAULT_ARCHIVE_POLICY.closedStaleDays),
    draftStaleDays: readNumberFlag('--draft-days', DEFAULT_ARCHIVE_POLICY.draftStaleDays),
    batchSize: readNumberFlag('--batch-size', 200),
    limit,
    dryRun: argv.includes('--dry-run'),
  };
}
