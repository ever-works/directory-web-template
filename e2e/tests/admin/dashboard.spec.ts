import { test, expect } from '../../fixtures';
import { AdminDashboardPage } from '../../page-objects/admin/dashboard.page';

test.describe('Admin: Dashboard', () => {
	test('authenticated admin can access admin panel', async ({ adminPage }) => {
		const dashboard = new AdminDashboardPage(adminPage);
		await dashboard.navigate();

		await expect(adminPage.locator('body')).toBeVisible();
		// Admin dashboard should have main content area
		await expect(dashboard.mainContent).toBeVisible({ timeout: 15_000 });
	});

	test('admin dashboard displays tab navigation', async ({ adminPage }) => {
		const dashboard = new AdminDashboardPage(adminPage);
		await dashboard.navigate();
		await dashboard.waitForPageReady();

		await expect(dashboard.tabList).toBeVisible({ timeout: 15_000 });
	});

	test('non-admin client is redirected from admin', async ({ clientPage }) => {
		await clientPage.goto('/admin');
		await clientPage.waitForLoadState('networkidle');

		// Non-admin should be redirected to unauthorized or signin
		const url = clientPage.url();
		const isRedirected = url.includes('/unauthorized') || url.includes('/auth/signin') || url.includes('/client');
		expect(isRedirected).toBeTruthy();
	});

	test('unauthenticated user cannot access admin', async ({ page }) => {
		await page.goto('/admin');

		await page.waitForURL(/\/(auth\/signin|unauthorized)/, { timeout: 15_000 });
	});
});
