import { test, expect } from '@playwright/test';

/**
 * Smoke for the legacy / nested routing variants that exist in
 * `apps/web/app/[locale]/`:
 *   - `/categories/category/[...categorie]` (legacy nested segment)
 *   - `/tags/tag/[...tags]` (legacy nested segment)
 *   - the `(listing)` group's `/tags/[...tag]` route
 *
 * These are catch-all routes: an unknown slug should still resolve
 * to either a 404 surface or an empty-state listing — never a 500.
 */
const LEGACY_PATHS = [
	'/categories/category/__smoke-unknown__',
	'/categories/category/parent/child',
	'/tags/tag/__smoke-unknown__',
	'/tags/tag/parent/child',
	'/tags/__smoke-unknown__',
] as const;

test.describe('Public: legacy / nested routing variants', () => {
	for (const path of LEGACY_PATHS) {
		test(`GET ${path} responds non-5xx`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

			expect(response?.status()).toBeLessThan(500);
			await expect(page.locator('body')).toBeVisible();
		});
	}
});
