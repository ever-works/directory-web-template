import { test, expect } from '@playwright/test';

/**
 * Smoke for the public per-item survey response page,
 * `/items/[slug]/surveys/[surveySlug]`.
 *
 * Anonymous visitors see either the survey form (when surveys are
 * enabled and both the item and survey exist), or a 404 / non-5xx
 * fallback when the slug pair is unknown or surveys are disabled.
 */
const PATHS = [
	'/items/__smoke-unknown__/surveys/__smoke-unknown__',
	'/items/__smoke-unknown__/surveys/feedback',
] as const;

test.describe('Public: /items/[slug]/surveys/[surveySlug]', () => {
	for (const path of PATHS) {
		test(`GET ${path} responds non-5xx`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

			expect(response?.status()).toBeLessThan(500);
			await expect(page.locator('body')).toBeVisible();
		});
	}
});
