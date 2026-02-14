import { test, expect } from '../../fixtures';

test.describe('Client: Dashboard', () => {
	test('authenticated client can access dashboard', async ({ clientPage }) => {
		await clientPage.goto('/client/dashboard');

		await expect(clientPage).toHaveURL(/\/client\/dashboard/);
		await expect(clientPage.locator('main, [role="main"], body')).toBeVisible();
	});

	test('unauthenticated user is redirected to signin', async ({ page }) => {
		await page.goto('/client/dashboard');

		await page.waitForURL(/\/auth\/signin/, { timeout: 15_000 });
	});

	test('dashboard displays stats or content area', async ({ clientPage }) => {
		await clientPage.goto('/client/dashboard');
		await clientPage.waitForLoadState('networkidle');

		// Dashboard should have visible content
		const heading = clientPage.getByRole('heading', { name: /dashboard/i }).first();
		await expect(heading).toBeVisible({ timeout: 15_000 });
	});
});
