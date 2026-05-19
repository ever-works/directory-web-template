import { test, expect } from '@playwright/test';

// /<locale>/admin/* should behave the same as /admin/*: anonymous bounces
// to /admin/auth/signin (NextAuth pages.signIn).

const LOCALES = ['en', 'fr', 'es'];

test.describe('Admin under locale prefix bounces anonymous', () => {
	for (const loc of LOCALES) {
		test(`/${loc}/admin gates anonymous`, async ({ page }) => {
			const resp = await page.goto(`/${loc}/admin`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			expect(page.url()).toMatch(/(auth\/signin|admin\/auth|\/$)/);
		});

		test(`/${loc}/admin/items gates anonymous`, async ({ page }) => {
			const resp = await page.goto(`/${loc}/admin/items`, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			expect(page.url()).toMatch(/(auth\/signin|admin\/auth|\/$)/);
		});
	}
});
