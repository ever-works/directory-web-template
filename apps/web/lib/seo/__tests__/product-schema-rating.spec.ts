import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ratingWhenEnabled, summarizeRatings } from '../aggregate-rating';
import { generateProductSchema } from '../schema';

/**
 * The page summarises ratings and hands the summary to `generateProductSchema`
 * (via ItemDetailWrapper -> ItemDetail -> ItemDetailContent). This covers the
 * last hop: a summary yields `aggregateRating`, anything else yields no key.
 *
 * Run with: `npx tsx --test apps/web/lib/seo/__tests__/product-schema-rating.spec.ts`
 */

const base = {
	name: 'Example item',
	description: 'An example listing',
	url: 'https://example.com/items/example'
};

describe('generateProductSchema aggregateRating', () => {
	it('adds aggregateRating when given a rating summary', () => {
		const schema = generateProductSchema({ ...base, rating: summarizeRatings([5, 4, 4]) }) as Record<string, unknown>;
		assert.deepEqual(schema.aggregateRating, {
			'@type': 'AggregateRating',
			ratingValue: 4.3,
			reviewCount: 3,
			bestRating: 5,
			worstRating: 1
		});
	});

	it('has no aggregateRating key without a rating', () => {
		assert.equal('aggregateRating' in generateProductSchema({ ...base }), false);
		assert.equal('aggregateRating' in generateProductSchema({ ...base, rating: null }), false);
		assert.equal('aggregateRating' in generateProductSchema({ ...base, rating: summarizeRatings([0, 9]) }), false);
	});

	it('has no aggregateRating key while the ratings feature is off (R4)', () => {
		const summary = summarizeRatings([5, 4, 4]);
		assert.equal(ratingWhenEnabled(summary, false), null);
		assert.equal(
			'aggregateRating' in generateProductSchema({ ...base, rating: ratingWhenEnabled(summary, false) }),
			false
		);
		assert.deepEqual(ratingWhenEnabled(summary, true), summary);
		assert.equal(ratingWhenEnabled(null, true), null);
		assert.equal(ratingWhenEnabled(undefined, true), null);
	});
});
