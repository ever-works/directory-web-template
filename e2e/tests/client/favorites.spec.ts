import { test, expect } from '../../fixtures';

test.describe('Client: Favorites', () => {
	test('unauthenticated user sees sign-in prompt on favorites page', async ({ page }) => {
		await page.goto('/favorites');
		await page.waitForLoadState('domcontentloaded');

		// Should show sign-in prompt or redirect
		const signInLink = page.getByRole('link', { name: /sign in/i }).first();
		const signInRedirect = page.url().includes('/auth/signin');

		const hasPrompt = (await signInLink.isVisible().catch(() => false)) || signInRedirect;
		expect(hasPrompt).toBeTruthy();
	});

	test('authenticated client can access favorites page', async ({ clientPage }) => {
		await clientPage.goto('/favorites');

		await expect(clientPage.locator('body')).toBeVisible();
		// Should show either favorites list or empty state
		const heading = clientPage.getByRole('heading').first();
		await expect(heading).toBeVisible();
	});
});
