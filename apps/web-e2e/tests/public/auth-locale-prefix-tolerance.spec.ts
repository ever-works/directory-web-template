import { test, expect } from '@playwright/test';

// Auth pages under /<locale>/auth/* — all locales × all auth paths.

const LOCALES = ['en', 'fr', 'es', 'de', 'ar', 'zh'];
const PATHS = ['/auth/signin', '/auth/register', '/auth/forgot-password'];

test.describe('Auth pages locale prefix tolerance', () => {
	for (const loc of LOCALES) {
		for (const p of PATHS) {
			test(`/${loc}${p} non-5xx`, async ({ page }) => {
				const resp = await page.goto(`/${loc}${p}`, { waitUntil: 'domcontentloaded' });
				expect(resp).toBeTruthy();
				expect(resp!.status(), `/${loc}${p}`).toBeLessThan(500);
			});
		}
	}
});
