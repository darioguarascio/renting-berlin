import { and, desc, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { agreements, conversations, listings, messages, users } from '../db/schema';
import { parseDate } from './dates';
import { sendMessage } from './messages';
import type { MessageMetadata } from '../types/message';
import { enqueueAgreementJob } from './agreement-events';
import {
  buildSubleaseContractData,
  renderSubleaseContractMarkdown,
  type ClauseId,
} from './agreement-contract';
import {
  contractPreviewSchema,
  DEFAULT_REJECTION_MESSAGE,
  proposeAgreementSchema,
  type AgreementAction,
  type AgreementContractConfig,
  type ProposeAgreementInput,
  type RejectOthersInput,
} from './agreement-schema';

export { DEFAULT_REJECTION_MESSAGE };

type ListingRow = typeof listings.$inferSelect;
type UserRow = typeof users.$inferSelect;

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
  hasContractDocument: boolean;
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
    hasContractDocument: Boolean(row.contractMarkdown),
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

type ContractCore = {
  monthlyRent: number;
  deposit: number | null;
  startDate?: string;
  endDate?: string | null;
  terms?: string | null;
};

async function loadContractParticipants(conv: ConversationRow) {
  const [publisher, inquirer, listing] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, conv.publisherId) }),
    db.query.users.findFirst({ where: eq(users.id, conv.inquirerId) }),
    conv.listingId
      ? db.query.listings.findFirst({ where: eq(listings.id, conv.listingId) })
      : Promise.resolve(undefined),
  ]);
  return { publisher, inquirer, listing };
}

/**
 * Builds the full sublease contract markdown. The listing publisher is treated
 * as the main tenant (sublessor) and the inquirer as the subtenant.
 */
function assembleContractMarkdown(
  publisher: UserRow | undefined,
  inquirer: UserRow | undefined,
  listing: ListingRow | null | undefined,
  core: ContractCore,
  config: AgreementContractConfig | null,
): string {
  const data = buildSubleaseContractData({
    mainTenant: { name: publisher?.name ?? 'Main Tenant', email: publisher?.email },
    subtenant: { name: inquirer?.name ?? 'Subtenant', email: inquirer?.email },
    property: {
      address: config?.propertyAddress || listing?.address || '',
      floor: config?.floor ?? (listing?.floorLevel != null ? `floor ${listing.floorLevel}` : undefined),
      district: config?.district || listing?.neighborhood || undefined,
      rooms: config?.rooms ?? listing?.rooms ?? undefined,
      ancillaryRooms: config?.ancillaryRooms,
    },
    monthlyRent: core.monthlyRent,
    operatingCostsAdvance: config?.operatingCostsAdvance,
    deposit: core.deposit,
    startDate: core.startDate,
    endDate: core.endDate,
    fixedTermReason: config?.fixedTermReason,
    additionalTerms: core.terms,
    keys: config?.keys,
    houseRules: config?.houseRules,
    bank: config?.bank,
    placeAndDate: config?.placeAndDate,
    disabledClauses: config?.disabledClauses as ClauseId[] | undefined,
  });
  return renderSubleaseContractMarkdown(data);
}

/**
 * Freezes the rendered contract on the signed agreement and enqueues the worker
 * that turns it into a PDF and emails both parties. Best-effort.
 */
async function finalizeSignedContract(row: AgreementRow): Promise<void> {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, row.conversationId),
  });
  if (!conv) return;

  const { publisher, inquirer, listing } = await loadContractParticipants(conv);
  const markdown = assembleContractMarkdown(
    publisher,
    inquirer,
    listing,
    {
      monthlyRent: row.monthlyRent,
      deposit: row.deposit,
      startDate: row.startDate.toISOString().slice(0, 10),
      endDate: row.endDate ? row.endDate.toISOString().slice(0, 10) : null,
      terms: row.terms,
    },
    row.contractConfig ?? null,
  );

  await db
    .update(agreements)
    .set({ contractMarkdown: markdown, updatedAt: new Date() })
    .where(eq(agreements.id, row.id));

  await enqueueAgreementJob({ type: 'signed', agreementId: row.id });
}

export async function renderAgreementContractPreview(
  conversationId: string,
  userId: string,
  rawInput: unknown,
): Promise<string> {
  const input = contractPreviewSchema.parse(rawInput);
  const conv = await requireParticipant(conversationId, userId);
  const { publisher, inquirer, listing } = await loadContractParticipants(conv);
  return assembleContractMarkdown(
    publisher,
    inquirer,
    listing,
    {
      monthlyRent: input.monthlyRent,
      deposit: input.deposit,
      startDate: input.startDate,
      endDate: input.endDate,
      terms: input.terms,
    },
    input.contract ?? null,
  );
}

export async function getAgreementContractMarkdown(
  agreementId: string,
  userId: string,
): Promise<string | null> {
  const row = await db.query.agreements.findFirst({ where: eq(agreements.id, agreementId) });
  if (!row) return null;
  if (row.proposerId !== userId && row.counterpartyId !== userId) return null;
  return row.contractMarkdown ?? null;
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
  contractDefaults: {
    propertyAddress: string;
    district: string;
    floor: string;
    rooms: number | null;
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
    contractDefaults: {
      propertyAddress: listing?.address ?? '',
      district: listing?.neighborhood ?? '',
      floor: listing?.floorLevel != null ? `floor ${listing.floorLevel}` : '',
      rooms: listing?.rooms ?? null,
    },
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
      contractConfig: input.contract ?? null,
    })
    .returning();

  await postSystemMessage(
    conversationId,
    userId,
    `📄 Proposed a rental agreement: “${row.title}”. Review the terms and sign to make it binding.`,
    { type: 'agreement', agreementId: row.id, event: 'proposed' },
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
    // Freeze the contract document and hand off PDF generation + email to the
    // worker. Never let this block the signature itself.
    try {
      await finalizeSignedContract(updated);
    } catch {
      // best-effort; the agreement is still binding without the PDF email
    }
    await postSystemMessage(
      row.conversationId,
      userId,
      `✅ Signed the agreement “${row.title}”. It is now binding for both parties. A signed PDF copy is on its way to both inboxes.`,
      { type: 'agreement', agreementId: row.id, event: 'signed' },
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
      { type: 'agreement', agreementId: row.id, event: 'declined' },
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
    { type: 'agreement', agreementId: row.id, event: 'withdrawn' },
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

async function postSystemMessage(
  conversationId: string,
  senderId: string,
  body: string,
  metadata?: MessageMetadata,
) {
  try {
    await sendMessage(conversationId, senderId, body, metadata ? { metadata } : undefined);
  } catch {
    // A failed status note shouldn't block the agreement action itself.
  }
}

// re-export count helper for callers that need it (e.g. checkout)
export { getOtherActiveListingConversations };
