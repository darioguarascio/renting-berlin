import { and, eq, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { conversations, listings, messages, rentalTransactions, users } from '../db/schema';
import { parseDate, toIsoString } from './dates';
import { checkoutInputSchema, type CheckoutInput } from './rental-checkout-schema';
import { removeListingFromIndex } from './search';

export { checkoutInputSchema, type CheckoutInput };
export { toIsoString };

export async function getListingCheckoutContext(listingId: string, publisherId: string) {
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.publisherId, publisherId)),
  });
  if (!listing) return null;

  const convRows = await db.query.conversations.findMany({
    where: and(eq(conversations.listingId, listingId), eq(conversations.publisherId, publisherId)),
  });

  const convIds = convRows.map((c) => c.id);
  if (convIds.length === 0) {
    return {
      listing: formatListing(listing),
      contacts: [] as CheckoutContact[],
    };
  }

  const msgCounts = await db
    .select({
      conversationId: messages.conversationId,
      count: sql<number>`count(*)::int`,
      lastAt: sql<Date>`max(${messages.createdAt})`,
    })
    .from(messages)
    .where(inArray(messages.conversationId, convIds))
    .groupBy(messages.conversationId);

  const activeConvs = new Map(
    msgCounts.filter((m) => m.count > 0).map((m) => [m.conversationId, m]),
  );

  const inquirerIds = convRows
    .filter((c) => activeConvs.has(c.id))
    .map((c) => c.inquirerId);

  const inquirerRows =
    inquirerIds.length > 0
      ? await db.query.users.findMany({ where: inArray(users.id, inquirerIds) })
      : [];
  const inquirerMap = new Map(inquirerRows.map((u) => [u.id, u]));

  const contacts: CheckoutContact[] = convRows
    .filter((c) => activeConvs.has(c.id))
    .map((c) => {
      const inquirer = inquirerMap.get(c.inquirerId);
      const stats = activeConvs.get(c.id)!;
      return {
        conversationId: c.id,
        userId: c.inquirerId,
        userName: inquirer?.name ?? 'User',
        userImage: inquirer?.image ?? null,
        messageCount: stats.count,
        lastMessageAt: toIsoString(stats.lastAt),
      };
    })
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

  return {
    listing: formatListing(listing),
    contacts,
  };
}

function formatListing(listing: typeof listings.$inferSelect) {
  return {
    id: listing.id,
    title: listing.title,
    rentType: listing.rentType,
    availableFrom: listing.availableFrom.toISOString().slice(0, 10),
    availableTo: listing.availableTo?.toISOString().slice(0, 10) ?? null,
  };
}

export type CheckoutContact = {
  conversationId: string;
  userId: string;
  userName: string;
  userImage: string | null;
  messageCount: number;
  lastMessageAt: string;
};

export async function completeListingCheckout(
  listingId: string,
  publisherId: string,
  input: CheckoutInput,
) {
  const data = checkoutInputSchema.parse(input);

  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.publisherId, publisherId)),
  });
  if (!listing) return null;
  if (listing.status === 'closed') return null;

  const finalStatus = data.intent === 'close' ? 'closed' : 'paused';

  if (data.rentedToUserId) {
    if (!data.rentalEndDate) {
      throw new Error('Rental end date is required when a tenant is selected');
    }

    const conv = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.listingId, listingId),
        eq(conversations.inquirerId, data.rentedToUserId),
        eq(conversations.publisherId, publisherId),
      ),
    });
    if (!conv) {
      throw new Error('Selected tenant did not have a conversation about this listing');
    }

    const endDate = parseDate(data.rentalEndDate);
    const feedbackDueAt = endDate;

    const existingTx = await db.query.rentalTransactions.findFirst({
      where: and(
        eq(rentalTransactions.listingId, listingId),
        eq(rentalTransactions.tenantId, data.rentedToUserId),
      ),
    });

    if (!existingTx) {
      await db.insert(rentalTransactions).values({
        id: nanoid(),
        listingId,
        landlordId: publisherId,
        tenantId: data.rentedToUserId,
        startDate: listing.availableFrom,
        endDate,
        feedbackDueAt,
        status: 'scheduled',
      });
    }

    const [row] = await db
      .update(listings)
      .set({
        status: finalStatus,
        ...(data.updateListingEndDate ? { availableTo: endDate } : {}),
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listingId))
      .returning();

    if (listing.status === 'active' || finalStatus === 'closed') {
      await removeListingFromIndex(listingId);
    }
    return { listing: row, transactionCreated: !existingTx };
  }

  const [row] = await db
    .update(listings)
    .set({ status: finalStatus, updatedAt: new Date() })
    .where(eq(listings.id, listingId))
    .returning();

  if (listing.status === 'active' || finalStatus === 'closed') {
    await removeListingFromIndex(listingId);
  }

  return { listing: row, transactionCreated: false };
}
