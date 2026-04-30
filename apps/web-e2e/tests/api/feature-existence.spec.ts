import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public "does this feature have data" endpoints
 * the marketing surface uses to gate UI (e.g. hide the Categories link
 * if there are no categories yet, hide the Surveys link in the nav, etc).
 *
 * All of these are intentionally public and degrade quietly when the
 * database is missing — the contract is "must respond with a non-server
 * error status". Payload shape is not asserted because it varies with
 * the active data repository / database state.
 */
const PUBLIC_EXISTENCE_ENDPOINTS = [
	'/api/categories/exists',
	'/api/categories/exists?locale=fr',
	'/api/collections/exists',
	'/api/surveys/exists',
	'/api/surveys/exists?type=item',
	'/api/surveys/exists?type=global',
	'/api/items/export/settings',
] as const;

test.describe('API: Public feature-existence endpoints', () => {
	for (const path of PUBLIC_EXISTENCE_ENDPOINTS) {
		test(`GET ${path} returns a non-server-error response`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}
});
