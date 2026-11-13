import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

/**
 * Run with: `pnpm --filter @ever-works/web test:unit`
 *
 * `product-schema-rating.spec.ts` covers the last hop (summary -> `aggregateRating`).
 * The hops before it live in a server page, client components and a route handler that
 * import Next.js / `server-only` / the database and cannot be loaded under `tsx --test`,
 * so these guards read the source instead (spec 057, T-003a).
 */
const source = (relative: string) => readFileSync(join(__dirname, relative), 'utf8').replace(/\s+/g, ' ');

const page = source('../../../app/[locale]/items/[slug]/page.tsx');
const wrapper = source('../../../components/item-detail/item-detail-wrapper.tsx');
const detail = source('../../../components/item-detail/item-detail.tsx');
const ratingRoute = source('../../../app/api/items/[slug]/comments/rating/route.ts');
const commentQueries = source('../../db/queries/comment.queries.ts');

describe('item page aggregateRating wiring (spec 057)', () => {
	it('the page summarises the prefetched comments only while the ratings feature is on', () => {
		const prefetch = page.indexOf("queryKey: ['comments', slug], queryFn: () => getCommentsByItemId(slug)");
		const summary = page.indexOf(
			'const rating = ratingWhenEnabled( summarizeRatings((prefetchedComments ?? []).map((comment) => comment.rating)), getFeatureFlags().ratings );'
		);
		assert.ok(prefetch > 0, 'the page does not prefetch the comments');
		assert.ok(
			summary > prefetch,
			'the rating is not summarised from the prefetched comments behind the ratings flag'
		);
		assert.ok(page.includes('rating={rating}'), 'the page does not pass rating to ItemDetailWrapper');
	});

	it('ItemDetailWrapper -> ItemDetail -> ItemDetailContent forward rating', () => {
		assert.ok(wrapper.includes('<ItemDetail {...props} />'), 'ItemDetailWrapper does not forward its props');
		const exported = detail.indexOf('export function ItemDetail({');
		assert.ok(exported > 0, 'ItemDetail not found');
		assert.ok(
			detail.indexOf('<ItemDetailContent', exported) > 0 && detail.indexOf('rating={rating}', exported) > 0,
			'ItemDetail does not pass rating to ItemDetailContent'
		);
	});

	it('ItemDetailContent drops the rating when the viewer flags turn ratings off (database simulation)', () => {
		assert.ok(
			detail.includes('const { features, isPending: featureFlagsPending } = useFeatureFlagsWithSimulation();'),
			'ItemDetailContent does not read the simulation-aware feature flags'
		);
		assert.ok(
			detail.includes('rating: ratingWhenEnabled(rating, featureFlagsPending || features.ratings)'),
			'generateProductSchema does not get the rating gated on features.ratings'
		);
	});

	it('the rating route counts the same rows as the page (active reviewers, ratings 1-5)', () => {
		const joins = [
			'.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))',
			'.innerJoin(users, and(eq(users.id, clientProfiles.userId), isNull(users.deactivatedAt)))'
		];
		for (const join of joins) {
			assert.ok(commentQueries.includes(join), `getCommentsByItemId lost ${join}`);
			assert.ok(ratingRoute.includes(join), `the rating route lost ${join}`);
		}
		for (const condition of [
			'eq(comments.itemId, itemId)',
			'isNull(comments.deletedAt)',
			'eq(comments.tenantId, tenantId)'
		]) {
			assert.ok(commentQueries.includes(condition), `getCommentsByItemId lost ${condition}`);
			assert.ok(ratingRoute.includes(condition), `the rating route lost ${condition}`);
		}
		// summarizeRatings keeps MIN_RATING..MAX_RATING; the route filters on the same constants.
		assert.ok(ratingRoute.includes("import { MAX_RATING, MIN_RATING } from '@/lib/seo/aggregate-rating';"));
		assert.ok(ratingRoute.includes('gte(comments.rating, MIN_RATING)'), 'the route counts ratings below 1');
		assert.ok(ratingRoute.includes('lte(comments.rating, MAX_RATING)'), 'the route counts ratings above 5');
	});
});
