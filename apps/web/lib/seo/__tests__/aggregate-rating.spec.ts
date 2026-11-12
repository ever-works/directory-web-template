import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildAggregateRatingSchema, summarizeRatings } from '../aggregate-rating';

/**
 * The item page marks up its review rating as Product `aggregateRating`.
 * Search engines compare it with the visible rating, so the number must be a
 * plain mean of valid 1-5 ratings and must vanish when there is nothing to publish.
 *
 * Run with: `npx tsx --test apps/web/lib/seo/__tests__/aggregate-rating.spec.ts`
 */

describe('summarizeRatings', () => {
	it('returns null for no ratings', () => {
		assert.equal(summarizeRatings([]), null);
	});

	it('averages valid ratings and counts them', () => {
		assert.deepEqual(summarizeRatings([5, 4, 3]), { ratingValue: 4, reviewCount: 3 });
		assert.deepEqual(summarizeRatings([5]), { ratingValue: 5, reviewCount: 1 });
	});

	it('rounds the mean to one decimal place', () => {
		assert.deepEqual(summarizeRatings([5, 4, 4]), { ratingValue: 4.3, reviewCount: 3 });
		assert.deepEqual(summarizeRatings([5, 5, 4, 5]), { ratingValue: 4.8, reviewCount: 4 });
	});

	it('ignores the column default of 0 and other out-of-range values', () => {
		assert.deepEqual(summarizeRatings([0, 5, 6, -1, 3]), { ratingValue: 4, reviewCount: 2 });
		assert.equal(summarizeRatings([0, 0]), null);
	});

	it('ignores non-numbers and non-finite numbers', () => {
		assert.deepEqual(summarizeRatings([null, undefined, '5', Number.NaN, Infinity, 4]), {
			ratingValue: 4,
			reviewCount: 1
		});
	});

	it('keeps the boundary values 1 and 5', () => {
		assert.deepEqual(summarizeRatings([1, 5]), { ratingValue: 3, reviewCount: 2 });
	});
});

describe('buildAggregateRatingSchema', () => {
	it('builds an AggregateRating on the 1-5 scale', () => {
		assert.deepEqual(buildAggregateRatingSchema({ ratingValue: 4.3, reviewCount: 3 }), {
			'@type': 'AggregateRating',
			ratingValue: 4.3,
			reviewCount: 3,
			bestRating: 5,
			worstRating: 1
		});
	});

	it('returns null when there is no summary', () => {
		assert.equal(buildAggregateRatingSchema(null), null);
		assert.equal(buildAggregateRatingSchema(undefined), null);
	});

	it('returns null for an unpublishable summary', () => {
		assert.equal(buildAggregateRatingSchema({ ratingValue: 0, reviewCount: 2 }), null);
		assert.equal(buildAggregateRatingSchema({ ratingValue: 5.5, reviewCount: 2 }), null);
		assert.equal(buildAggregateRatingSchema({ ratingValue: Number.NaN, reviewCount: 2 }), null);
		assert.equal(buildAggregateRatingSchema({ ratingValue: 4, reviewCount: 0 }), null);
		assert.equal(buildAggregateRatingSchema({ ratingValue: 4, reviewCount: 1.5 }), null);
	});
});
