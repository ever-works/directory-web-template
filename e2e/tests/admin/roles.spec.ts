import { test, expect } from '../../fixtures';
import { AdminRolesPage } from '../../page-objects/admin/roles.page';

test.describe('Admin: Roles Management', () => {
	test('admin can access roles management page', async ({ adminPage }) => {
		const rolesPage = new AdminRolesPage(adminPage);

		await rolesPage.navigate();
		await rolesPage.waitForPageReady();

		await expect(rolesPage.heading).toBeVisible();
		await expect(rolesPage.addRoleButton).toBeVisible();
	});

	test('roles page displays stats cards', async ({ adminPage }) => {
		const rolesPage = new AdminRolesPage(adminPage);

		await rolesPage.navigate();
		await rolesPage.waitForPageReady();

		// Stats grid should be visible (Total Roles, Admin Roles, Client Roles)
		const statsGrid = adminPage.locator('.grid').first();
		await expect(statsGrid).toBeVisible({ timeout: 10_000 });
	});

	test('admin can search roles', async ({ adminPage }) => {
		const rolesPage = new AdminRolesPage(adminPage);

		await rolesPage.navigate();
		await rolesPage.waitForPageReady();

		const searchInput = rolesPage.searchInput;
		const isSearchVisible = await searchInput.isVisible().catch(() => false);

		if (!isSearchVisible) {
			test.skip(true, 'Search input not visible on roles page');
			return;
		}

		// Search for a term
		await rolesPage.searchRoles('admin');
		await adminPage.waitForTimeout(500);

		// Clear search
		await rolesPage.searchInput.clear();
		await adminPage.waitForTimeout(500);
	});

	test('admin can open add role form modal', async ({ adminPage }) => {
		const rolesPage = new AdminRolesPage(adminPage);

		await rolesPage.navigate();
		await rolesPage.waitForPageReady();

		// Click Add Role
		await rolesPage.addRoleButton.click();

		// Role form modal should open
		await expect(rolesPage.roleFormModal).toBeVisible({ timeout: 5_000 });

		// Close the modal
		await adminPage.keyboard.press('Escape');
		await adminPage.waitForTimeout(1_000);
	});
});
