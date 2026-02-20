import { test, expect } from '../../fixtures';
import { AdminItemsPage } from '../../page-objects/admin/items.page';

test.describe('Admin: Item Search & Filter', () => {
	test('search bar filters items by name', async ({ adminPage }) => {
		const itemsPage = new AdminItemsPage(adminPage);

		await itemsPage.navigate();
		await itemsPage.waitForPageReady();

		// Wait for items to load
		await expect(itemsPage.heading).toBeVisible();

		// Get the first item's name to use as search term
		const firstItemHeading = adminPage.locator('h4').first();
		await expect(firstItemHeading).toBeVisible({ timeout: 10_000 });
		const itemName = await firstItemHeading.textContent();
		expect(itemName).toBeTruthy();

		// Use part of the name as search (at least 2 chars to trigger debounce)
		const searchTerm = itemName!.trim().slice(0, 10);

		await itemsPage.searchItems(searchTerm);

		// Wait for debounce (300ms) + API response
		await adminPage.waitForTimeout(1_000);

		// The searched item should still be visible
		await expect(adminPage.getByText(itemName!.trim()).first()).toBeVisible();
	});

	test('search bar shows empty state for non-matching term', async ({ adminPage }) => {
		const itemsPage = new AdminItemsPage(adminPage);

		await itemsPage.navigate();
		await itemsPage.waitForPageReady();

		// Search for a term that won't match any items
		await itemsPage.searchItems('zzz-nonexistent-item-xyz-999');

		// Wait for debounce + API response
		await adminPage.waitForTimeout(1_000);

		// Should show empty state or "no items found" message
		await expect(
			adminPage.getByText(/no items found|no items match|no results/i).first()
		).toBeVisible({ timeout: 10_000 });
	});

	test('status tabs filter items by status', async ({ adminPage }) => {
		const itemsPage = new AdminItemsPage(adminPage);

		await itemsPage.navigate();
		await itemsPage.waitForPageReady();
		await expect(itemsPage.heading).toBeVisible();

		// Click "Approved" tab
		await itemsPage.selectStatusTab('Approved');
		await adminPage.waitForTimeout(1_000);

		// All visible items should show "Approved" status badge
		const statusBadges = adminPage.locator('span').filter({ hasText: /^Approved$/ });
		const approvedCount = await statusBadges.count();

		// Either items are shown with approved status, or empty state
		if (approvedCount > 0) {
			// Every item row should contain an "Approved" badge
			const itemHeadings = adminPage.locator('h4');
			const itemCount = await itemHeadings.count();
			expect(approvedCount).toBe(itemCount);
		}

		// Switch to "All" tab — should show all items again
		await itemsPage.selectStatusTab('All');
		await adminPage.waitForTimeout(1_000);

		const allItems = adminPage.locator('h4');
		const allCount = await allItems.count();
		expect(allCount).toBeGreaterThanOrEqual(approvedCount);
	});

	test('clearing search restores full item list', async ({ adminPage }) => {
		const itemsPage = new AdminItemsPage(adminPage);

		await itemsPage.navigate();
		await itemsPage.waitForPageReady();

		// Count initial items
		const initialItems = adminPage.locator('h4');
		await expect(initialItems.first()).toBeVisible({ timeout: 10_000 });
		const initialCount = await initialItems.count();

		// Search for non-existent item
		await itemsPage.searchItems('zzz-nonexistent-xyz');
		await adminPage.waitForTimeout(1_000);

		// Clear search
		await itemsPage.clearSearch();
		await adminPage.waitForTimeout(1_000);

		// Items should reappear with the same count or higher count as before search
		const restoredItems = adminPage.locator('h4');
		await expect(restoredItems.first()).toBeVisible({ timeout: 10_000 });
		const restoredCount = await restoredItems.count();
		expect(restoredCount).toBeGreaterThanOrEqual(initialCount);
	});
});
