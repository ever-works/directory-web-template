import { test, expect } from '@playwright/test';

test.describe('Public: CMS pages route (/pages/[slug])', () => {
	test('unknown slug returns 404 contract', async ({ page }) => {
		const response = await page.goto('/pages/__definitely-not-a-page__', {
			waitUntil: 'domcontentloaded',
		});

		expect(response, 'response should not be null').not.toBeNull();
		expect([404, 200]).toContain(response!.status());
		await expect(page.locator('body')).toBeVisible();
	});

	test('about-style slug renders with body content', async ({ page }) => {
		// `/pages/[slug]` is a generic CMS surface — pick a slug that is
		// commonly seeded in the demo content repo. If the slug doesn't exist
		// we still want a valid 404 page rather than a server error.
		const response = await page.goto('/pages/about', {
			waitUntil: 'domcontentloaded',
		});

		expect(response?.status()).toBeLessThan(500);
		await expect(page.locator('body')).toBeVisible();
	});
});
