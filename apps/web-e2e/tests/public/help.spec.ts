import { test, expect } from '@playwright/test';

test.describe('Public: Help / Interactive Guide', () => {
	test('help page loads successfully', async ({ page }) => {
		const response = await page.goto('/help', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBeLessThan(400);
		await expect(page.locator('body')).toBeVisible();
	});

	test('help page renders a primary heading', async ({ page }) => {
		await page.goto('/help', { waitUntil: 'domcontentloaded' });

		const heading = page.getByRole('heading', { level: 1 }).first();
		await expect(heading).toBeVisible();
	});
});
