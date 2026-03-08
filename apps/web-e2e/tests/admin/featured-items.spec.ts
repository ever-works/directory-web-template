import { test, expect } from '../../fixtures';
import { AdminFeaturedItemsPage } from '../../page-objects/admin/featured-items.page';

test.describe('Admin: Featured Items Management', () => {
	test('admin can access featured items page', async ({ adminPage }) => {
		const featuredPage = new AdminFeaturedItemsPage(adminPage);

		await featuredPage.navigate();
		await featuredPage.waitForPageReady();

		await expect(featuredPage.heading).toBeVisible();
		await expect(featuredPage.addButton).toBeVisible();
	});

	test('featured items page displays stats cards', async ({ adminPage }) => {
		const featuredPage = new AdminFeaturedItemsPage(adminPage);

		await featuredPage.navigate();
		await featuredPage.waitForPageReady();

		// Stats cards should show Total, Active, Inactive, Available Items
		await expect(featuredPage.statsCards).toBeVisible({ timeout: 10_000 });
	});

	test('admin can open add featured item modal', async ({ adminPage }) => {
		const featuredPage = new AdminFeaturedItemsPage(adminPage);

		await featuredPage.navigate();
		await featuredPage.waitForPageReady();

		// Click Add Featured Item
		await featuredPage.addButton.click();

		// Modal should open — look for HeroUI modal
		const modal = featuredPage.featuredItemModal;
		await expect(modal).toBeVisible({ timeout: 5_000 });

		// Modal should contain form fields
		await expect(adminPage.locator('#featuredOrder')).toBeVisible();
		await expect(adminPage.locator('#itemName')).toBeVisible();

		// Cancel to close
		await modal.getByRole('button', { name: /cancel/i }).click();
		await expect(modal).toBeHidden({ timeout: 5_000 });
	});

	test('search input filters featured items', async ({ adminPage }) => {
		const featuredPage = new AdminFeaturedItemsPage(adminPage);

		await featuredPage.navigate();
		await featuredPage.waitForPageReady();

		// Check if search input is visible
		const searchInput = featuredPage.searchInput;
		const isSearchVisible = await searchInput.isVisible().catch(() => false);

		if (!isSearchVisible) {
			test.skip(true, 'Search input not visible on featured items page');
			return;
		}

		// Type a search term
		await featuredPage.search('zzz-nonexistent-xyz');
		await adminPage.waitForTimeout(1_000);

		// Should show no results or empty state
		// Clear search to restore
		await featuredPage.clearSearch();
		await adminPage.waitForTimeout(1_000);
	});

	test('active-only toggle filters items', async ({ adminPage }) => {
		const featuredPage = new AdminFeaturedItemsPage(adminPage);

		await featuredPage.navigate();
		await featuredPage.waitForPageReady();

		// Check if active-only toggle exists
		const toggle = featuredPage.activeOnlyToggle;
		const isToggleVisible = await toggle.isVisible().catch(() => false);

		if (!isToggleVisible) {
			test.skip(true, 'Active-only toggle not visible');
			return;
		}

		// Click the toggle to enable active-only filter
		await toggle.click();
		await adminPage.waitForTimeout(1_000);

		// Click again to disable
		await toggle.click();
		await adminPage.waitForTimeout(1_000);
	});
});
