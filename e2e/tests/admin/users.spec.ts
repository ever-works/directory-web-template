import { test, expect } from '../../fixtures';

test.describe('Admin: User Management', () => {
	test('admin can access users management page', async ({ adminPage }) => {
		await adminPage.goto('/admin/users', { waitUntil: 'domcontentloaded' });

		const heading = adminPage.getByRole('heading').first();
		await expect(heading).toBeVisible();
	});

	test('users page displays content', async ({ adminPage }) => {
		await adminPage.goto('/admin/users', { waitUntil: 'domcontentloaded' });

		const content = adminPage.locator('main').first();
		await expect(content).toBeVisible();
	});
});
