import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for `/api/items/[slug]/comments/rating/[commentId]`.
 *
 * This is the per-comment rating route. It exports two methods:
 *
 *   - `GET`  — fetch a comment by id (returns the row or `null`).
 *   - `PATCH` — update a comment rating; the handler delegates to
 *     `updateCommentRating()` without further auth checks, so an
 *     anonymous PATCH should respond with a structured 4xx (database
 *     reject / not-found) rather than 5xx.
 *
 * Both branches must respond with a status < 500 for an unknown
 * comment id. This closes the last public per-item GET surface that
 * was implicit rather than explicit (sibling routes
 * `/api/items/[slug]/comments/rating` and `/comments/[commentId]` are
 * already covered by `item-public.spec.ts` /
 * `items-engagement-and-favorites.spec.ts`).
 */
const NON_EXISTENT_SLUG = '__smoke-unknown-slug__';
const NON_EXISTENT_COMMENT_ID = '__smoke-unknown-comment__';
const PATH = `/api/items/${NON_EXISTENT_SLUG}/comments/rating/${NON_EXISTENT_COMMENT_ID}`;

test.describe('API: per-comment rating by id (non-existent comment)', () => {
	test(`GET ${PATH} does not 5xx`, async ({ request }) => {
		const response = await request.get(PATH);

		expect(response.status()).toBeLessThan(500);
	});

	test(`PATCH ${PATH} without auth does not 5xx`, async ({ request }) => {
		const response = await request.patch(PATH, {
			data: { rating: 5 },
			headers: { 'content-type': 'application/json' },
		});

		expect(response.status()).toBeLessThan(500);
	});
});
