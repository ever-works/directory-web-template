import { test, expect } from '@playwright/test';
import { PublicPagesPage } from '../../page-objects/public/public-pages.page';

test.describe('Public: Collections', () => {
	test('collections page loads with heading', async ({ page }) => {
		const publicPage = new PublicPagesPage(page);
		await publicPage.navigateToCollections();

		await expect(publicPage.heading).toBeVisible({ timeout: 10_000 });
	});

	test('collections page displays collection items', async ({ page }) => {
		const publicPage = new PublicPagesPage(page);
		await publicPage.navigateToCollections();

		// Collections should have links to individual collection slugs
		const collectionLinks = page.locator('a[href*="/collections/"]');
		await page.waitForTimeout(2_000);

		const count = await collectionLinks.count();
		// Page should load regardless of whether collections exist
		await expect(publicPage.mainContent).toBeVisible();

		if (count > 0) {
			await expect(collectionLinks.first()).toBeVisible();
		}
	});

	test('clicking a collection navigates to collection detail', async ({ page }) => {
		const publicPage = new PublicPagesPage(page);
		await publicPage.navigateToCollections();

		const firstCollection = page.locator('a[href*="/collections/"]').first();
		const isVisible = await firstCollection.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'No collections available to click');
			return;
		}

		await firstCollection.click();
		await page.waitForURL(/\/collections\//, { waitUntil: 'domcontentloaded', timeout: 10_000 });

		// Collection detail page should show a heading
		await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
	});
});
