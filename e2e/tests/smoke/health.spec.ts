import { test, expect } from '@playwright/test';
import { PUBLIC_ROUTES } from '../../helpers/test-data';

test.describe('Smoke: Public pages health check', () => {
	for (const route of PUBLIC_ROUTES) {
		test(`${route.name} page loads (${route.path})`, async ({ page }) => {
			const response = await page.goto(route.path);

			expect(response?.status()).toBeLessThan(400);
			await expect(page.locator('body')).toBeVisible();
		});
	}
});
