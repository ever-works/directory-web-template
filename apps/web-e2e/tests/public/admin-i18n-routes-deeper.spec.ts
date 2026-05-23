import { test, expect } from '@playwright/test';

// /<locale>/admin/* sweep — all locales × all admin routes.

const LOCALES = ['en', 'fr', 'es', 'de'];
const ADMIN_PATHS = [
	'/admin',
	'/admin/items',
	'/admin/categories',
	'/admin/tags',
	'/admin/users',
	'/admin/sponsorships',
	'/admin/reports',
	'/admin/settings'
];

test.describe('Admin locale prefix sweep', () => {
	for (const loc of LOCALES) {
		for (const p of ADMIN_PATHS) {
			test(`/${loc}${p} bounces anonymous`, async ({ page }) => {
				const resp = await page.goto(`/${loc}${p}`, { waitUntil: 'domcontentloaded' });
				expect(resp).toBeTruthy();
				expect(resp!.status(), `/${loc}${p}`).toBeLessThan(500);
				await expect(page).toHaveURL(/(auth\/signin|admin\/auth|\/$)/, { timeout: 30_000 });
			});
		}
	}
});
