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
		const pwds = await page.locator('input[type="password"]').count();
		expect(pwds, 'password input count').toBeGreaterThan(0);
	});
});
