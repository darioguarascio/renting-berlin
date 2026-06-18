import { and, desc, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { agreements, conversations, listings, messages, users } from '../db/schema';
import { parseDate } from './dates';
import { sendMessage } from './messages';
import {
  DEFAULT_REJECTION_MESSAGE,
  proposeAgreementSchema,
  type AgreementAction,
  type ProposeAgreementInput,
  type RejectOthersInput,
} from './agreement-schema';

export { DEFAULT_REJECTION_MESSAGE };

type AgreementRow = typeof agreements.$inferSelect;
type ConversationRow = typeof conversations.$inferSelect;

function toDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export type AgreementDTO = {
  id: string;
  status: AgreementRow['status'];
  title: string;
  monthlyRent: number;
  deposit: number | null;
  startDate: string;
  endDate: string | null;
  terms: string | null;
  proposerId: string;
  counterpartyId: string;
  proposerSignatureName: string;
  proposerSignedAt: string;
  counterpartySignatureName: string | null;
  counterpartySignedAt: string | null;
  declineReason: string | null;
  resolvedAt: string | null;
  createdAt: string;
  viewerIsProposer: boolean;
  viewerHasSigned: boolean;
};

function toAgreementDTO(row: AgreementRow, viewerId: string): AgreementDTO {
  const viewerIsProposer = row.proposerId === viewerId;
  return {
    id: row.id,
    status: row.status,
    title: row.title,
    monthlyRent: row.monthlyRent,
    deposit: row.deposit,
    startDate: toDateOnly(row.startDate)!,
    endDate: toDateOnly(row.endDate),
    terms: row.terms,
    proposerId: row.proposerId,
    counterpartyId: row.counterpartyId,
    proposerSignatureName: row.proposerSignatureName,
    proposerSignedAt: row.proposerSignedAt.toISOString(),
    counterpartySignatureName: row.counterpartySignatureName,
    counterpartySignedAt: row.counterpartySignedAt?.toISOString() ?? null,
    declineReason: row.declineReason,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    viewerIsProposer,
    viewerHasSigned: viewerIsProposer || row.status === 'signed',
  };
}

async function requireParticipant(conversationId: string, userId: string): Promise<ConversationRow> {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!conv) throw new Error('Conversation not found');
  if (conv.publisherId !== userId && conv.inquirerId !== userId) {
    throw new Error('Not a participant');
  }
  return conv;
}

async function getLatestAgreement(conversationId: string): Promise<AgreementRow | undefined> {
  return db.query.agreements.findFirst({
    where: eq(agreements.conversationId, conversationId),
    orderBy: [desc(agreements.createdAt)],
  });
}

/** Conversations about the same listing held by this landlord that actually have messages. */
async function getOtherActiveListingConversations(
  listingId: string,
  publisherId: string,
  exceptConversationId?: string,
): Promise<ConversationRow[]> {
  const convs = await db.query.conversations.findMany({
    where: and(
      eq(conversations.listingId, listingId),
      eq(conversations.publisherId, publisherId),
    ),
  });
  const others = convs.filter((c) => c.id !== exceptConversationId);
  if (others.length === 0) return [];

  const withMessages = await db
    .select({ conversationId: messages.conversationId })
    .from(messages)
    .where(
      inArray(
        messages.conversationId,
        others.map((c) => c.id),
      ),
    )
    .groupBy(messages.conversationId);
  const active = new Set(withMessages.map((m) => m.conversationId));
  return others.filter((c) => active.has(c.id));
}

export type AgreementContext = {
  conversation: {
    id: string;
    contextKind: 'listing' | 'seeker';
    listingId: string | null;
    listingTitle: string | null;
    otherUserName: string;
    viewerIsLandlord: boolean;
  };
  agreement: AgreementDTO | null;
  canPropose: boolean;
  rejectableCount: number;
  defaults: {
    title: string;
    monthlyRent: number;
    deposit: number | null;
    startDate: string;
    endDate: string | null;
  };
};

export async function getConversationAgreementContext(
  conversationId: string,
  userId: string,
): Promise<AgreementContext | null> {
  const conv = await requireParticipant(conversationId, userId);

  const otherUserId = conv.publisherId === userId ? conv.inquirerId : conv.publisherId;
  const [otherUser, listing, latest] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, otherUserId), columns: { name: true } }),
    conv.listingId
      ? db.query.listings.findFirst({ where: eq(listings.id, conv.listingId) })
      : Promise.resolve(null),
    getLatestAgreement(conversationId),
  ]);

  const contextKind: 'listing' | 'seeker' = conv.listingId ? 'listing' : 'seeker';
  const viewerIsLandlord = contextKind === 'listing' && conv.publisherId === userId;

  const isLive = latest && (latest.status === 'proposed' || latest.status === 'signed');
  const canPropose = !isLive;

  let rejectableCount = 0;
  if (viewerIsLandlord && conv.listingId) {
    const others = await getOtherActiveListingConversations(
      conv.listingId,
      userId,
      conversationId,
    );
    rejectableCount = others.length;
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const defaults = {
    title: listing ? `Rental agreement — ${listing.title}` : 'Rental agreement',
    monthlyRent: listing?.costs.rentPerMonth ?? 0,
    deposit: listing?.costs.deposit ?? null,
    startDate: listing ? toDateOnly(listing.availableFrom) ?? todayIso : todayIso,
    endDate: listing ? toDateOnly(listing.availableTo) : null,
  };

  return {
    conversation: {
      id: conv.id,
      contextKind,
      listingId: conv.listingId,
      listingTitle: listing?.title ?? null,
      otherUserName: otherUser?.name ?? 'the other party',
      viewerIsLandlord,
    },
    agreement: latest ? toAgreementDTO(latest, userId) : null,
    canPropose,
    rejectableCount,
    defaults,
  };
}

