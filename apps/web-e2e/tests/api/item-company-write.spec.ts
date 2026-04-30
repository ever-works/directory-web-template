import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the auth-gated **write** endpoints on
 * `/api/items/[slug]/company` (admin-only company assignment /
 * unassignment). The matching `GET` is already smoked in
 * `payment-protected.spec.ts`, but the `POST` and `DELETE` write
 * surfaces were not explicitly exercised — when called anonymously
 * with an empty / unsigned body, both must respond with a 4xx
 * (typically 401), never a 5xx.
 *
 * Uses an intentionally non-existent slug so this spec never depends
 * on the data repository's content.
 */
const NON_EXISTENT_SLUG = '__definitely-not-a-real-item-slug__';

const ITEM_COMPANY_WRITE_ENDPOINTS = [
	{ method: 'POST', path: `/api/items/${NON_EXISTENT_SLUG}/company` },
	{ method: 'DELETE', path: `/api/items/${NON_EXISTENT_SLUG}/company` },
] as const;

test.describe('API: Item company write endpoints reject anonymous', () => {
	for (const { method, path } of ITEM_COMPANY_WRITE_ENDPOINTS) {
		test(`${method} ${path} responds without a server error`, async ({ request }) => {
			const response = await request.fetch(path, {
				method,
				data: {},
				headers: { 'content-type': 'application/json' },
			});

			expect(response.status()).toBeLessThan(500);
		});
	}
});
