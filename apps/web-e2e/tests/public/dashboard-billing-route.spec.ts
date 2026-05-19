import { test, expect } from '@playwright/test';
import { CLIENT_STATE_FILE, ADMIN_STATE_FILE } from '../../helpers/test-data';

// The legacy /dashboard/billing surface (separate from /client/settings/profile/billing).
// Gate behaviour + anonymous bounce + non-5xx on auth'd load.

test.describe('/dashboard/billing access', () => {
	test('anonymous → bounce to signin', async ({ browser }) => {
		const ctx = await browser.newContext();
		const page = await ctx.newPage();
		const resp = await page.goto('/dashboard/billing', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
		// Dashboard gate is client-side; poll until the redirect lands.
		await expect(page).toHaveURL(/auth\/signin/, { timeout: 30_000 });
		await ctx.close();
	});

	test.describe('authenticated client', () => {
		test.use({ storageState: CLIENT_STATE_FILE });
		test('client loads /dashboard/billing', async ({ page }) => {
			const resp = await page.goto('/dashboard/billing', { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			expect(page.url()).not.toMatch(/auth\/signin/);
		});
	});

	test.describe('authenticated admin', () => {
		test.use({ storageState: ADMIN_STATE_FILE });
		test('admin can also load /dashboard/billing', async ({ page }) => {
			const resp = await page.goto('/dashboard/billing', { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
		});
	});
});
