import { test, expect } from '@playwright/test';

// view=grid | list | map should each return non-5xx on listing pages.

const VIEWS = ['grid', 'list', 'map', 'compact'];

test.describe('Listing view toggle tolerance', () => {
	for (const v of VIEWS) {
		test(`/discover/1?view=${v} non-5xx`, async ({ page }) => {
			const resp = await page.goto('/discover/1?view=' + v, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `view=${v}`).toBeLessThan(500);
		});

		test(`/categories?view=${v} non-5xx`, async ({ page }) => {
			const resp = await page.goto('/categories?view=' + v, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `view=${v}`).toBeLessThan(500);
		});
	}
});
