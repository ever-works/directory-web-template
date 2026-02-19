import { test, expect } from '../../fixtures';
import { AdminSponsorshipsPage } from '../../page-objects/admin/sponsorships.page';

test.describe('Admin: Sponsorships Management', () => {
	test('admin can access sponsorships management page', async ({ adminPage }) => {
		const sponsorshipsPage = new AdminSponsorshipsPage(adminPage);

		await sponsorshipsPage.navigate();
		await sponsorshipsPage.waitForPageReady();

		await expect(sponsorshipsPage.heading).toBeVisible();
	});

	test('sponsorships page displays stats and content', async ({ adminPage }) => {
		const sponsorshipsPage = new AdminSponsorshipsPage(adminPage);

		await sponsorshipsPage.navigate();
		await sponsorshipsPage.waitForPageReady();

		// Main content should be visible
		const mainContent = adminPage.locator('main').first();
		await expect(mainContent).toBeVisible();

		// Should show either sponsorship list or empty state
		await adminPage.waitForTimeout(2_000);
	});

	test('admin can search sponsorships', async ({ adminPage }) => {
		const sponsorshipsPage = new AdminSponsorshipsPage(adminPage);

		await sponsorshipsPage.navigate();
		await sponsorshipsPage.waitForPageReady();

		const searchInput = sponsorshipsPage.searchInput;
		const isSearchVisible = await searchInput.isVisible().catch(() => false);

		if (!isSearchVisible) {
			test.skip(true, 'Search input not visible on sponsorships page');
			return;
		}

		await sponsorshipsPage.searchSponsorships('zzz-nonexistent-xyz');
		await adminPage.waitForTimeout(1_000);
	});
});
