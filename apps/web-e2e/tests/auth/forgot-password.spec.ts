import { test, expect } from '@playwright/test';

test.describe('Auth: Forgot Password', () => {
	test('forgot password page renders with email input', async ({ page }) => {
		const response = await page.goto('/auth/forgot-password', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBeLessThan(400);

		const emailInput = page.locator('#email');
		await expect(emailInput).toBeVisible();
		await expect(emailInput).toHaveAttribute('type', 'email');
	});

	test('forgot password page shows submit button', async ({ page }) => {
		await page.goto('/auth/forgot-password', { waitUntil: 'domcontentloaded' });

		const submitButton = page.getByRole('button').filter({ hasText: /send|reset|recover/i }).first();
		await expect(submitButton).toBeVisible();
	});

	test('forgot password page links back to sign in', async ({ page }) => {
		await page.goto('/auth/forgot-password', { waitUntil: 'domcontentloaded' });

		const backLink = page.locator('a[href*="/auth/signin"]').first();
		await expect(backLink).toBeVisible();
	});

	test('submitting an empty email keeps the form on screen', async ({ page }) => {
		await page.goto('/auth/forgot-password', { waitUntil: 'domcontentloaded' });

		const emailInput = page.locator('#email');
		const submitButton = page.getByRole('button').filter({ hasText: /send|reset|recover/i }).first();

		await submitButton.click();

		// Form should still be visible (HTML5 validation prevents submission)
		await expect(emailInput).toBeVisible();
	});
});
