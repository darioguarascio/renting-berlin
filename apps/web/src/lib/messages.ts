import { and, desc, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { conversations, listings, messages, tenantRequests, users } from '../db/schema';
import type { MessageAttachment } from '../types/message';
import type { MessageTemplateKind } from '../types/message-template';
import { saveMessageAsTemplate } from './message-templates';
import { getNotificationPreferences } from './notification-preferences';
import { accountProfileHref, listingHref } from './urls';
import { getUserPublicProfileInfos } from './user-public-profile';

export async function getOrCreateListingConversation(listingId: string, inquirerId: string) {
  const listing = await db.query.listings.findFirst({ where: eq(listings.id, listingId) });
  if (!listing) throw new Error('Listing not found');
  if (listing.publisherId === inquirerId) throw new Error('Cannot message your own listing');

  const publisherPrefs = await getNotificationPreferences(listing.publisherId);
  if (!publisherPrefs.acceptInquiries) {
    throw new Error('This user is not accepting new inquiries right now');
  }

  const existing = await db.query.conversations.findFirst({
    where: and(eq(conversations.listingId, listingId), eq(conversations.inquirerId, inquirerId)),
  });
  if (existing) return existing;

  const [conversation] = await db
    .insert(conversations)
    .values({
      id: nanoid(),
      listingId,
      publisherId: listing.publisherId,
      inquirerId,
    })
    .returning();

  return conversation;
}

/** @deprecated Use getOrCreateListingConversation */
export async function getOrCreateConversation(listingId: string, inquirerId: string) {
  return getOrCreateListingConversation(listingId, inquirerId);
}

export async function getOrCreateSeekerConversation(tenantRequestId: string, inquirerId: string) {
  const request = await db.query.tenantRequests.findFirst({
    where: eq(tenantRequests.id, tenantRequestId),
  });
  if (!request) throw new Error('Seeker profile not found');
  if (request.status !== 'active') throw new Error('This seeker profile is not active');
  if (request.seekerId === inquirerId) throw new Error('Cannot message your own profile');

  const seekerPrefs = await getNotificationPreferences(request.seekerId);
  if (!seekerPrefs.acceptInquiries) {
    throw new Error('This user is not accepting new inquiries right now');
  }

  const existing = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.tenantRequestId, tenantRequestId),
      eq(conversations.inquirerId, inquirerId),
    ),
  });
  if (existing) return existing;

  const [conversation] = await db
    .insert(conversations)
    .values({
      id: nanoid(),
      tenantRequestId,
      publisherId: request.seekerId,
      inquirerId,
    })
    .returning();

  return conversation;
}

async function conversationHasMessages(conversationId: string): Promise<boolean> {
  const existing = await db.query.messages.findFirst({
    where: eq(messages.conversationId, conversationId),
  });
  return !!existing;
}

function previewMessage(body: string, attachments: MessageAttachment[]): string | null {
  if (body.trim()) return body;
  if (attachments.length > 0) return '📎 Attachment';
  return null;
}

export async function startConversationWithMessage(input: {
  userId: string;
  listingId?: string;
  tenantRequestId?: string;
  body: string;
  attachments?: MessageAttachment[];
  saveAsTemplate?: boolean;
  templateLabel?: string;
  templateKind?: MessageTemplateKind;
}) {
  const trimmed = input.body.trim();
  const attachments = input.attachments ?? [];
  if (!trimmed && attachments.length === 0) throw new Error('Message cannot be empty');
  if (!input.listingId && !input.tenantRequestId) {
    throw new Error('listingId or tenantRequestId required');
  }
  if (input.listingId && input.tenantRequestId) {
    throw new Error('Provide only listingId or tenantRequestId');
  }

  const conversation = input.listingId
    ? await getOrCreateListingConversation(input.listingId, input.userId)
    : await getOrCreateSeekerConversation(input.tenantRequestId!, input.userId);

  const hasMessages = await conversationHasMessages(conversation.id);
  if (hasMessages) {
    return { id: conversation.id, existing: true as const };
  }

  await sendMessage(conversation.id, input.userId, trimmed, {
    attachments,
    saveAsTemplate: input.saveAsTemplate,
    templateLabel: input.templateLabel,
    templateKind: input.templateKind,
  });

  return { id: conversation.id, existing: false as const };
}

