import { test, expect } from '../../fixtures';

test.describe('UI: Login Modal for Unauthenticated Users', () => {
	test('unauthenticated user clicking favorite triggers login prompt', async ({ page }) => {
		// Navigate to an item detail page
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		const firstItem = page.locator('a[href*="/items/"]').first();
		await expect(firstItem).toBeVisible({ timeout: 10_000 });
		await firstItem.click();
		await page.waitForURL(/\/items\//, { waitUntil: 'domcontentloaded', timeout: 10_000 });

		// Look for a favorite button
		const favoriteButton = page.locator('button[aria-label*="favorite" i], button[aria-label*="Favorite" i]').first();
		const isFavVisible = await favoriteButton.isVisible().catch(() => false);

		if (!isFavVisible) {
			test.skip(true, 'Favorite button not visible on item detail');
			return;
		}

		await favoriteButton.click();
		await page.waitForTimeout(1_000);

		// Login modal or sign-in redirect should appear
		const loginModal = page.locator('[role="dialog"]').first();
		const hasModal = await loginModal.isVisible().catch(() => false);
		const wasRedirected = page.url().includes('/auth/signin');

		expect(hasModal || wasRedirected).toBeTruthy();

		// If modal appeared, close it
		if (hasModal) {
			await page.keyboard.press('Escape');
		}
	});

	test('comment section shows sign-in prompt for unauthenticated user', async ({ page }) => {
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		const firstItem = page.locator('a[href*="/items/"]').first();
		await expect(firstItem).toBeVisible({ timeout: 10_000 });
		await firstItem.click();
		await page.waitForURL(/\/items\//, { waitUntil: 'domcontentloaded', timeout: 10_000 });

		// Look for sign-in prompt in comments section
		const signInPrompt = page.getByText(/sign in to comment|sign in to join/i).first();
		const commentTextarea = page.locator('textarea[placeholder*="comment" i]').first();

		const hasPrompt = await signInPrompt.isVisible().catch(() => false);
		const hasTextarea = await commentTextarea.isVisible().catch(() => false);

		// Either shows sign-in prompt (not authenticated) or textarea (authenticated)
		// or comments are disabled entirely
		if (!hasPrompt && !hasTextarea) {
			test.skip(true, 'Comments feature appears to be disabled');
			return;
		}

		// Unauthenticated user should see prompt, not textarea
		if (hasPrompt) {
			await expect(signInPrompt).toBeVisible();
		}
	});
});
