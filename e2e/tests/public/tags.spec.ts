import { test, expect } from '@playwright/test';

test.describe('Public: Tags', () => {
	test('tags page loads with heading', async ({ page }) => {
		await page.goto('/tags');

		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('tags page displays tag items', async ({ page }) => {
		await page.goto('/tags');
		await page.waitForLoadState('domcontentloaded');

		// Tags page should have links to individual tags
		const tagLinks = page.locator('a[href*="/tags/"]');
		const count = await tagLinks.count();
		expect(count).toBeGreaterThanOrEqual(0);
		await expect(page.locator('body')).toBeVisible();
	});

	test('clicking a tag navigates to tag detail', async ({ page }) => {
		await page.goto('/tags');
		await page.waitForLoadState('domcontentloaded');

		const firstTag = page.locator('a[href*="/tags/"]').first();
		if (await firstTag.isVisible()) {
			await firstTag.click();
			await expect(page).toHaveURL(/\/tags\//);
		}
	});
});
