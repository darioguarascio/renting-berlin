import { and, desc, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { db } from '../db';
import { stayOffers, stayOfferAudience, users } from '../db/schema';
import { areConnected, getConnectionUserIds } from './connections';
import { notifyUser } from './notifications';
import {
  canViewStayAccessDetails,
  canViewStayOffer,
  type StayOfferStatus,
  type StayOfferVisibility,
} from './stay-access';
import {
  getClaimForUser,
  listClaimsForOffer,
  type StayClaimView,
} from './stay-claims';

export const stayOfferInputSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    note: z.string().trim().max(2000).optional(),
    locationLabel: z.string().trim().min(2).max(120),
    accessDetails: z.string().trim().max(2000).optional(),
    availableFrom: z.string().min(1),
    availableTo: z.string().min(1),
    visibility: z.enum(['connections', 'selected']).default('connections'),
    autoAcceptFirst: z.boolean().default(false),
    audienceUserIds: z.array(z.string()).optional(),
    photoUrls: z.array(z.string()).max(8).optional(),
  })
  .refine((v) => new Date(v.availableTo) >= new Date(v.availableFrom), {
    message: 'End date must be after start date',
    path: ['availableTo'],
  });

export type StayOfferInput = z.infer<typeof stayOfferInputSchema>;

export interface StayOfferView {
  id: string;
  hostId: string;
  hostName: string;
  hostHandle: string | null;
  hostImage: string | null;
  title: string;
  note: string | null;
  locationLabel: string;
  accessDetails: string | null;
  availableFrom: string;
  availableTo: string;
  status: StayOfferStatus;
  visibility: StayOfferVisibility;
  autoAcceptFirst: boolean;
  photoUrls: string[];
  isHost: boolean;
  takenByUserId: string | null;
  myClaim: StayClaimView | null;
  claimCount: number;
  claims: StayClaimView[] | null;
  createdAt: string;
}

function parseDate(value: string): Date {
  return value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00.000Z`);
}

export async function createStayOffer(hostId: string, input: StayOfferInput) {
  const data = stayOfferInputSchema.parse(input);
  const id = nanoid();

  // Restrict the selected audience to actual connections.
  let audienceIds: string[] = [];
  if (data.visibility === 'selected' && data.audienceUserIds?.length) {
    const connectionIds = new Set(await getConnectionUserIds(hostId));
    audienceIds = data.audienceUserIds.filter((uid) => connectionIds.has(uid));
  }

  const [row] = await db
    .insert(stayOffers)
    .values({
      id,
      hostId,
      title: data.title,
      note: data.note || null,
      locationLabel: data.locationLabel,
      accessDetails: data.accessDetails || null,
      availableFrom: parseDate(data.availableFrom),
      availableTo: parseDate(data.availableTo),
      visibility: data.visibility,
      autoAcceptFirst: data.autoAcceptFirst,
      photoUrls: data.photoUrls ?? [],
    })
    .returning();

  if (data.visibility === 'selected' && audienceIds.length) {
    await db
      .insert(stayOfferAudience)
      .values(audienceIds.map((uid) => ({ offerId: id, userId: uid })))
      .onConflictDoNothing();
  }

  await notifyAudienceOfNewOffer(row.id, hostId, audienceIds);
  return row;
}

async function notifyAudienceOfNewOffer(
  offerId: string,
  hostId: string,
  selectedIds: string[],
): Promise<void> {
  const offer = await db.query.stayOffers.findFirst({ where: eq(stayOffers.id, offerId) });
  if (!offer) return;

  const recipientIds =
    offer.visibility === 'selected' ? selectedIds : await getConnectionUserIds(hostId);
  if (recipientIds.length === 0) return;

  const host = await db.query.users.findFirst({
    where: eq(users.id, hostId),
    columns: { name: true, handle: true },
  });
  const hostLabel = host?.handle ? `@${host.handle}` : host?.name ?? 'A friend';

  for (const userId of recipientIds) {
    await notifyUser({
      userId,
      event: 'stays',
      type: 'stay_offer_new',
      title: `${hostLabel}'s place is free`,
      body: `${offer.title} · ${offer.locationLabel}`,
      link: `/house-sitting/${offerId}`,
      dedupeKey: `stay_offer:${offerId}:${userId}`,
    });
  }
}

