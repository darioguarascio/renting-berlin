import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findMany, transaction, select } = vi.hoisted(() => ({
  findMany: vi.fn(),
  transaction: vi.fn(),
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({})),
    })),
  })),
}));

vi.mock('../db', () => ({
  db: {
    query: {
      listings: {
        findMany,
      },
    },
    transaction,
    select,
  },
}));

import {
  ARCHIVE_REASONS,
  archiveListingBatch,
  archiveOldListings,
  classifyArchiveReason,
  DEFAULT_ARCHIVE_POLICY,
  findArchiveCandidates,
  isLocalUploadUrl,
  parseArchivePolicyFromArgs,
  resolveLocalUploadPath,
  serializeListingSnapshot,
} from './listing-archive';
import type { listings } from '../db/schema';

const now = new Date('2026-09-28T12:00:00.000Z');

function listing(overrides: Partial<typeof listings.$inferSelect> = {}): typeof listings.$inferSelect {
  return {
    id: 'listing_1',
    slug: 'sample-listing',
    shortCode: 'abc12345',
    publisherId: 'user_1',
    title: 'Sample listing',
    status: 'active',
    category: 'apartment',
    rentType: 'long_term',
    availableFrom: new Date('2026-01-01T12:00:00.000Z'),
    availableTo: null,
    sizeSqm: 50,
    rooms: 2,
    floorLevel: null,
    onlineViewingAvailable: false,
    anmeldungAvailable: false,
    schufaRequired: false,
    address: 'Sample street 1',
    neighborhood: 'mitte',
    lat: 52.52,
    lng: 13.405,
    approximateLocation: false,
    hidePublisherName: false,
    hideReviewerNames: false,
    costs: { rentPerMonth: 900 },
    descriptions: { apartment: 'Nice place' },
    requiredDocuments: [],
    requiredDocumentsOther: null,
    equipment: [],
    photoUrls: ['/uploads/photo.jpg', 'https://cdn.example.com/photo.jpg'],
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
    publishedAt: new Date('2026-01-02T12:00:00.000Z'),
    moderationStatus: 'approved',
    sourceType: 'native',
    externalUrl: null,
    externalProvider: null,
    externalSourceId: null,
    externalSyncedAt: null,
    ...overrides,
  };
}

describe('listing-archive', () => {
  beforeEach(() => {
    findMany.mockReset();
    transaction.mockReset();
  });

  it('classifies stale external listings', () => {
    const row = listing({
      sourceType: 'external',
      externalSyncedAt: new Date('2026-08-01T12:00:00.000Z'),
    });
    expect(classifyArchiveReason(row, DEFAULT_ARCHIVE_POLICY, now)).toBe('stale_external');
  });

  it('classifies expired availability after grace period', () => {
    const row = listing({
      availableTo: new Date('2026-09-10T12:00:00.000Z'),
    });
    expect(classifyArchiveReason(row, DEFAULT_ARCHIVE_POLICY, now)).toBe('expired_availability');
  });

  it('classifies old closed listings', () => {
    const row = listing({
      status: 'closed',
      updatedAt: new Date('2026-05-01T12:00:00.000Z'),
    });
    expect(classifyArchiveReason(row, DEFAULT_ARCHIVE_POLICY, now)).toBe('closed_stale');
  });

  it('classifies stale drafts', () => {
    const row = listing({
      status: 'draft',
      publishedAt: null,
      createdAt: new Date('2026-01-01T12:00:00.000Z'),
    });
    expect(classifyArchiveReason(row, DEFAULT_ARCHIVE_POLICY, now)).toBe('draft_stale');
  });

  it('keeps active native listings that are still fresh', () => {
    const row = listing({
      updatedAt: new Date('2026-09-20T12:00:00.000Z'),
      externalSyncedAt: new Date('2026-09-20T12:00:00.000Z'),
    });
    expect(classifyArchiveReason(row, DEFAULT_ARCHIVE_POLICY, now)).toBeNull();
  });

  it('detects local upload urls and resolves safe paths', () => {
    expect(isLocalUploadUrl('/uploads/photo.jpg')).toBe(true);
    expect(isLocalUploadUrl('https://example.com/photo.jpg')).toBe(false);
    expect(resolveLocalUploadPath('/uploads/photo.jpg', '/data/uploads')).toBe('/data/uploads/photo.jpg');
    expect(resolveLocalUploadPath('/uploads/../secret.txt', '/data/uploads')).toBeNull();
  });

  it('serializes listing snapshots with ISO timestamps', () => {
    const row = listing();
    const snapshot = serializeListingSnapshot(row);
    expect(snapshot.availableFrom).toBe('2026-01-01T12:00:00.000Z');
    expect(snapshot.photoUrls).toEqual(row.photoUrls);
  });

  it('documents supported archive reasons', () => {
    expect(ARCHIVE_REASONS).toEqual([
      'stale_external',
      'expired_availability',
      'closed_stale',
      'draft_stale',
    ]);
  });

  it('parses archive CLI flags', () => {
    expect(
      parseArchivePolicyFromArgs([
        '--dry-run',
        '--stale-external-days',
        '14',
        '--batch-size',
        '50',
        '--limit',
        '10',
      ]),
    ).toEqual({
      staleExternalDays: 14,
      expiredGraceDays: DEFAULT_ARCHIVE_POLICY.expiredGraceDays,
      closedStaleDays: DEFAULT_ARCHIVE_POLICY.closedStaleDays,
      draftStaleDays: DEFAULT_ARCHIVE_POLICY.draftStaleDays,
      batchSize: 50,
      limit: 10,
      dryRun: true,
    });
  });

  it('finds archive candidates from the database', async () => {
    const row = listing({
      sourceType: 'external',
      externalSyncedAt: new Date('2026-08-01T12:00:00.000Z'),
    });
    findMany.mockResolvedValue([row]);

    const candidates = await findArchiveCandidates({
      ...DEFAULT_ARCHIVE_POLICY,
      batchSize: 10,
      now,
    });

    expect(candidates).toEqual([{ row, reason: 'stale_external' }]);
  });

  it('archives a batch in dry-run mode without touching the database', async () => {
    const row = listing();
    const result = await archiveListingBatch([{ row, reason: 'closed_stale' }], {
      dryRun: true,
      uploadsDir: '/data/uploads',
    });

    expect(result.archived).toBe(1);
    expect(result.filesDeleted).toBe(0);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('archives old listings in a single dry-run batch', async () => {
    const row = listing({
      sourceType: 'external',
      externalSyncedAt: new Date('2026-08-01T12:00:00.000Z'),
    });
    findMany.mockResolvedValueOnce([row]).mockResolvedValueOnce([]);

    const result = await archiveOldListings({
      ...DEFAULT_ARCHIVE_POLICY,
      batchSize: 10,
      dryRun: true,
      now,
    });

    expect(result.archived).toBe(1);
    expect(result.byReason.stale_external).toBe(1);
    expect(transaction).not.toHaveBeenCalled();
  });
});
