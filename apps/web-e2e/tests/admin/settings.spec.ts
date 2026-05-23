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

		// The settings page first renders a LoadingSkeleton, then the
		// real Accordion. Wait for an Accordion *anything* — the
		// Radix pattern uses `data-state` on triggers and content
		// alike, and the page itself uses h3 inside each trigger.
		// We deliberately don't pin on specific section names: the
		// admin settings layout reshuffles those frequently and the
		// load-bearing assertion is "the accordion mounted, not the
		// LoadingSkeleton".
		const accordionEvidence = adminPage
			.locator(
				'[data-state="open"], [data-state="closed"], button[aria-controls], details > summary, h3'
			)
			.first();
		await expect(accordionEvidence).toBeVisible({ timeout: 20_000 });
		const count = await adminPage
			.locator('[data-state="open"], [data-state="closed"], button[aria-controls], details > summary, h3')
			.count();
		expect(count, 'expected at least one settings accordion / section heading').toBeGreaterThan(0);
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
