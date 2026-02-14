import { test, expect } from '@playwright/test';

test.describe('Public: Tags', () => {
	test('tags page loads with heading', async ({ page }) => {
		await page.goto('/tags');

		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('tags page displays tag items', async ({ page }) => {
		await page.goto('/tags');
		await page.waitForLoadState('networkidle');

		// Tags page should have links to individual tags
		const tagLinks = page.locator('a[href*="/tags/"]');
		const count = await tagLinks.count();
		expect(count).toBeGreaterThan(0);
	});

	test('clicking a tag navigates to tag detail', async ({ page }) => {
		await page.goto('/tags');
		await page.waitForLoadState('networkidle');

		const firstTag = page.locator('a[href*="/tags/"]').first();
		await expect(firstTag).toBeVisible({ timeout: 10_000 });
		await firstTag.click();

		await expect(page).toHaveURL(/\/tags\//);
	});
});
