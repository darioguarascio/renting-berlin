import { and, asc, eq, ne } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { stayClaims, stayOffers, users } from '../db/schema';
import { notifyUser } from './notifications';
import type { StayClaimStatus } from './stay-access';

export interface StayClaimView {
  id: string;
  offerId: string;
  claimantId: string;
  claimantName: string;
  claimantHandle: string | null;
  claimantImage: string | null;
  status: StayClaimStatus;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
}

function userLabel(user: { name: string; handle: string | null } | undefined | null): string {
  if (!user) return 'Someone';
  return user.handle ? `@${user.handle}` : user.name;
}

export async function listClaimsForOffer(offerId: string): Promise<StayClaimView[]> {
  const rows = await db
    .select({
      id: stayClaims.id,
      offerId: stayClaims.offerId,
      claimantId: stayClaims.claimantId,
      status: stayClaims.status,
      message: stayClaims.message,
      createdAt: stayClaims.createdAt,
      respondedAt: stayClaims.respondedAt,
      name: users.name,
      handle: users.handle,
      image: users.image,
    })
    .from(stayClaims)
    .innerJoin(users, eq(users.id, stayClaims.claimantId))
    .where(eq(stayClaims.offerId, offerId))
    .orderBy(asc(stayClaims.createdAt));

  return rows.map((r) => ({
    id: r.id,
    offerId: r.offerId,
    claimantId: r.claimantId,
    claimantName: r.name,
    claimantHandle: r.handle,
    claimantImage: r.image,
    status: r.status,
    message: r.message,
    createdAt: r.createdAt.toISOString(),
    respondedAt: r.respondedAt?.toISOString() ?? null,
  }));
}

export async function getClaimForUser(offerId: string, userId: string): Promise<StayClaimView | null> {
  const claims = await listClaimsForOffer(offerId);
  return claims.find((c) => c.claimantId === userId) ?? null;
}

export type CreateClaimResult =
  | { ok: true; status: StayClaimStatus }
  | { ok: false; reason: 'not_open' | 'is_host' | 'already_claimed' };

export async function createClaim(
  offerId: string,
  userId: string,
  message?: string,
): Promise<CreateClaimResult> {
  const offer = await db.query.stayOffers.findFirst({ where: eq(stayOffers.id, offerId) });
  if (!offer) return { ok: false, reason: 'not_open' };
  if (offer.hostId === userId) return { ok: false, reason: 'is_host' };
  if (offer.status !== 'open') return { ok: false, reason: 'not_open' };

  const existing = await db.query.stayClaims.findFirst({
    where: and(eq(stayClaims.offerId, offerId), eq(stayClaims.claimantId, userId)),
  });
  if (existing && existing.status !== 'withdrawn') {
    return { ok: false, reason: 'already_claimed' };
  }

  if (existing) {
    await db
      .update(stayClaims)
      .set({ status: 'interested', message: message ?? null, respondedAt: null })
      .where(eq(stayClaims.id, existing.id));
  } else {
    await db.insert(stayClaims).values({
      id: nanoid(),
      offerId,
      claimantId: userId,
      message: message?.trim() || null,
    });
  }

  const claimant = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { name: true, handle: true },
  });

  // Pure first-come-first-serve: auto-accept the first claimant.
  if (offer.autoAcceptFirst) {
    const accepted = await acceptFirstAvailable(offerId, userId);
    if (accepted) return { ok: true, status: 'accepted' };
  }

  await notifyUser({
    userId: offer.hostId,
    event: 'stays',
    type: 'stay_claim_new',
    title: 'Someone wants your place',
    body: `${userLabel(claimant)} wants to take "${offer.title}".`,
    link: `/house-sitting/${offerId}`,
  });

  return { ok: true, status: 'interested' };
}

