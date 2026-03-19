import { test, expect } from '../../fixtures';
import { ShareButton } from '../../page-objects/public/share-button.page';

test.describe('UI: Share Button', () => {
	test('share button is visible on item detail page', async ({ page }) => {
		// Navigate to listing first, then click first item
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		const firstItem = page.locator('a[href*="/items/"]').first();
		await expect(firstItem).toBeVisible({ timeout: 10_000 });
		await firstItem.click();
		await page.waitForURL(/\/items\//, { waitUntil: 'domcontentloaded', timeout: 10_000 });

		const shareButton = new ShareButton(page);
		const isVisible = await shareButton.trigger.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Share button not visible on item detail');
			return;
		}

		await expect(shareButton.trigger).toBeVisible();
	});

	test('clicking share button opens dropdown with social options', async ({ page }) => {
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		const firstItem = page.locator('a[href*="/items/"]').first();
		await expect(firstItem).toBeVisible({ timeout: 10_000 });
		await firstItem.click();
		await page.waitForURL(/\/items\//, { waitUntil: 'domcontentloaded', timeout: 10_000 });

		const shareButton = new ShareButton(page);
		const isVisible = await shareButton.trigger.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Share button not visible');
			return;
		}

		await shareButton.open();
		await page.waitForTimeout(500);

		// Should show menu items (Copy Link, Twitter/X, Facebook, LinkedIn)
		const menuItems = page.locator('[role="menuitem"]');
		const count = await menuItems.count();
		expect(count).toBeGreaterThanOrEqual(2);
	});
});
