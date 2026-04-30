import { test, expect } from '@playwright/test';

test.describe('Public: Docs landing page', () => {
	test('/docs renders successfully', async ({ page }) => {
		const response = await page.goto('/docs', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBeLessThan(400);
		await expect(page.locator('body')).toBeVisible();
	});

	test('/docs exposes a primary heading', async ({ page }) => {
		await page.goto('/docs', { waitUntil: 'domcontentloaded' });

		const heading = page.getByRole('heading', { level: 1 }).first();
		await expect(heading).toBeVisible();
	});
});
