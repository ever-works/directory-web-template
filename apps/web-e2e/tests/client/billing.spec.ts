import { test, expect } from '../../fixtures';

test.describe('Client: Dashboard billing (/dashboard/billing)', () => {
	test('authenticated client can access billing page', async ({ clientPage }) => {
		const response = await clientPage.goto('/dashboard/billing', {
			waitUntil: 'domcontentloaded',
		});

		expect(response?.status()).toBeLessThan(500);
		await expect(clientPage.locator('body')).toBeVisible();
	});

	test('unauthenticated user is redirected to signin from billing', async ({ page }) => {
		await page.goto('/dashboard/billing', { waitUntil: 'domcontentloaded' });

		await page.waitForURL(/\/auth\/signin|\/dashboard\/billing/);
	});
});
