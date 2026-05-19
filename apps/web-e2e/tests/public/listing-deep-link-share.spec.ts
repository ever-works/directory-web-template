import { test, expect } from '@playwright/test';

// Sharing a filtered URL via copy-paste should produce a working page —
// not a 404 or 5xx. Tests that filter state survives URL bookmarking.

const SHARES = [
	'/discover/1?q=hello',
	'/discover/1?sort=newest',
	'/discover/1?view=grid',
	'/discover/1?category=sample',
	'/discover/1?tag=sample',
	'/discover/1?q=hello&sort=newest&view=grid&category=sample',
	'/discover/2?q=foo',
	'/categories?q=hello',
	'/tags?q=hello',
	'/collections?q=hello'
];

test.describe('Bookmarked filtered URL tolerance', () => {
	for (const path of SHARES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
