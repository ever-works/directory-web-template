import { test, expect } from '@playwright/test';

test.describe('Auth: New verification page (/auth/new-verification)', () => {
	test('renders without a token', async ({ page }) => {
		const response = await page.goto('/auth/new-verification', {
			waitUntil: 'domcontentloaded',
		});

		expect(response?.status()).toBeLessThan(500);
		await expect(page.locator('body')).toBeVisible();
	});

	test('renders with a fake token query param', async ({ page }) => {
		const response = await page.goto('/auth/new-verification?token=fake-token-123', {
			waitUntil: 'domcontentloaded',
		});

		expect(response?.status()).toBeLessThan(500);
		await expect(page.locator('body')).toBeVisible();
	});
});
