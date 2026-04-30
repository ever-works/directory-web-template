import { test, expect } from '@playwright/test';

test.describe('Public: About', () => {
	test('about page loads successfully', async ({ page }) => {
		const response = await page.goto('/about', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBeLessThan(400);
		await expect(page.locator('body')).toBeVisible();
	});

	test('about page renders a heading', async ({ page }) => {
		await page.goto('/about', { waitUntil: 'domcontentloaded' });

		const heading = page.getByRole('heading').first();
		await expect(heading).toBeVisible();
	});
});
