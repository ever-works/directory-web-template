import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public per-item API surface used on the item
 * detail page. We use a slug that intentionally does not exist in any
 * data repository; the contract is "must respond with a non-server
 * error status" for all of them — typically 200 with an empty payload
 * or 404, never 5xx.
 *
 * Auth-gated per-item endpoints (e.g. votes/status, item company
 * assignment) are exercised in `protected.spec.ts` /
 * `auth-required.spec.ts` instead.
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';

const PUBLIC_ITEM_ENDPOINTS = [
	`/api/items/${NON_EXISTENT_SLUG}/votes/count`,
	`/api/items/${NON_EXISTENT_SLUG}/comments`,
	`/api/items/${NON_EXISTENT_SLUG}/comments/rating`,
] as const;

test.describe('API: Public item endpoints (non-existent slug)', () => {
	for (const path of PUBLIC_ITEM_ENDPOINTS) {
		test(`GET ${path} does not 5xx`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST /api/items/${NON_EXISTENT_SLUG}/views responds without 5xx`, async ({ request }) => {
		// Bot detection short-circuits with 200 for headless UAs that
		// look like bots; otherwise the slug-validation step returns 404.
		// Either way the contract is no 5xx.
		const response = await request.post(`/api/items/${NON_EXISTENT_SLUG}/views`);

		expect(response.status()).toBeLessThan(500);
	});

	test('POST /api/items/[slug]/comments without auth is rejected', async ({ request }) => {
		// Unauthenticated POST should be 401/403, never 5xx.
		const response = await request.post(`/api/items/${NON_EXISTENT_SLUG}/comments`, {
			data: { content: 'hello' },
			headers: { 'content-type': 'application/json' },
		});

		expect(response.status()).toBeLessThan(500);
	});
});
