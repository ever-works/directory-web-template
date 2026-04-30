import { test, expect } from '@playwright/test';

/**
 * Smoke for the paginated listing surfaces:
 *   - `/(listing)/discover/[page]` → already covered for page 1 in
 *     `discover.spec.ts`. Here we also smoke higher page numbers and
 *     out-of-range numeric segments.
 *   - `/collections/paging`, `/collections/paging/[page]`
 *   - `/tags/paging`, `/tags/paging/[page]`
 *
 * The contract is "non-5xx with a visible body" — content depends on
 * how much demo content the deployment has.
 */
const PAGINATED_PATHS = [
	'/discover/2',
	'/discover/9999',
	'/collections/paging',
	'/collections/paging/2',
	'/tags/paging',
	'/tags/paging/2',
] as const;

test.describe('Public: paginated listing surfaces', () => {
	for (const path of PAGINATED_PATHS) {
		test(`GET ${path} responds non-5xx`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

			expect(response?.status()).toBeLessThan(500);
			await expect(page.locator('body')).toBeVisible();
		});
	}
});
