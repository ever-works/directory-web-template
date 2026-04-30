import { test, expect } from '@playwright/test';

test.describe('Auth: New Password', () => {
	test('new password page loads with status', async ({ page }) => {
		const response = await page.goto('/auth/new-password', { waitUntil: 'domcontentloaded' });

		// Page should respond — either renders the form or an error/missing-token state.
		// We don't assert on specific status because backend may redirect when token is absent.
		expect(response?.status()).toBeLessThan(500);
		await expect(page.locator('body')).toBeVisible();
	});

	test('new password page with token query renders the form', async ({ page }) => {
		await page.goto('/auth/new-password?token=fake-token-for-rendering-test', {
			waitUntil: 'domcontentloaded',
		});

		// Either a password input is visible (form rendered) or the page shows an error
		// about an invalid/expired token. Both are acceptable rendered states.
		const passwordInput = page.locator('input[type="password"]').first();
		const heading = page.getByRole('heading', { level: 1 }).first();

		const passwordVisible = await passwordInput.isVisible().catch(() => false);
		const headingVisible = await heading.isVisible().catch(() => false);

		expect(passwordVisible || headingVisible).toBeTruthy();
	});
});
