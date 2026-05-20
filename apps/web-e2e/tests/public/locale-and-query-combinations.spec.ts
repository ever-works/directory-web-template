import { test, expect } from '@playwright/test';

// Mixed locale-prefix + query-string requests against listing-style routes.
// The combination of locale routing middleware and search params has been a
// hot spot for regressions in the past, so this widens coverage.

const LOCALES = ['de', 'fr', 'es', 'it', 'pt'];

const COMBOS: Array<{ path: string; qs: string }> = [
	{ path: '/discover', qs: '?q=test&page=2' },
	{ path: '/categories', qs: '?page=2' },
	{ path: '/tags', qs: '?sort=newest' },
	{ path: '/collections', qs: '?view=grid' },
];

test.describe('Public listing: locale + query combinations', () => {
	for (const locale of LOCALES) {
		for (const { path, qs } of COMBOS) {
			const full = `/${locale}${path}${qs}`;
			test(`${full} renders without 5xx`, async ({ page }) => {
				const response = await page.goto(full, { waitUntil: 'domcontentloaded' });
				expect(response, full).not.toBeNull();
				expect(response!.status(), `status for ${full}`).toBeLessThan(500);
				await expect(page.locator('body')).toBeVisible();
			});
		}
	}
});
