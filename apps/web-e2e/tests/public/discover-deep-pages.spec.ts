import { test, expect } from '@playwright/test';

// /discover/[page] dynamic pagination. Edge cases:
// - page 1 always exists
// - page 9999 overshoots and may 404 — must not 5xx
// - non-numeric page param
// - mixed filter combos

const DEEP_PROBES = [
	'/discover/1',
	'/discover/2',
	'/discover/9999',
	'/discover/0',
	'/discover/-1',
	'/discover/abc',
	'/discover/1?category=sample',
	'/discover/1?tag=sample',
	'/discover/1?q=hello&page=1',
	'/discover/1?sort=newest',
	'/discover/1?view=grid',
	'/discover/1?view=list',
	'/discover/1?view=map'
];

test.describe('Discover deep page tolerance', () => {
	for (const path of DEEP_PROBES) {
		test(`${path} does not 5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}
});
