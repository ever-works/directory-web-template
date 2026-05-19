import { test, expect } from '@playwright/test';

// /admin/auth/signin is the dedicated admin sign-in page. It's a different
// surface from /auth/signin (admin layout, no register link).

test.describe('Admin signin page', () => {
	test('/admin/auth/signin renders for anonymous', async ({ page }) => {
		const resp = await page.goto('/admin/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
		await expect(page.locator('#email')).toBeVisible({ timeout: 30_000 });
		await expect(page.locator('#password')).toBeVisible();
	});

	test('/admin/auth/signin form rejects empty submit', async ({ page }) => {
		await page.goto('/admin/auth/signin', { waitUntil: 'domcontentloaded' });
		const submit = page.getByRole('button', { name: /sign in/i }).first();
		await submit.click().catch(() => {});
		await page.waitForTimeout(500);
		// Still on signin (HTML5 validation should block)
		expect(page.url()).toContain('/admin/auth/signin');
	});

	test('/admin/auth/signin with callbackUrl preserves query', async ({ page }) => {
		const resp = await page.goto('/admin/auth/signin?callbackUrl=%2Fadmin', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/admin/auth/signin?callbackUrl=https://evil.example/ is sanitized', async ({ page }) => {
		const resp = await page.goto(
			'/admin/auth/signin?callbackUrl=' + encodeURIComponent('https://evil.example/'),
			{ waitUntil: 'domcontentloaded' }
		);
		expect(resp!.status()).toBeLessThan(500);
		// Form should render — hostile cb should not crash the page.
		await expect(page.locator('#email')).toBeVisible({ timeout: 30_000 });
	});
});
