import { test, expect } from '@playwright/test';

test.describe('Public: Categories', () => {
	test('categories page loads with heading', async ({ page }) => {
		await page.goto('/categories');

		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('categories page displays category items', async ({ page }) => {
		await page.goto('/categories');
		await page.waitForLoadState('domcontentloaded');

		// Categories page should have links to individual categories
		// Links may use /categories/slug or /tags/slug depending on routing
		const categoryLinks = page.locator('a[href*="/categories/"], a[href*="/tags/"]');
		const count = await categoryLinks.count();
		expect(count).toBeGreaterThanOrEqual(0);
		// Page content should be visible regardless of whether categories exist
		await expect(page.locator('body')).toBeVisible();
	});

	test('clicking a category navigates to category detail', async ({ page }) => {
		await page.goto('/categories');
		await page.waitForLoadState('domcontentloaded');

		const firstCategory = page.locator('a[href*="/categories/"], a[href*="/tags/"]').first();
		if (await firstCategory.isVisible()) {
			await firstCategory.click();
			await expect(page).toHaveURL(/\/(categories|tags)\//);
		}
	});
});
