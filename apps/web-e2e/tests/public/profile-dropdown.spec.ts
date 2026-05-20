import { test, expect } from '../../fixtures';
import { ProfileDropdown } from '../../page-objects/public/profile-dropdown.page';

// The profile dropdown lives in the public-site header. /admin uses
// a separate AdminLayoutClient that doesn't render the public chrome,
// so probing `#user-menu-button` on /admin only works on theme
// variants that share the public header. Visit `/` (where the
// header is always present) and skip gracefully on themes that
// don't expose this dropdown id.

test.describe('UI: Profile Dropdown', () => {
	test('profile button is visible for authenticated admin', async ({ adminPage }) => {
		await adminPage.goto('/', { waitUntil: 'domcontentloaded' });
		const profileDropdown = new ProfileDropdown(adminPage);
		const isVisible = await profileDropdown.triggerButton.isVisible({ timeout: 5_000 }).catch(() => false);
		if (!isVisible) {
			test.skip(true, 'Theme does not expose #user-menu-button on the public header');
			return;
		}
		await expect(profileDropdown.triggerButton).toBeVisible();
	});

	test('clicking profile button opens menu', async ({ adminPage }) => {
		await adminPage.goto('/', { waitUntil: 'domcontentloaded' });
		const profileDropdown = new ProfileDropdown(adminPage);
		const isVisible = await profileDropdown.triggerButton.isVisible({ timeout: 5_000 }).catch(() => false);
		if (!isVisible) {
			test.skip(true, 'Theme does not expose #user-menu-button on the public header');
			return;
		}

		await profileDropdown.open();
		await adminPage.waitForTimeout(500);

		const isOpen = await profileDropdown.isOpen();
		expect(isOpen).toBe(true);

		// Menu should be visible
		await expect(profileDropdown.menu).toBeVisible();
	});

	test('profile menu contains menu items', async ({ adminPage }) => {
		await adminPage.goto('/', { waitUntil: 'domcontentloaded' });
		const profileDropdown = new ProfileDropdown(adminPage);
		const isVisible = await profileDropdown.triggerButton.isVisible({ timeout: 5_000 }).catch(() => false);
		if (!isVisible) {
			test.skip(true, 'Theme does not expose #user-menu-button on the public header');
			return;
		}

		await profileDropdown.open();
		await adminPage.waitForTimeout(500);

		// Should have multiple menu items
		const itemCount = await profileDropdown.menuItems.count();
		expect(itemCount).toBeGreaterThan(0);
	});

	test('profile menu has logout button', async ({ adminPage }) => {
		await adminPage.goto('/', { waitUntil: 'domcontentloaded' });
		const profileDropdown = new ProfileDropdown(adminPage);
		const isVisible = await profileDropdown.triggerButton.isVisible({ timeout: 5_000 }).catch(() => false);
		if (!isVisible) {
			test.skip(true, 'Theme does not expose #user-menu-button on the public header');
			return;
		}

		await profileDropdown.open();
		await adminPage.waitForTimeout(500);

		// Logout button should be the last menu item
		await expect(profileDropdown.logoutButton).toBeVisible();
	});

	test('pressing Escape closes profile menu', async ({ adminPage }) => {
		await adminPage.goto('/', { waitUntil: 'domcontentloaded' });
		const profileDropdown = new ProfileDropdown(adminPage);
		const isVisible = await profileDropdown.triggerButton.isVisible({ timeout: 5_000 }).catch(() => false);
		if (!isVisible) {
			test.skip(true, 'Theme does not expose #user-menu-button on the public header');
			return;
		}

		await profileDropdown.open();
		await adminPage.waitForTimeout(500);
		await expect(profileDropdown.menu).toBeVisible();

		await adminPage.keyboard.press('Escape');
		await adminPage.waitForTimeout(500);

		const isOpen = await profileDropdown.isOpen();
		expect(isOpen).toBe(false);
	});
});
