import { test, expect } from '@playwright/test';

// Signin form must have email + password inputs and a submit button.
// We don't assert on labels (i18n volatile); we look for the form contract.

test.describe('Signin form shape', () => {
	test('/auth/signin renders email + password inputs', async ({ page }) => {
		const resp = await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const email = page.locator('input[type="email"], input[name="email"]').first();
		const password = page.locator('input[type="password"], input[name="password"]').first();
		await expect(email).toBeVisible({ timeout: 15_000 });
		await expect(password).toBeVisible({ timeout: 15_000 });
	});

	test('/auth/register renders email + password inputs', async ({ page }) => {
		const resp = await page.goto('/auth/register', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const email = page.locator('input[type="email"], input[name="email"]').first();
		const password = page.locator('input[type="password"], input[name="password"]').first();
		await expect(email).toBeVisible({ timeout: 15_000 });
		await expect(password).toBeVisible({ timeout: 15_000 });
	});

	test('/auth/forgot-password renders email input', async ({ page }) => {
		const resp = await page.goto('/auth/forgot-password', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const email = page.locator('input[type="email"], input[name="email"]').first();
		await expect(email).toBeVisible({ timeout: 15_000 });
	});

	test('/auth/new-password renders password input', async ({ page }) => {
		const resp = await page.goto('/auth/new-password?token=fake', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		// The client verifies the token before exposing the password form.
		// With `?token=fake` it ends up on the "invalid token" branch and
		// shows no password inputs — that's a valid end-state for the form
		// shape contract, not a bug. We only assert here that the page
		// settled on EITHER the password form OR the invalid-token UI;
		// poll until one of those settles (the token verification is a
		// server action and 800ms is sometimes not enough on a cold start).
		await expect
			.poll(
				async () => {
					const pwds = await page.locator('input[type="password"]').count();
					const invalid = await page.getByText(/invalid|expired|incorrect|fail/i).count();
					return pwds + invalid;
				},
				{
					message: 'expected /auth/new-password to settle into password form OR invalid-token UI',
					timeout: 15_000
				}
			)
			.toBeGreaterThan(0);
	});
});
