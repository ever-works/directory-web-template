import { test, expect } from '@playwright/test';

// Categories detail routes:
//   /categories/[category]
//   /categories/category/[...categorie]   (nested catch-all)
// Unknown slugs may 404 — never 5xx. Catch-all should tolerate empty segments
// and very-deep paths.

const CATEGORY_PROBES = [
	'/categories/sample',
	'/categories/does-not-exist-xyz',
	'/categories/category/a',
	'/categories/category/a/b',
	'/categories/category/a/b/c/d',
	'/categories/' + 'a'.repeat(256)
];

test.describe('Category detail routes tolerance', () => {
	for (const path of CATEGORY_PROBES) {
		test(`${path} does not 5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}
});