export async function proposeAgreement(
  conversationId: string,
  userId: string,
  rawInput: ProposeAgreementInput,
): Promise<AgreementDTO> {
  const input = proposeAgreementSchema.parse(rawInput);
  const conv = await requireParticipant(conversationId, userId);

  const existing = await getLatestAgreement(conversationId);
  if (existing && (existing.status === 'proposed' || existing.status === 'signed')) {
    throw new Error('An agreement is already in progress for this conversation');
  }

  const counterpartyId = conv.publisherId === userId ? conv.inquirerId : conv.publisherId;
  const startDate = parseDate(input.startDate);
  const endDate = input.endDate ? parseDate(input.endDate) : null;
  if (endDate && endDate < startDate) {
    throw new Error('End date cannot be before the start date');
  }

  const [row] = await db
    .insert(agreements)
    .values({
      id: nanoid(),
      conversationId,
      listingId: conv.listingId ?? null,
      proposerId: userId,
      counterpartyId,
      status: 'proposed',
      title: input.title,
      monthlyRent: input.monthlyRent,
      deposit: input.deposit ?? null,
      startDate,
      endDate,
      terms: input.terms?.trim() ? input.terms.trim() : null,
      proposerSignatureName: input.signatureName,
      proposerSignedAt: new Date(),
    })
    .returning();

  await postSystemMessage(
    conversationId,
    userId,
    `📄 Proposed a rental agreement: “${row.title}”. Open it from the banner above to review and sign.`,
  );

  if (input.rejectOthers && conv.listingId && conv.publisherId === userId) {
    await rejectOtherListingConversations(conv.listingId, userId, {
      exceptConversationId: conversationId,
      message: input.rejectMessage,
    });
  }

  return toAgreementDTO(row, userId);
}

export async function actOnAgreement(
  agreementId: string,
  userId: string,
  action: AgreementAction,
): Promise<AgreementDTO> {
  const row = await db.query.agreements.findFirst({ where: eq(agreements.id, agreementId) });
  if (!row) throw new Error('Agreement not found');
  if (row.proposerId !== userId && row.counterpartyId !== userId) {
    throw new Error('Not a participant');
  }
  if (row.status !== 'proposed') {
    throw new Error('This agreement can no longer be changed');
  }

  const now = new Date();

  if (action.action === 'sign') {
    if (row.counterpartyId !== userId) {
      throw new Error('Only the other party can sign this agreement');
    }
    const [updated] = await db
      .update(agreements)
      .set({
        status: 'signed',
        counterpartySignatureName: action.signatureName,
        counterpartySignedAt: now,
        resolvedAt: now,
        updatedAt: now,
      })
      .where(eq(agreements.id, agreementId))
      .returning();
    await postSystemMessage(
      row.conversationId,
      userId,
      `✅ Signed the agreement “${row.title}”. It is now binding for both parties.`,
    );
    return toAgreementDTO(updated, userId);
  }

  if (action.action === 'decline') {
    if (row.counterpartyId !== userId) {
      throw new Error('The proposer can withdraw, not decline');
    }
    const [updated] = await db
      .update(agreements)
      .set({
        status: 'declined',
        declineReason: action.reason?.trim() ? action.reason.trim() : null,
        resolvedAt: now,
        updatedAt: now,
      })
      .where(eq(agreements.id, agreementId))
      .returning();
    await postSystemMessage(
      row.conversationId,
      userId,
      `❌ Declined the proposed agreement “${row.title}”.`,
    );
    return toAgreementDTO(updated, userId);
  }

  // withdraw
  if (row.proposerId !== userId) {
    throw new Error('Only the proposer can withdraw this agreement');
  }
  const [updated] = await db
    .update(agreements)
    .set({ status: 'withdrawn', resolvedAt: now, updatedAt: now })
    .where(eq(agreements.id, agreementId))
    .returning();
  await postSystemMessage(
    row.conversationId,
    userId,
    `↩️ Withdrew the proposed agreement “${row.title}”.`,
  );
  return toAgreementDTO(updated, userId);
}

export async function rejectOtherListingConversations(
  listingId: string,
  userId: string,
  input: RejectOthersInput,
): Promise<{ count: number }> {
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.publisherId, userId)),
  });
  if (!listing) throw new Error('Listing not found');

  const others = await getOtherActiveListingConversations(
    listingId,
    userId,
    input.exceptConversationId,
  );
  const message = input.message?.trim() || DEFAULT_REJECTION_MESSAGE;

  let count = 0;
  for (const conv of others) {
    try {
      await sendMessage(conv.id, userId, message);
      count += 1;
    } catch {
      // best effort — keep going
    }
  }
  return { count };
}

async function postSystemMessage(conversationId: string, senderId: string, body: string) {
  try {
    await sendMessage(conversationId, senderId, body);
  } catch {
    // A failed status note shouldn't block the agreement action itself.
  }
}

// re-export count helper for callers that need it (e.g. checkout)
export { getOtherActiveListingConversations };
