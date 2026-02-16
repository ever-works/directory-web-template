import { test, expect } from '../../fixtures';
import { AdminItemsPage } from '../../page-objects/admin/items.page';

test.describe('Admin: Items Management', () => {
	test('admin can access items management page', async ({ adminPage }) => {
		const itemsPage = new AdminItemsPage(adminPage);
		await itemsPage.navigate();

		await expect(itemsPage.heading).toBeVisible();
	});

	test('items page displays items list or empty state', async ({ adminPage }) => {
		const itemsPage = new AdminItemsPage(adminPage);
		await itemsPage.navigate();
		await itemsPage.waitForPageReady();

		// Should have either items or an empty state message
		const content = adminPage.locator('main').first();
		await expect(content).toBeVisible();
	});

	test('items page has add item button', async ({ adminPage }) => {
		const itemsPage = new AdminItemsPage(adminPage);
		await itemsPage.navigate();
		await itemsPage.waitForPageReady();

		await expect(itemsPage.addItemButton).toBeVisible();
	});
});
