import { useMemo, useState } from 'react';
import type { ListingFeedbackSummary } from '../lib/feedback';

interface Props {
  summary: ListingFeedbackSummary;
  publisherName: string;
  reviewerNamesHidden?: boolean;
}

const INITIAL_VISIBLE = 4;

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`size-4 ${filled ? 'text-[var(--color-brand)]' : 'text-[var(--color-border)]'}`}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.753-.38-1.831-4.401Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const rounded = Math.round(rating);
  const iconClass = size === 'lg' ? 'size-5' : size === 'sm' ? 'size-3.5' : 'size-4';

  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => (
        <svg
          key={index}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`${iconClass} ${index < rounded ? 'text-[var(--color-brand)]' : 'text-[var(--color-border)]'}`}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.753-.38-1.831-4.401Z"
            clipRule="evenodd"
          />
        </svg>
      ))}
    </div>
  );
}

function ratingLabel(score: number): string {
  if (score >= 4.8) return 'Exceptional';
  if (score >= 4.5) return 'Excellent';
  if (score >= 4.0) return 'Very good';
  if (score >= 3.5) return 'Good';
  return 'Fair';
}

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export default function ListingFeedbackSection({ summary, publisherName, reviewerNamesHidden }: Props) {
  const [showAll, setShowAll] = useState(false);

  const visibleReviews = showAll ? summary.reviews : summary.reviews.slice(0, INITIAL_VISIBLE);
  const distributionRows = useMemo(() => {
    const total = summary.totalCount || 1;
    return ([5, 4, 3, 2, 1] as const).map((stars) => ({
      stars,
      count: summary.distribution[stars],
      width: `${(summary.distribution[stars] / total) * 100}%`,
    }));
  }, [summary]);

  if (summary.totalCount === 0) {
    return (
      <section className="listing-reviews">
        <h2 className="listing-reviews__title">Guest reviews</h2>
        <div className="listing-reviews__empty">
          <div className="listing-reviews__empty-icon" aria-hidden>
            <StarIcon filled={false} />
          </div>
          <p className="font-display text-lg font-bold text-[var(--color-ink)]">No reviews yet</p>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--color-ink-muted)]">
            Reviews appear here after verified rentals — when both {publisherName} and the tenant have
            exchanged feedback. One-sided ratings are never published.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="listing-reviews">
      <h2 className="listing-reviews__title">Guest reviews</h2>

      <div className="listing-reviews__summary">
        <div className="listing-reviews__score-block">
          <p className="listing-reviews__score">{summary.averageRating?.toFixed(1)}</p>
          <StarRating rating={summary.averageRating ?? 0} size="md" />
          <p className="listing-reviews__score-label">{ratingLabel(summary.averageRating ?? 0)}</p>
          <p className="listing-reviews__count">
            {summary.totalCount} verified review{summary.totalCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="listing-reviews__distribution">
          {distributionRows.map((row) => (
            <div key={row.stars} className="listing-reviews__bar-row">
              <span className="listing-reviews__bar-label">{row.stars}</span>
              <StarIcon filled />
              <div className="listing-reviews__bar-track">
                <div className="listing-reviews__bar-fill" style={{ width: row.width }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {reviewerNamesHidden && (
        <p className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-xs text-[var(--color-ink-muted)]">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 shrink-0 text-[var(--color-brand)]" aria-hidden>
            <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v4A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 11 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
          </svg>
          Reviewer names are private. Start a conversation — names become visible once the landlord replies.
        </p>
      )}

      <div className="listing-reviews__grid">
        {visibleReviews.map((review) => (
          <article key={review.id} className="listing-reviews__card">
            <div className="listing-reviews__card-header">
              {review.authorImage ? (
                <img src={review.authorImage} alt="" className="listing-reviews__avatar" />
              ) : review.authorName ? (
                <span className="listing-reviews__avatar-fallback">{review.authorName[0]}</span>
              ) : (
                <span className="listing-reviews__avatar-fallback">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
                  </svg>
                </span>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-[var(--color-ink)]">{review.authorName ?? 'Verified tenant'}</p>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  {review.stayedLabel ?? formatReviewDate(review.createdAt)}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <StarRating rating={review.rating} size="sm" />
                <span className="text-sm font-semibold text-[var(--color-ink)]">{review.rating.toFixed(1)}</span>
              </div>
            </div>
            {review.comment ? (
              <p className="listing-reviews__comment">{review.comment}</p>
            ) : (
              <p className="listing-reviews__comment listing-reviews__comment--muted">Rated without a written review.</p>
            )}
            <p className="listing-reviews__verified">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 shrink-0">
                <path fillRule="evenodd" d="M8 1.75a6.25 6.25 0 1 0 0 12.5 6.25 6.25 0 0 0 0-12.5ZM6.25 8.75 5.03 7.53a.75.75 0 0 0-1.06 1.06l1.75 1.75a.75.75 0 0 0 1.06 0l3.25-3.25a.75.75 0 1 0-1.06-1.06L6.25 8.75Z" clipRule="evenodd" />
              </svg>
              Verified stay
            </p>
          </article>
        ))}
      </div>

      {summary.reviews.length > INITIAL_VISIBLE && (
        <button type="button" className="listing-reviews__show-all" onClick={() => setShowAll((value) => !value)}>
          {showAll ? 'Show fewer reviews' : `Show all ${summary.reviews.length} reviews`}
        </button>
      )}
    </section>
  );
}
