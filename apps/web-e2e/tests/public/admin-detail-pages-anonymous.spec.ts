import { test, expect } from '@playwright/test';

// /admin/clients/[id] is the only id-detail admin page. Anonymous gate.

const ADMIN_DETAIL_PAGES = [
	'/admin/clients/probe-id',
	'/admin/clients/sample',
	'/admin/clients/' + encodeURIComponent('<weird>')
];

test.describe('Admin detail pages anonymous gate', () => {
	for (const path of ADMIN_DETAIL_PAGES) {
		test(`${path} bounces anonymous`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			// Admin gate is client-side; poll until the redirect lands.
			await expect(page).toHaveURL(/(auth\/signin|admin\/auth|\/$)/, { timeout: 30_000 });
		});
	}
});
