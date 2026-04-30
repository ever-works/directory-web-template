import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for public-facing discovery endpoints used by the
 * marketing surface (landing, item detail, sponsor banners).
 *
 * These routes do not require authentication. The contract for each
 * is "must respond with a non-server-error status" — content varies
 * with the data repository so we do not assert payload shape.
 */
const PUBLIC_ENDPOINTS = [
	'/api/sponsor-ads',
	'/api/sponsor-ads?limit=5',
	'/api/items/popularity-scores',
	'/api/items/export',
] as const;

test.describe('API: Public discovery surfaces', () => {
	for (const path of PUBLIC_ENDPOINTS) {
		test(`GET ${path} returns a non-server-error response`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/items/[slug] for an unknown slug does not 5xx', async ({ request }) => {
		const response = await request.get(
			'/api/items/__definitely-not-a-real-slug__',
		);

		// Either a 404 (preferred) or a 200 with empty content is
		// acceptable. The contract is "no server error".
		expect(response.status()).toBeLessThan(500);
	});
});
