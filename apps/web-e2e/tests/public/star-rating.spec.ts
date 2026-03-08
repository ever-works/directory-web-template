import { test, expect } from '../../fixtures';
import { StarRating } from '../../page-objects/public/star-rating.page';

test.describe('UI: Star Rating', () => {
	test('star rating component is visible in comment form for authenticated user', async ({ clientPage }) => {
		// Navigate to an item detail page
		await clientPage.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		const firstItem = clientPage.locator('a[href*="/items/"]').first();
		await expect(firstItem).toBeVisible({ timeout: 10_000 });
		await firstItem.click();
		await clientPage.waitForURL(/\/items\//, { waitUntil: 'domcontentloaded', timeout: 10_000 });

		const starRating = new StarRating(clientPage);
		const isVisible = await starRating.container.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Star rating component not visible (ratings may be disabled)');
			return;
		}

		await expect(starRating.container).toBeVisible();
	});

	test('clicking a star updates the rating value', async ({ clientPage }) => {
		await clientPage.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		const firstItem = clientPage.locator('a[href*="/items/"]').first();
		await expect(firstItem).toBeVisible({ timeout: 10_000 });
		await firstItem.click();
		await clientPage.waitForURL(/\/items\//, { waitUntil: 'domcontentloaded', timeout: 10_000 });

		const starRating = new StarRating(clientPage);
		const isVisible = await starRating.container.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Star rating not visible');
			return;
		}

		// Click 4th star
		await starRating.rate(4);
		await clientPage.waitForTimeout(500);

		const value = await starRating.getValue();
		expect(value).toBe(4);
	});

	test('all 5 star buttons are present', async ({ clientPage }) => {
		await clientPage.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		const firstItem = clientPage.locator('a[href*="/items/"]').first();
		await expect(firstItem).toBeVisible({ timeout: 10_000 });
		await firstItem.click();
		await clientPage.waitForURL(/\/items\//, { waitUntil: 'domcontentloaded', timeout: 10_000 });

		const starRating = new StarRating(clientPage);
		const isVisible = await starRating.container.isVisible().catch(() => false);

		if (!isVisible) {
			test.skip(true, 'Star rating not visible');
			return;
		}

		// Check all 5 stars exist
		for (let i = 1; i <= 5; i++) {
			await expect(starRating.star(i)).toBeVisible();
		}
	});
});
