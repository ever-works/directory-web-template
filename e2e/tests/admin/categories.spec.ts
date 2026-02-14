import { test, expect } from '../../fixtures';

test.describe('Admin: Categories Management', () => {
	test('admin can access categories management page', async ({ adminPage }) => {
		await adminPage.goto('/admin/categories');

		await expect(adminPage.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
	});

	test('categories page displays content', async ({ adminPage }) => {
		await adminPage.goto('/admin/categories');
		await adminPage.waitForLoadState('networkidle');

		const content = adminPage.locator('main, [role="main"], body');
		await expect(content).toBeVisible();
	});
});