export async function listConversationsForUser(userId: string) {
  const rows = await db.query.conversations.findMany({
    where: or(eq(conversations.publisherId, userId), eq(conversations.inquirerId, userId)),
    orderBy: [desc(conversations.updatedAt)],
  });

  const listingIds = [...new Set(rows.map((r) => r.listingId).filter(Boolean))] as string[];
  const tenantRequestIds = [
    ...new Set(rows.map((r) => r.tenantRequestId).filter(Boolean)),
  ] as string[];
  const userIds = [...new Set(rows.flatMap((r) => [r.publisherId, r.inquirerId]))];

  const [listingRows, tenantRequestRows, userRows] = await Promise.all([
    listingIds.length > 0
      ? db.query.listings.findMany({ where: inArray(listings.id, listingIds) })
      : Promise.resolve([]),
    tenantRequestIds.length > 0
      ? db.query.tenantRequests.findMany({ where: inArray(tenantRequests.id, tenantRequestIds) })
      : Promise.resolve([]),
    userIds.length > 0 ? db.query.users.findMany({ where: inArray(users.id, userIds) }) : Promise.resolve([]),
  ]);

  const listingMap = new Map(listingRows.map((l) => [l.id, l]));
  const tenantRequestMap = new Map(tenantRequestRows.map((r) => [r.id, r]));
  const userMap = new Map(userRows.map((u) => [u.id, u]));

  const conversationIds = rows.map((r) => r.id);
  const lastMessages =
    conversationIds.length > 0
      ? await db
          .select()
          .from(messages)
          .where(inArray(messages.conversationId, conversationIds))
          .orderBy(desc(messages.createdAt))
      : [];

  const otherUserIds = rows.map((conv) =>
    conv.publisherId === userId ? conv.inquirerId : conv.publisherId,
  );
  const otherUserProfiles = await getUserPublicProfileInfos(otherUserIds);

  const lastByConversation = new Map<string, (typeof lastMessages)[0]>();
  for (const msg of lastMessages) {
    if (!lastByConversation.has(msg.conversationId)) {
      lastByConversation.set(msg.conversationId, msg);
    }
  }

  return rows.map((conv) => {
    const listing = conv.listingId ? listingMap.get(conv.listingId) : null;
    const tenantRequest = conv.tenantRequestId ? tenantRequestMap.get(conv.tenantRequestId) : null;
    const otherUserId = conv.publisherId === userId ? conv.inquirerId : conv.publisherId;
    const otherUser = userMap.get(otherUserId);
    const lastMessage = lastByConversation.get(conv.id);

    const seekerHandle = conv.tenantRequestId ? userMap.get(conv.publisherId)?.handle : null;

    return {
      id: conv.id,
      contextKind: listing ? ('listing' as const) : ('seeker' as const),
      listing: listing
        ? {
            id: listing.id,
            title: listing.title,
            href: listingHref(listing.slug, listing.shortCode),
            photoUrl: listing.photoUrls[0] ?? null,
          }
        : null,
      seekerProfile: tenantRequest
        ? {
            id: tenantRequest.id,
            title: tenantRequest.title,
            href: seekerHandle ? accountProfileHref(seekerHandle) : '/requests',
          }
        : null,
      otherUserName: otherUser?.name ?? 'User',
      otherUserImage: otherUser?.image ?? null,
      lastMessage: lastMessage
        ? previewMessage(lastMessage.body, (lastMessage.attachments as MessageAttachment[]) ?? [])
        : null,
      lastMessageAt: lastMessage?.createdAt.toISOString() ?? conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    };
  });
}

