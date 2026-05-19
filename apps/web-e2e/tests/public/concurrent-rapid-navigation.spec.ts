import { test, expect } from '@playwright/test';

// Rapid in-app navigations should not 5xx, leave the URL borked, or hang.

test.describe('Rapid in-app navigation', () => {
	test('navigate /, /about, /discover/1, /categories in quick succession', async ({ page }) => {
		test.setTimeout(60_000);
		const routes = ['/', '/about', '/discover/1', '/categories', '/tags', '/', '/about'];
		for (const r of routes) {
			const resp = await page.goto(r, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), r).toBeLessThan(500);
		}
	});

	test('reload x5 same page is stable', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		for (let i = 0; i < 5; i++) {
			const resp = await page.reload({ waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
		}
	});
});
