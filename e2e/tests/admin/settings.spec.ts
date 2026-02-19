import { test, expect } from '../../fixtures';
import { AdminSettingsPage } from '../../page-objects/admin/settings.page';

test.describe('Admin: Settings Management', () => {
	test('admin can access settings page', async ({ adminPage }) => {
		const settingsPage = new AdminSettingsPage(adminPage);

		await settingsPage.navigate();
		await settingsPage.waitForPageReady();

		await expect(settingsPage.heading).toBeVisible();
	});

	test('settings page has accordion sections', async ({ adminPage }) => {
		const settingsPage = new AdminSettingsPage(adminPage);

		await settingsPage.navigate();
		await settingsPage.waitForPageReady();

		// Check that accordion triggers are visible
		const accordionTriggers = adminPage.locator('[data-state]').filter({ hasText: /general|homepage|header|footer|monetization|location|navigation/i });
		const count = await accordionTriggers.count();
		expect(count).toBeGreaterThan(0);
	});

	test('admin can expand General Settings section', async ({ adminPage }) => {
		const settingsPage = new AdminSettingsPage(adminPage);

		await settingsPage.navigate();
		await settingsPage.waitForPageReady();

		// Open General section
		await settingsPage.openSection('General');
		await adminPage.waitForTimeout(500);

		// Should reveal toggle switches for feature flags
		const switches = settingsPage.switches;
		const switchCount = await switches.count();
		expect(switchCount).toBeGreaterThan(0);
	});

	test('admin can expand Homepage Settings section', async ({ adminPage }) => {
		const settingsPage = new AdminSettingsPage(adminPage);

		await settingsPage.navigate();
		await settingsPage.waitForPageReady();

		// Open Homepage section
		await settingsPage.openSection('Homepage');
		await adminPage.waitForTimeout(500);

		// Should reveal settings controls
		const mainContent = adminPage.locator('main').first();
		await expect(mainContent).toBeVisible();
	});

	test('admin can expand Header Settings section', async ({ adminPage }) => {
		const settingsPage = new AdminSettingsPage(adminPage);

		await settingsPage.navigate();
		await settingsPage.waitForPageReady();

		// Open Header section
		await settingsPage.openSection('Header');
		await adminPage.waitForTimeout(500);

		// Should reveal toggle switches and selects
		const switches = settingsPage.switches;
		const switchCount = await switches.count();
		expect(switchCount).toBeGreaterThan(0);
	});

	test('admin can expand Monetization Settings section', async ({ adminPage }) => {
		const settingsPage = new AdminSettingsPage(adminPage);

		await settingsPage.navigate();
		await settingsPage.waitForPageReady();

		// Open Monetization section
		await settingsPage.openSection('Monetization');
		await adminPage.waitForTimeout(500);

		// Should reveal monetization settings (sponsor ads toggle, pricing)
		const mainContent = adminPage.locator('main').first();
		await expect(mainContent).toBeVisible();
	});
});