export async function getConversationWithMessages(conversationId: string, userId: string) {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!conv) return null;
  if (conv.publisherId !== userId && conv.inquirerId !== userId) return null;

  const [listing, tenantRequest, publisher, inquirer, msgs] = await Promise.all([
    conv.listingId
      ? db.query.listings.findFirst({ where: eq(listings.id, conv.listingId) })
      : Promise.resolve(null),
    conv.tenantRequestId
      ? db.query.tenantRequests.findFirst({ where: eq(tenantRequests.id, conv.tenantRequestId) })
      : Promise.resolve(null),
    db.query.users.findFirst({ where: eq(users.id, conv.publisherId) }),
    db.query.users.findFirst({ where: eq(users.id, conv.inquirerId) }),
    db.query.messages.findMany({
      where: eq(messages.conversationId, conversationId),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    }),
  ]);

  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, userId),
        isNull(messages.readAt),
      ),
    );

  const otherUser = conv.publisherId === userId ? inquirer : publisher;
  const seekerHandle = conv.tenantRequestId ? publisher?.handle : null;
  const otherUserProfiles = await getUserPublicProfileInfos(otherUser ? [otherUser.id] : []);
  const otherUserProfile = otherUser ? otherUserProfiles.get(otherUser.id) : undefined;

  return {
    id: conv.id,
    contextKind: conv.listingId ? ('listing' as const) : ('seeker' as const),
    listing: listing
      ? {
          id: listing.id,
          title: listing.title,
          slug: listingHref(listing.slug, listing.shortCode),
          photoUrl: listing.photoUrls[0] ?? null,
        }
      : null,
    seekerProfile: tenantRequest
      ? {
          id: tenantRequest.id,
          title: tenantRequest.title,
          href: seekerHandle ? accountProfileHref(seekerHandle) : '/requests',
        }
      : null,
    otherUser: otherUser
      ? {
          id: otherUser.id,
          name: otherUser.name,
          image: otherUser.image,
          handle: otherUserProfile?.handle ?? null,
          profileHref: otherUserProfile?.profileHref ?? null,
          hasSeekerProfile: otherUserProfile?.hasSeekerProfile ?? false,
          activeListingCount: otherUserProfile?.activeListingCount ?? 0,
        }
      : null,
    messages: msgs.map((m) => ({
      id: m.id,
      body: m.body,
      attachments: (m.attachments as MessageAttachment[]) ?? [],
      senderId: m.senderId,
      isMine: m.senderId === userId,
      createdAt: m.createdAt.toISOString(),
      readAt: m.senderId === userId ? (m.readAt?.toISOString() ?? null) : null,
    })),
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  options?: {
    attachments?: MessageAttachment[];
    saveAsTemplate?: boolean;
    templateLabel?: string;
    templateKind?: MessageTemplateKind;
  },
) {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!conv) throw new Error('Conversation not found');
  if (conv.publisherId !== senderId && conv.inquirerId !== senderId) {
    throw new Error('Not a participant');
  }

  const trimmed = body.trim();
  const attachments = options?.attachments ?? [];
  if (!trimmed && attachments.length === 0) throw new Error('Message cannot be empty');

  const [message] = await db
    .insert(messages)
    .values({ id: nanoid(), conversationId, senderId, body: trimmed, attachments })
    .returning();

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  if (options?.saveAsTemplate && trimmed) {
    const kind =
      options.templateKind ??
      (conv.listingId ? 'inquiry' : conv.tenantRequestId ? 'outreach' : 'general');
    await saveMessageAsTemplate(senderId, trimmed, {
      saveAsTemplate: true,
      templateLabel: options.templateLabel,
      kind,
    });
  }

  return message;
}

export async function deleteConversation(conversationId: string, userId: string) {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!conv) throw new Error('Conversation not found');
  if (conv.publisherId !== userId && conv.inquirerId !== userId) {
    throw new Error('Not a participant');
  }

  await db.delete(conversations).where(eq(conversations.id, conversationId));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const convs = await db.query.conversations.findMany({
    where: or(eq(conversations.publisherId, userId), eq(conversations.inquirerId, userId)),
  });
  if (convs.length === 0) return 0;

  const convIds = convs.map((c) => c.id);
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(
      and(
        inArray(messages.conversationId, convIds),
        ne(messages.senderId, userId),
        isNull(messages.readAt),
      ),
    );

  return result?.count ?? 0;
}
