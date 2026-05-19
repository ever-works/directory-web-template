import { test, expect } from '@playwright/test';

const SORTS = [
	'newest',
	'oldest',
	'popular',
	'trending',
	'alphabetical',
	'recommended',
	'random',
	'rating',
	'updated'
];

test.describe('Listing sort options tolerance', () => {
	for (const s of SORTS) {
		test(`/discover/1?sort=${s} non-5xx`, async ({ page }) => {
			const resp = await page.goto('/discover/1?sort=' + s, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `sort=${s}`).toBeLessThan(500);
		});
	}
});
