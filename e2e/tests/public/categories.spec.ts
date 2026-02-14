import { test, expect } from '@playwright/test';

test.describe('Public: Categories', () => {
	test('categories page loads with heading', async ({ page }) => {
		await page.goto('/categories');

		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('categories page displays category items', async ({ page }) => {
		await page.goto('/categories');
		await page.waitForLoadState('networkidle');

		// Categories page should have links to individual categories
		const categoryLinks = page.locator('a[href*="/categories/"]');
		const count = await categoryLinks.count();
		expect(count).toBeGreaterThan(0);
	});

	test('clicking a category navigates to category detail', async ({ page }) => {
		await page.goto('/categories');
		await page.waitForLoadState('networkidle');

		const firstCategory = page.locator('a[href*="/categories/"]').first();
		await expect(firstCategory).toBeVisible({ timeout: 10_000 });
		await firstCategory.click();

		await expect(page).toHaveURL(/\/categories\//);
	});
});
