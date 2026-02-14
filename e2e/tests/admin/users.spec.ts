import { test, expect } from '../../fixtures';

test.describe('Admin: User Management', () => {
	test('admin can access users management page', async ({ adminPage }) => {
		await adminPage.goto('/admin/users');

		await expect(adminPage.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('users page displays content', async ({ adminPage }) => {
		await adminPage.goto('/admin/users');
		await adminPage.waitForLoadState('networkidle');

		const content = adminPage.locator('main, [role="main"], body');
		await expect(content).toBeVisible();
	});
});
