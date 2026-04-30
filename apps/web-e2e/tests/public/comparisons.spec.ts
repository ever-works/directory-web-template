import { test, expect } from '@playwright/test';

test.describe('Public: Comparisons', () => {
	test('comparisons listing page loads successfully', async ({ page }) => {
		const response = await page.goto('/comparisons', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBeLessThan(400);
		await expect(page.locator('body')).toBeVisible();
	});

	test('comparisons page renders a heading', async ({ page }) => {
		await page.goto('/comparisons', { waitUntil: 'domcontentloaded' });

		const heading = page.getByRole('heading').first();
		await expect(heading).toBeVisible();
	});
});
