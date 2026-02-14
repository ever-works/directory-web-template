import { test, expect } from '@playwright/test';

test.describe('Public: Item Detail Page', () => {
	test('item detail page displays heading and content', async ({ page }) => {
		// Navigate to discover to find a real item
		await page.goto('/discover/1');
		await page.waitForLoadState('networkidle');

		const firstItem = page.locator('a[href*="/items/"]').first();
		await expect(firstItem).toBeVisible({ timeout: 15_000 });

		await firstItem.click();
		await expect(page).toHaveURL(/\/items\//);

		// Item detail page should have a heading
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('item detail page has a visible body with content', async ({ page }) => {
		await page.goto('/discover/1');
		await page.waitForLoadState('networkidle');

		const firstItem = page.locator('a[href*="/items/"]').first();
		await expect(firstItem).toBeVisible({ timeout: 15_000 });
		const href = await firstItem.getAttribute('href');

		if (href) {
			const response = await page.goto(href);
			expect(response?.status()).toBeLessThan(400);
			await expect(page.locator('main, [role="main"], body')).toBeVisible();
		}
	});
});
