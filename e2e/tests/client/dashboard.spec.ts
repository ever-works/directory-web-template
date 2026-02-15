import { test, expect } from '../../fixtures';

test.describe('Client: Dashboard', () => {
	test('authenticated client can access dashboard', async ({ clientPage }) => {
		await clientPage.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });

		await expect(clientPage).toHaveURL(/\/client\/dashboard/);
		await expect(clientPage.locator('main').first()).toBeVisible();
	});

	test('unauthenticated user is redirected to signin', async ({ page }) => {
		await page.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });

		await page.waitForURL(/\/auth\/signin/);
	});

	test('dashboard displays stats or content area', async ({ clientPage }) => {
		await clientPage.goto('/client/dashboard', { waitUntil: 'domcontentloaded' });

		// Dashboard should have visible content
		const heading = clientPage.getByRole('heading', { name: /dashboard/i }).first();
		await expect(heading).toBeVisible();
	});
});
