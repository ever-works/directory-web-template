import { test, expect } from '../../fixtures';

test.describe('Admin: Categories Management', () => {
	test('admin can access categories management page', async ({ adminPage }) => {
		await adminPage.goto('/admin/categories', { waitUntil: 'domcontentloaded' });

		// Admin panel header or page heading
		const heading = adminPage.getByRole('heading').first();
		await expect(heading).toBeVisible();
	});

	test('categories page displays content', async ({ adminPage }) => {
		await adminPage.goto('/admin/categories', { waitUntil: 'domcontentloaded' });

		const content = adminPage.locator('main').first();
		await expect(content).toBeVisible();
	});
});
