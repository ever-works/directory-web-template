import { test, expect } from '@playwright/test';

test.describe('Public: Item Detail Page', () => {
	test('item detail page displays heading and content', async ({ page }) => {
		// Navigate to discover to find a real item
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });

		const firstItem = page.locator('a[href*="/items/"]').first();
		await expect(firstItem).toBeVisible();

		await firstItem.click();
		await expect(page).toHaveURL(/\/items\//);

		// Item detail page should have a heading
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('item detail page has a visible body with content', async ({ page }) => {
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });

		const firstItem = page.locator('a[href*="/items/"]').first();
		await expect(firstItem).toBeVisible();
		const href = await firstItem.getAttribute('href');
		expect(href, 'Item link should have an href attribute').toBeTruthy();

		const response = await page.goto(href!, { waitUntil: 'domcontentloaded' });
		expect(response, `Navigation to ${href} returned null`).not.toBeNull();
		expect(response!.status()).toBeLessThan(400);
		await expect(page.locator('body')).toBeVisible();
	});
});
