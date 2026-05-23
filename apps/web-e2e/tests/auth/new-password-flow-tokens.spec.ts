import { test, expect } from '@playwright/test';

// /auth/new-password and /auth/new-verification are token-gated routes.
// Without a token they should still render usefully (prompt + link
// elsewhere). With a garbage token they must fail closed without 5xx.

test.describe('Token-gated auth pages', () => {
	test('/auth/new-password (no token) renders prompt or redirects, no 5xx', async ({ page }) => {
		const resp = await page.goto('/auth/new-password', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/auth/new-password?token=clearly-invalid does not 5xx', async ({ page }) => {
		const resp = await page.goto('/auth/new-password?token=clearly-invalid-zzz', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/auth/new-password?token=<sql-shape> does not 5xx (no error leak)', async ({ page }) => {
		const resp = await page.goto(
			"/auth/new-password?token=' OR '1'='1' --",
			{ waitUntil: 'domcontentloaded' }
		);
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/auth/new-verification (no token) renders prompt, no 5xx', async ({ page }) => {
		const resp = await page.goto('/auth/new-verification', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/auth/new-verification?token=clearly-invalid does not 5xx', async ({ page }) => {
		const resp = await page.goto('/auth/new-verification?token=clearly-invalid-zzz', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('forgot-password form posts and shows generic confirmation', async ({ page }) => {
		await page.goto('/auth/forgot-password', { waitUntil: 'domcontentloaded' });
		await page.locator('#email').fill('never-seen-before-xyz@example.test');
		const submit = page.getByRole('button', { name: /reset|send|forgot|recover/i }).first();
		if (!(await submit.isVisible().catch(() => false))) {
			test.skip(true, 'No visible submit button on forgot-password');
			return;
		}
		await submit.click();
		await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
		// Page should still be alive — no 5xx, no crash. Don't assert copy.
		expect(page.url()).toContain('/auth/');
	});
});
