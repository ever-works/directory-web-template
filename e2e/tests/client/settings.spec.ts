import { test, expect } from '../../fixtures';
import { ClientSettingsPage } from '../../page-objects/client/settings.page';

test.describe('Client: Settings', () => {
	test('authenticated client can access settings page', async ({ clientPage }) => {
		const settingsPage = new ClientSettingsPage(clientPage);
		await settingsPage.navigate();

		await expect(settingsPage.heading).toBeVisible({ timeout: 15_000 });
	});

	test('settings page displays settings cards', async ({ clientPage }) => {
		const settingsPage = new ClientSettingsPage(clientPage);
		await settingsPage.navigate();
		await settingsPage.waitForPageReady();

		// Should have settings card links
		const links = clientPage.getByRole('link');
		const count = await links.count();
		expect(count).toBeGreaterThan(0);
	});

	test('unauthenticated user is redirected from settings', async ({ page }) => {
		await page.goto('/client/settings');

		await page.waitForURL(/\/auth\/signin/, { timeout: 15_000 });
	});
});
