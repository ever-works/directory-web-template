import { test, expect } from '../../fixtures';
import { ItemDetailPage } from '../../page-objects/public/item-detail.page';

test.describe('Client: Favorites Toggle', () => {
	test('authenticated client can add and remove a favorite on item detail', async ({ clientPage }) => {
		const itemDetail = new ItemDetailPage(clientPage);

		// Navigate to the first item from home
		await itemDetail.navigateToFirstItem();
		await expect(itemDetail.heading).toBeVisible({ timeout: 10_000 });

		// Check if favorites feature is enabled (button exists)
		const favoriteButton = itemDetail.favoriteButton;
		const isFavVisible = await favoriteButton.isVisible().catch(() => false);

		if (!isFavVisible) {
			test.skip(true, 'Favorites feature is not enabled');
			return;
		}

		// Get the initial aria-label to determine current state
		const initialLabel = await favoriteButton.getAttribute('aria-label');
		const wasAlreadyFavorited = initialLabel?.includes('Remove');

		// Click to toggle favorite
		await itemDetail.clickFavorite();

		// Wait for the API call to complete
		await clientPage.waitForTimeout(2_000);

		// The aria-label should have toggled
		if (wasAlreadyFavorited) {
			await expect(favoriteButton).toHaveAttribute('aria-label', /add.*favorites/i);
		} else {
			await expect(favoriteButton).toHaveAttribute('aria-label', /remove.*favorites/i);
		}

		// Toggle back to restore original state
		await itemDetail.clickFavorite();
		await clientPage.waitForTimeout(2_000);

		// Should be back to original state
		if (wasAlreadyFavorited) {
			await expect(favoriteButton).toHaveAttribute('aria-label', /remove.*favorites/i);
		} else {
			await expect(favoriteButton).toHaveAttribute('aria-label', /add.*favorites/i);
		}
	});

	test('favorited item appears on favorites page', async ({ clientPage }) => {
		const itemDetail = new ItemDetailPage(clientPage);

		// Navigate to the first item
		await itemDetail.navigateToFirstItem();
		await expect(itemDetail.heading).toBeVisible({ timeout: 10_000 });

		const favoriteButton = itemDetail.favoriteButton;
		const isFavVisible = await favoriteButton.isVisible().catch(() => false);

		if (!isFavVisible) {
			test.skip(true, 'Favorites feature is not enabled');
			return;
		}

		// Get the item name from the heading
		const itemName = await itemDetail.heading.textContent();
		expect(itemName).toBeTruthy();

		// Ensure the item is favorited
		const label = await favoriteButton.getAttribute('aria-label');
		if (label?.includes('Add')) {
			await itemDetail.clickFavorite();
			await clientPage.waitForTimeout(2_000);
		}

		// Navigate to favorites page
		await clientPage.goto('/favorites', { waitUntil: 'domcontentloaded' });

		// The favorited item should appear on the page
		await expect(clientPage.getByText(itemName!.trim()).first()).toBeVisible({ timeout: 10_000 });

		// Clean up: go back to item detail and unfavorite
		await itemDetail.navigateToFirstItem();
		await expect(itemDetail.heading).toBeVisible({ timeout: 10_000 });

		const cleanupLabel = await favoriteButton.getAttribute('aria-label');
		if (cleanupLabel?.includes('Remove')) {
			await itemDetail.clickFavorite();
			await clientPage.waitForTimeout(2_000);
		}
	});
});
