import { test, expect } from '../../fixtures';

test.describe('Client: Favorites', () => {
	test('favorites page is accessible', async ({ page }) => {
		await page.goto('/favorites', { waitUntil: 'domcontentloaded' });

		// Favorites page should load (may show content or sign-in prompt)
		await expect(page.locator('body')).toBeVisible();
	});

	test('authenticated client can access favorites page', async ({ clientPage }) => {
		await clientPage.goto('/favorites', { waitUntil: 'domcontentloaded' });

		await expect(clientPage.locator('body')).toBeVisible();
		// Should show either favorites list or empty state
		const heading = clientPage.getByRole('heading').first();
		await expect(heading).toBeVisible();
	});
});
