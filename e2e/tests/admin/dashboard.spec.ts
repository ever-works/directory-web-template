import { test, expect } from '../../fixtures';
import { AdminDashboardPage } from '../../page-objects/admin/dashboard.page';

test.describe('Admin: Dashboard', () => {
	test('authenticated admin can access admin panel', async ({ adminPage }) => {
		const dashboard = new AdminDashboardPage(adminPage);
		await dashboard.navigate();

		await expect(adminPage.locator('body')).toBeVisible();
		// Admin dashboard should have main content area
		await expect(dashboard.mainContent).toBeVisible();
	});

	test('admin dashboard displays tab navigation', async ({ adminPage }) => {
		const dashboard = new AdminDashboardPage(adminPage);
		await dashboard.navigate();
		await dashboard.waitForPageReady();

		await expect(dashboard.tabList).toBeVisible();
	});

	test('non-admin client is redirected from admin', async ({ clientPage }) => {
		await clientPage.goto('/admin', { waitUntil: 'domcontentloaded' });

		// Non-admin should be redirected to unauthorized, signin, or client area
		await expect(clientPage).not.toHaveURL(/\/admin$/);
	});

	test('unauthenticated user cannot access admin', async ({ page }) => {
		await page.goto('/admin', { waitUntil: 'domcontentloaded' });

		await page.waitForURL(/\/(auth\/signin|unauthorized)/);
	});
});
