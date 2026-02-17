import { test, expect } from '@playwright/test';

test.describe('Smoke: Core navigation', () => {
	test('home page displays directory items', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const items = page.locator('a[href*="/items/"]');
		await expect(items.first()).toBeVisible({ timeout: 30_000 });

		const count = await items.count();
		expect(count).toBeGreaterThan(0);
	});

	test('can navigate from home to an item detail page', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const firstItem = page.locator('a[href*="/items/"]').first();
		await expect(firstItem).toBeVisible({ timeout: 30_000 });

		await firstItem.click();

		await page.waitForURL(/\/items\//, { waitUntil: 'domcontentloaded' });
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('can navigate to categories page', async ({ page }) => {
		await page.goto('/categories', { waitUntil: 'domcontentloaded' });

		await expect(page.locator('body')).toBeVisible();
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('can navigate to sign in from home', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const signInLink = page.getByRole('link', { name: /sign in/i }).first();
		await expect(signInLink).toBeVisible();
		await signInLink.click();
		await expect(page).toHaveURL(/\/auth\/signin/);
	});
});
