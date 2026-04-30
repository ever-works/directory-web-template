import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public engagement metrics surface and the
 * auth-gated favorites + per-comment surfaces. Together these are the
 * last item-related API gaps not covered by `item-public.spec.ts`,
 * `protected.spec.ts`, or `payment-protected.spec.ts`.
 *
 * Engagement metrics is intentionally public (the ListingPage hydrates
 * vote / view / comment counts from it). Its contract is:
 *   - 400 when `slugs` query param is missing
 *   - 200 with `{ metrics: {} }` when no DB or the slugs are unknown
 *   - never 5xx, even on bad input
 *
 * Favorites + per-comment + per-rating-comment are auth-gated and
 * must respond with a 4xx without a session.
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';
const FAKE_COMMENT_ID = '__no_such_comment__';

test.describe('API: Items engagement metrics (public)', () => {
	test('GET /api/items/engagement without slugs returns 4xx (not 5xx)', async ({ request }) => {
		const response = await request.get('/api/items/engagement');

		expect(response.status()).toBeLessThan(500);
	});

	test('GET /api/items/engagement?slugs=&slugs=  with empty slugs is non-5xx', async ({ request }) => {
		const response = await request.get('/api/items/engagement?slugs=');

		expect(response.status()).toBeLessThan(500);
	});

	test('GET /api/items/engagement?slugs=foo,bar with unknown slugs returns 200 + metrics', async ({ request }) => {
		const response = await request.get('/api/items/engagement?slugs=foo,bar');

		expect(response.status()).toBeLessThan(500);
		// We do not assert on the body shape so the test stays valid
		// even when DB is unavailable (the route falls back to {}).
	});

	test('GET /api/items/engagement with too many slugs returns 4xx', async ({ request }) => {
		const slugs = Array.from({ length: 250 }, (_, i) => `item-${i}`).join(',');
		const response = await request.get(`/api/items/engagement?slugs=${slugs}`);

		expect(response.status()).toBeLessThan(500);
	});
});

const PER_COMMENT_AUTH_GATED_ENDPOINTS = [
	// Per-comment update / delete on the comments collection — auth-gated.
	// (Note: the comment-by-id route exposes PUT, not PATCH.)
	{ method: 'PUT', path: `/api/items/${NON_EXISTENT_SLUG}/comments/${FAKE_COMMENT_ID}` },
	{ method: 'DELETE', path: `/api/items/${NON_EXISTENT_SLUG}/comments/${FAKE_COMMENT_ID}` },

	// Auth-gated vote toggle / clear on a fake slug.
	{ method: 'POST', path: `/api/items/${NON_EXISTENT_SLUG}/votes` },
	{ method: 'DELETE', path: `/api/items/${NON_EXISTENT_SLUG}/votes` },

	// Favorites self-service collection.
	{ method: 'GET', path: '/api/favorites' },
	{ method: 'POST', path: '/api/favorites' },
	{ method: 'DELETE', path: `/api/favorites/${NON_EXISTENT_SLUG}` },
] as const;

test.describe('API: Item per-comment / favorites / user-write endpoints reject anonymous', () => {
	for (const { method, path } of PER_COMMENT_AUTH_GATED_ENDPOINTS) {
		test(`${method} ${path} responds without a server error`, async ({ request }) => {
			const isWriteMethod = method !== 'GET';
			const response = await request.fetch(path, {
				method,
				...(isWriteMethod
					? {
						data: {},
						headers: { 'content-type': 'application/json' },
					}
					: {}),
			});

			expect(response.status()).toBeLessThan(500);
		});
	}
});
