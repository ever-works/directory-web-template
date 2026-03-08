import { test, expect } from '../../fixtures';
import { ProfileDropdown } from '../../page-objects/public/profile-dropdown.page';

test.describe('UI: Profile Dropdown', () => {
	test('profile button is visible for authenticated admin', async ({ adminPage }) => {
		await adminPage.goto('/admin', { waitUntil: 'domcontentloaded' });

		const profileDropdown = new ProfileDropdown(adminPage);
		await expect(profileDropdown.triggerButton).toBeVisible({ timeout: 10_000 });
	});

	test('clicking profile button opens menu', async ({ adminPage }) => {
		await adminPage.goto('/admin', { waitUntil: 'domcontentloaded' });

		const profileDropdown = new ProfileDropdown(adminPage);
		await expect(profileDropdown.triggerButton).toBeVisible({ timeout: 10_000 });

		await profileDropdown.open();
		await adminPage.waitForTimeout(500);

		const isOpen = await profileDropdown.isOpen();
		expect(isOpen).toBe(true);

		// Menu should be visible
		await expect(profileDropdown.menu).toBeVisible();
	});

	test('profile menu contains menu items', async ({ adminPage }) => {
		await adminPage.goto('/admin', { waitUntil: 'domcontentloaded' });

		const profileDropdown = new ProfileDropdown(adminPage);
		await expect(profileDropdown.triggerButton).toBeVisible({ timeout: 10_000 });

		await profileDropdown.open();
		await adminPage.waitForTimeout(500);

		// Should have multiple menu items
		const itemCount = await profileDropdown.menuItems.count();
		expect(itemCount).toBeGreaterThan(0);
	});

	test('profile menu has logout button', async ({ adminPage }) => {
		await adminPage.goto('/admin', { waitUntil: 'domcontentloaded' });

		const profileDropdown = new ProfileDropdown(adminPage);
		await expect(profileDropdown.triggerButton).toBeVisible({ timeout: 10_000 });

		await profileDropdown.open();
		await adminPage.waitForTimeout(500);

		// Logout button should be the last menu item
		await expect(profileDropdown.logoutButton).toBeVisible();
	});

	test('pressing Escape closes profile menu', async ({ adminPage }) => {
		await adminPage.goto('/admin', { waitUntil: 'domcontentloaded' });

		const profileDropdown = new ProfileDropdown(adminPage);
		await expect(profileDropdown.triggerButton).toBeVisible({ timeout: 10_000 });

		await profileDropdown.open();
		await adminPage.waitForTimeout(500);
		await expect(profileDropdown.menu).toBeVisible();

		await adminPage.keyboard.press('Escape');
		await adminPage.waitForTimeout(500);

		const isOpen = await profileDropdown.isOpen();
		expect(isOpen).toBe(false);
	});
});