/** Accept a specific claimant atomically and block everyone else. */
async function acceptClaimInternal(offerId: string, claimId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const offer = await tx.query.stayOffers.findFirst({ where: eq(stayOffers.id, offerId) });
    if (!offer || offer.status !== 'open') return false;

    const claim = await tx.query.stayClaims.findFirst({ where: eq(stayClaims.id, claimId) });
    if (!claim || claim.offerId !== offerId || claim.status !== 'interested') return false;

    const now = new Date();
    await tx
      .update(stayClaims)
      .set({ status: 'accepted', respondedAt: now })
      .where(eq(stayClaims.id, claimId));

    await tx
      .update(stayClaims)
      .set({ status: 'declined', respondedAt: now })
      .where(
        and(
          eq(stayClaims.offerId, offerId),
          eq(stayClaims.status, 'interested'),
          ne(stayClaims.id, claimId),
        ),
      );

    await tx
      .update(stayOffers)
      .set({ status: 'taken', takenByUserId: claim.claimantId, updatedAt: now })
      .where(eq(stayOffers.id, offerId));

    return true;
  });
}

async function acceptFirstAvailable(offerId: string, claimantId: string): Promise<boolean> {
  const claim = await db.query.stayClaims.findFirst({
    where: and(eq(stayClaims.offerId, offerId), eq(stayClaims.claimantId, claimantId)),
  });
  if (!claim) return false;
  const accepted = await acceptClaimInternal(offerId, claim.id);
  if (accepted) await fanoutAcceptance(offerId, claim.id);
  return accepted;
}

/** Notify the accepted guest and everyone who got blocked. */
async function fanoutAcceptance(offerId: string, acceptedClaimId: string): Promise<void> {
  const offer = await db.query.stayOffers.findFirst({ where: eq(stayOffers.id, offerId) });
  if (!offer) return;
  const claims = await listClaimsForOffer(offerId);

  for (const claim of claims) {
    if (claim.id === acceptedClaimId) {
      await notifyUser({
        userId: claim.claimantId,
        event: 'stays',
        type: 'stay_claim_accepted',
        title: 'Your stay is confirmed',
        body: `You got "${offer.title}". The host shared the access details.`,
        link: `/house-sitting/${offerId}`,
      });
    } else if (claim.status === 'declined' && claim.respondedAt) {
      await notifyUser({
        userId: claim.claimantId,
        event: 'stays',
        type: 'stay_claim_declined',
        title: 'Stay already taken',
        body: `"${offer.title}" was given to someone else.`,
        link: `/house-sitting/${offerId}`,
      });
    }
  }
}

export type RespondResult =
  | { ok: true; action: 'accepted' | 'declined' }
  | { ok: false; reason: 'not_found' | 'not_host' | 'not_open' | 'invalid_state' };

export async function respondToClaim(
  hostId: string,
  claimId: string,
  action: 'accept' | 'decline',
): Promise<RespondResult> {
  const claim = await db.query.stayClaims.findFirst({ where: eq(stayClaims.id, claimId) });
  if (!claim) return { ok: false, reason: 'not_found' };

  const offer = await db.query.stayOffers.findFirst({ where: eq(stayOffers.id, claim.offerId) });
  if (!offer) return { ok: false, reason: 'not_found' };
  if (offer.hostId !== hostId) return { ok: false, reason: 'not_host' };
  if (claim.status !== 'interested') return { ok: false, reason: 'invalid_state' };

  if (action === 'accept') {
    const accepted = await acceptClaimInternal(offer.id, claimId);
    if (!accepted) return { ok: false, reason: 'not_open' };
    await fanoutAcceptance(offer.id, claimId);
    return { ok: true, action: 'accepted' };
  }

  await db
    .update(stayClaims)
    .set({ status: 'declined', respondedAt: new Date() })
    .where(eq(stayClaims.id, claimId));

  await notifyUser({
    userId: claim.claimantId,
    event: 'stays',
    type: 'stay_claim_declined',
    title: 'Stay request declined',
    body: `The host can't host you for "${offer.title}" this time.`,
    link: `/house-sitting/${offer.id}`,
  });
  return { ok: true, action: 'declined' };
}

export async function withdrawClaim(userId: string, claimId: string): Promise<boolean> {
  const claim = await db.query.stayClaims.findFirst({ where: eq(stayClaims.id, claimId) });
  if (!claim || claim.claimantId !== userId || claim.status !== 'interested') return false;
  await db
    .update(stayClaims)
    .set({ status: 'withdrawn', respondedAt: new Date() })
    .where(eq(stayClaims.id, claimId));
  return true;
}
