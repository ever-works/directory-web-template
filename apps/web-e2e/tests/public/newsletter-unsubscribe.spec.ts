import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for `/newsletter/unsubscribe`. The page is reached
 * via a token link from a transactional email; rendering without a
 * token must still be a non-server-error response so the route is
 * verified to exist and not crash.
 */
test.describe('Public: Newsletter unsubscribe', () => {
	test('newsletter/unsubscribe page renders without a token', async ({ page }) => {
		const response = await page.goto('/newsletter/unsubscribe', {
			waitUntil: 'domcontentloaded',
		});

		expect(response?.status()).toBeLessThan(500);
		await expect(page.locator('body')).toBeVisible();
	});

	test('newsletter/unsubscribe page renders with a fake token', async ({ page }) => {
		const response = await page.goto('/newsletter/unsubscribe?token=__fake__', {
			waitUntil: 'domcontentloaded',
		});

		expect(response?.status()).toBeLessThan(500);
		await expect(page.locator('body')).toBeVisible();
	});
});
