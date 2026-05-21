import { test, expect } from '../../fixtures';
import { ClientSettingsPage } from '../../page-objects/client/settings.page';

test.describe('Client: Settings', () => {
	test('authenticated client can access settings page', async ({ clientPage }) => {
		const settingsPage = new ClientSettingsPage(clientPage);
		await settingsPage.navigate();

		await expect(settingsPage.heading).toBeVisible();
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
		await page.goto('/client/settings', { waitUntil: 'domcontentloaded' });

		await page.waitForURL(/\/auth\/signin/);
	});

	// Spec 029: the Preferences section embeds the same controls as
	// `SettingsModal` (Layout / Container Width / Pagination Style + demo-only
	// blocks). Always-on blocks must render inline on `/client/settings`.
	test('settings page shows Preferences section with always-on layout controls', async ({ clientPage }) => {
		const settingsPage = new ClientSettingsPage(clientPage);
		await settingsPage.navigate();
		await settingsPage.waitForPageReady();

		// Each block exposes an h3 heading via its own translated label.
		// Match on role + name regex so the assertion is locale-tolerant for
		// English fixtures and stable against unrelated copy changes. The
		// width-toggle block ships with `CONTAINER_WIDTH = "Content Width"`
		// in en.json, so the regex accepts either "container" or "content".
		await expect(clientPage.getByRole('heading', { level: 3, name: /layout/i }).first()).toBeVisible();
		await expect(
			clientPage.getByRole('heading', { level: 3, name: /(container|content) width/i }).first()
		).toBeVisible();
		await expect(clientPage.getByRole('heading', { level: 3, name: /pagination/i }).first()).toBeVisible();
	});
});
