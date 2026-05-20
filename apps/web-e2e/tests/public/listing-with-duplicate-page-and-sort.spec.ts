import { test, expect } from '@playwright/test';

// Listing routes receiving the SAME query key twice (?page=1&page=2,
// ?sort=asc&sort=desc, ?view=grid&view=list) must not 5xx. The framework
// should pick one or canonicalise; either way the page must render.

const LISTING_PATHS = ['/discover', '/categories', '/tags', '/collections'];

const DUPLICATE_QS: Array<{ label: string; qs: string }> = [
	{ label: 'duplicate page', qs: '?page=1&page=2' },
	{ label: 'three-way duplicate page', qs: '?page=1&page=2&page=3' },
	{ label: 'duplicate sort', qs: '?sort=asc&sort=desc' },
	{ label: 'duplicate view', qs: '?view=grid&view=list' },
	{ label: 'duplicate page and sort together', qs: '?page=1&page=2&sort=asc&sort=desc' },
];

test.describe('Public listing: duplicate query parameter tolerance', () => {
	for (const path of LISTING_PATHS) {
		for (const { label, qs } of DUPLICATE_QS) {
			test(`${path}${qs} tolerates ${label}`, async ({ page }) => {
				const url = `${path}${qs}`;
				const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
				expect(response, url).not.toBeNull();
				expect(response!.status(), `status for ${url}`).toBeLessThan(500);
				await expect(page.locator('body')).toBeVisible();
			});
		}
	}
});
