import { and, eq, inArray, lte } from 'drizzle-orm';
import { db } from '../db';
import { feedback, rentalTransactions, users } from '../db/schema';

export interface PublishedReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorName: string;
  authorImage: string | null;
  stayedLabel: string | null;
}

export interface ListingFeedbackSummary {
  averageRating: number | null;
  totalCount: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  reviews: PublishedReview[];
}

function firstName(name: string): string {
  const part = name.trim().split(/\s+/)[0];
  return part || 'Guest';
}

function stayedLabel(endDate: Date | null): string | null {
  if (!endDate) return null;
  const label = endDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return `Stayed ${label}`;
}

function emptyDistribution(): Record<1 | 2 | 3 | 4 | 5, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function isMutualFeedback(rows: Array<{ authorId: string; subjectId: string }>, landlordId: string, tenantId: string) {
  if (rows.length < 2) return false;
  const tenantReviewedLandlord = rows.some((row) => row.authorId === tenantId && row.subjectId === landlordId);
  const landlordReviewedTenant = rows.some((row) => row.authorId === landlordId && row.subjectId === tenantId);
  return tenantReviewedLandlord && landlordReviewedTenant;
}

export async function getPublishedListingFeedback(listingId: string): Promise<ListingFeedbackSummary> {
  const now = new Date();
  const transactions = await db.query.rentalTransactions.findMany({
    where: and(eq(rentalTransactions.listingId, listingId), lte(rentalTransactions.feedbackDueAt, now)),
  });

  if (transactions.length === 0) {
    return { averageRating: null, totalCount: 0, distribution: emptyDistribution(), reviews: [] };
  }

  const txIds = transactions.map((tx) => tx.id);
  const feedbackRows = await db.query.feedback.findMany({
    where: inArray(feedback.transactionId, txIds),
  });

  const feedbackByTx = new Map<string, typeof feedbackRows>();
  for (const row of feedbackRows) {
    const list = feedbackByTx.get(row.transactionId) ?? [];
    list.push(row);
    feedbackByTx.set(row.transactionId, list);
  }

  const publishedTenantReviews = transactions.flatMap((tx) => {
    const txFeedback = feedbackByTx.get(tx.id) ?? [];
    if (!isMutualFeedback(txFeedback, tx.landlordId, tx.tenantId)) return [];

    const tenantReview = txFeedback.find(
      (row) => row.authorId === tx.tenantId && row.subjectId === tx.landlordId,
    );
    return tenantReview ? [{ review: tenantReview, tx }] : [];
  });

  if (publishedTenantReviews.length === 0) {
    return { averageRating: null, totalCount: 0, distribution: emptyDistribution(), reviews: [] };
  }

  const authorIds = [...new Set(publishedTenantReviews.map(({ review }) => review.authorId))];
  const authorRows = await db.query.users.findMany({
    where: inArray(users.id, authorIds),
    columns: { id: true, name: true, image: true },
  });
  const authorMap = new Map(authorRows.map((user) => [user.id, user]));

  const distribution = emptyDistribution();
  let ratingSum = 0;

  const reviews: PublishedReview[] = publishedTenantReviews
    .map(({ review, tx }) => {
      const author = authorMap.get(review.authorId);
      const rating = Math.min(5, Math.max(1, review.rating)) as 1 | 2 | 3 | 4 | 5;
      distribution[rating] += 1;
      ratingSum += rating;

      return {
        id: review.id,
        rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        authorName: firstName(author?.name ?? 'Guest'),
        authorImage: author?.image ?? null,
        stayedLabel: stayedLabel(tx.endDate),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const totalCount = reviews.length;
  const averageRating = totalCount > 0 ? Math.round((ratingSum / totalCount) * 10) / 10 : null;

  return { averageRating, totalCount, distribution, reviews };
}

export async function getPublishedLandlordFeedback(landlordId: string): Promise<ListingFeedbackSummary> {
  const now = new Date();
  const transactions = await db.query.rentalTransactions.findMany({
    where: and(eq(rentalTransactions.landlordId, landlordId), lte(rentalTransactions.feedbackDueAt, now)),
  });

  if (transactions.length === 0) {
    return { averageRating: null, totalCount: 0, distribution: emptyDistribution(), reviews: [] };
  }

  const listingIds = [...new Set(transactions.map((tx) => tx.listingId))];
  const summaries = await Promise.all(listingIds.map((listingId) => getPublishedListingFeedback(listingId)));

  const reviews = summaries
    .flatMap((summary) => summary.reviews)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const distribution = emptyDistribution();
  let ratingSum = 0;
  for (const review of reviews) {
    const rating = review.rating as 1 | 2 | 3 | 4 | 5;
    distribution[rating] += 1;
    ratingSum += rating;
  }

  const totalCount = reviews.length;
  const averageRating = totalCount > 0 ? Math.round((ratingSum / totalCount) * 10) / 10 : null;

  return { averageRating, totalCount, distribution, reviews };
}