function buildView(
  row: typeof stayOffers.$inferSelect,
  host: { name: string; handle: string | null; image: string | null } | undefined,
  viewerId: string,
  extras: { myClaim: StayClaimView | null; claimCount: number; claims: StayClaimView[] | null },
): StayOfferView {
  const isHost = row.hostId === viewerId;
  const isAcceptedGuest = row.takenByUserId === viewerId;
  const showAccess = canViewStayAccessDetails({ isHost, isAcceptedGuest });
  return {
    id: row.id,
    hostId: row.hostId,
    hostName: host?.name ?? 'A friend',
    hostHandle: host?.handle ?? null,
    hostImage: host?.image ?? null,
    title: row.title,
    note: row.note,
    locationLabel: row.locationLabel,
    accessDetails: showAccess ? row.accessDetails : null,
    availableFrom: row.availableFrom.toISOString(),
    availableTo: row.availableTo.toISOString(),
    status: row.status,
    visibility: row.visibility,
    autoAcceptFirst: row.autoAcceptFirst,
    photoUrls: row.photoUrls,
    isHost,
    takenByUserId: row.takenByUserId,
    myClaim: extras.myClaim,
    claimCount: extras.claimCount,
    claims: extras.claims,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadHosts(hostIds: string[]) {
  if (hostIds.length === 0) return new Map<string, { name: string; handle: string | null; image: string | null }>();
  const people = await db.query.users.findMany({
    where: inArray(users.id, hostIds),
    columns: { id: true, name: true, handle: true, image: true },
  });
  return new Map(people.map((p) => [p.id, { name: p.name, handle: p.handle, image: p.image }]));
}

/** Open offers visible to the viewer through their connections (excluding their own). */
export async function listStayFeed(viewerId: string): Promise<StayOfferView[]> {
  const connectionIds = await getConnectionUserIds(viewerId);

  const fromConnections =
    connectionIds.length > 0
      ? await db.query.stayOffers.findMany({
          where: and(
            inArray(stayOffers.hostId, connectionIds),
            eq(stayOffers.visibility, 'connections'),
            eq(stayOffers.status, 'open'),
          ),
          orderBy: [desc(stayOffers.createdAt)],
        })
      : [];

  const selectedRows = await db
    .select({ offerId: stayOfferAudience.offerId })
    .from(stayOfferAudience)
    .where(eq(stayOfferAudience.userId, viewerId));
  const selectedOfferIds = selectedRows.map((r) => r.offerId);
  const fromSelected = selectedOfferIds.length
    ? await db.query.stayOffers.findMany({
        where: and(inArray(stayOffers.id, selectedOfferIds), eq(stayOffers.status, 'open')),
        orderBy: [desc(stayOffers.createdAt)],
      })
    : [];

  const byId = new Map<string, typeof stayOffers.$inferSelect>();
  for (const row of [...fromConnections, ...fromSelected]) {
    if (row.hostId !== viewerId) byId.set(row.id, row);
  }
  const rows = [...byId.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const hosts = await loadHosts(rows.map((r) => r.hostId));
  const views: StayOfferView[] = [];
  for (const row of rows) {
    const myClaim = await getClaimForUser(row.id, viewerId);
    views.push(
      buildView(row, hosts.get(row.hostId), viewerId, {
        myClaim,
        claimCount: 0,
        claims: null,
      }),
    );
  }
  return views;
}

export async function listMyStayOffers(hostId: string): Promise<StayOfferView[]> {
  const rows = await db.query.stayOffers.findMany({
    where: eq(stayOffers.hostId, hostId),
    orderBy: [desc(stayOffers.createdAt)],
  });
  const host = await loadHosts([hostId]);
  const views: StayOfferView[] = [];
  for (const row of rows) {
    const claims = await listClaimsForOffer(row.id);
    const active = claims.filter((c) => c.status === 'interested');
    views.push(
      buildView(row, host.get(hostId), hostId, {
        myClaim: null,
        claimCount: active.length,
        claims,
      }),
    );
  }
  return views;
}

export async function getStayOffer(
  viewerId: string,
  offerId: string,
): Promise<{ ok: true; offer: StayOfferView } | { ok: false; reason: 'not_found' | 'forbidden' }> {
  const row = await db.query.stayOffers.findFirst({ where: eq(stayOffers.id, offerId) });
  if (!row) return { ok: false, reason: 'not_found' };

  const isHost = row.hostId === viewerId;
  let isSelectedAudience = false;
  if (row.visibility === 'selected') {
    const audience = await db.query.stayOfferAudience.findFirst({
      where: and(eq(stayOfferAudience.offerId, offerId), eq(stayOfferAudience.userId, viewerId)),
    });
    isSelectedAudience = Boolean(audience);
  }
  const isConnected = isHost ? true : await areConnected(row.hostId, viewerId);

  if (!canViewStayOffer({ isHost, visibility: row.visibility, isConnected, isSelectedAudience })) {
    return { ok: false, reason: 'forbidden' };
  }

  const host = await loadHosts([row.hostId]);
  const allClaims = isHost ? await listClaimsForOffer(offerId) : null;
  const myClaim = isHost ? null : await getClaimForUser(offerId, viewerId);
  const claimCount = allClaims ? allClaims.filter((c) => c.status === 'interested').length : 0;

  return {
    ok: true,
    offer: buildView(row, host.get(row.hostId), viewerId, {
      myClaim,
      claimCount,
      claims: allClaims,
    }),
  };
}

export async function cancelStayOffer(hostId: string, offerId: string): Promise<boolean> {
  const result = await db
    .update(stayOffers)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(stayOffers.id, offerId), eq(stayOffers.hostId, hostId)))
    .returning({ id: stayOffers.id });
  return result.length > 0;
}

export async function updateStayOffer(
  hostId: string,
  offerId: string,
  patch: { status?: StayOfferStatus },
): Promise<boolean> {
  if (!patch.status) return false;
  const result = await db
    .update(stayOffers)
    .set({ status: patch.status, updatedAt: new Date() })
    .where(and(eq(stayOffers.id, offerId), eq(stayOffers.hostId, hostId)))
    .returning({ id: stayOffers.id });
  return result.length > 0;
}
