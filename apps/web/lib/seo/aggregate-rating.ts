/**
 * Aggregate review rating helpers for the item page's Product structured data.
 *
 * Kept free of imports so it can be unit-tested on its own
 * (`tsx --test lib/seo/__tests__/aggregate-rating.spec.ts`).
 *
 * Ratings are submitted as integers from 1 to 5 (`POST /api/items/{slug}/comments`),
 * but the column defaults to 0, so a stray 0 or out-of-range value must never
 * drag the published average down: search engines compare the marked-up rating
 * with what the page shows.
 */

export const MIN_RATING = 1;
export const MAX_RATING = 5;

export interface RatingSummary {
	/** Mean of the valid ratings, one decimal place, between MIN_RATING and MAX_RATING. */
	ratingValue: number;
	/** Number of valid ratings that went into the mean (always >= 1). */
	reviewCount: number;
}

/**
 * Reduce a list of raw ratings to a summary. Values that are not finite
 * numbers between 1 and 5 are ignored. Returns `null` when nothing usable is left.
 */
export function summarizeRatings(ratings: ReadonlyArray<unknown>): RatingSummary | null {
	let sum = 0;
	let count = 0;

	for (const rating of ratings) {
		if (typeof rating !== 'number' || !Number.isFinite(rating)) continue;
		if (rating < MIN_RATING || rating > MAX_RATING) continue;
		sum += rating;
		count += 1;
	}

	if (count === 0) return null;

	const ratingValue = Math.round((sum / count) * 10) / 10;
	return { ratingValue, reviewCount: count };
}

/**
 * Build the Schema.org `AggregateRating` node, or `null` when the summary is
 * missing or not publishable (no reviews, or a value outside the 1-5 scale).
 */
export function buildAggregateRatingSchema(summary: RatingSummary | null | undefined) {
	if (!summary) return null;

	const { ratingValue, reviewCount } = summary;
	if (!Number.isFinite(ratingValue) || ratingValue < MIN_RATING || ratingValue > MAX_RATING) return null;
	if (!Number.isInteger(reviewCount) || reviewCount < 1) return null;

	return {
		'@type': 'AggregateRating',
		ratingValue,
		reviewCount,
		bestRating: MAX_RATING,
		worstRating: MIN_RATING
	};
}
