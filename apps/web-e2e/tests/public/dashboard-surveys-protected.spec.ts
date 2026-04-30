import { test, expect } from '@playwright/test';

/**
 * Smoke for the dashboard "item surveys" owner flow. These pages
 * live under `/dashboard/items/[itemId]/surveys/...` and are
 * protected — anonymous visitors must be redirected to signin
 * (or a non-5xx auth-error fallback). The route also short-circuits
 * to `notFound()` when the surveys feature is disabled, so 404 is
 * an acceptable response too.
 *
 * Same "non-5xx" contract as the rest of the protected smoke layer.
 */
const PROTECTED_SURVEY_PAGES = [
	'/dashboard/items/__smoke-item__/surveys',
	'/dashboard/items/__smoke-item__/surveys/__smoke-survey__/preview',
	'/dashboard/items/__smoke-item__/surveys/__smoke-survey__/responses',
] as const;

test.describe('Public: dashboard item-survey pages reject anonymous visitors', () => {
	for (const path of PROTECTED_SURVEY_PAGES) {
		test(`GET ${path} responds without a server error`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

			expect(response?.status()).toBeLessThan(500);
			await expect(page.locator('body')).toBeVisible();
		});
	}
});
