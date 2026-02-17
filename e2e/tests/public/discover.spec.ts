import { test, expect } from '@playwright/test';
import { DiscoverPage } from '../../page-objects/public/discover.page';

test.describe('Public: Discover / Directory Listing', () => {
	test('displays directory items on page 1', async ({ page }) => {
		const discoverPage = new DiscoverPage(page);
		await discoverPage.navigate(1);
		await discoverPage.waitForPageReady();

		const itemCount = await discoverPage.getItemCount();
		expect(itemCount).toBeGreaterThan(0);
	});

	test('clicking an item navigates to item detail', async ({ page }) => {
		const discoverPage = new DiscoverPage(page);
		await discoverPage.navigate(1);
		await discoverPage.waitForPageReady();

		await expect(discoverPage.itemLinks.first()).toBeVisible();
		await discoverPage.clickFirstItem();

		await expect(page).toHaveURL(/\/items\//);
	});

	test('pagination controls are visible when items exist', async ({ page }) => {
		const discoverPage = new DiscoverPage(page);
		await discoverPage.navigate(1);
		await discoverPage.waitForPageReady();

		const itemCount = await discoverPage.getItemCount();
		test.skip(itemCount === 0, 'No items available to test pagination');

		const page2Link = page.locator('a[href*="/discover/2"]');
		await expect(page2Link).toBeVisible();
		await page2Link.click();
		await expect(page).toHaveURL(/\/discover\/2/);
	});
});
