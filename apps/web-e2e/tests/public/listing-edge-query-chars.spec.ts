import { test, expect } from '@playwright/test';

// Edge-shape query strings on /discover should never 5xx — the listing should
// either render the unfiltered default or return a 4xx, but never crash.

const LISTING_PATH = '/discover';

const EDGE_QUERIES = [
	{ name: 'lone question mark', qs: '?' },
	{ name: 'double question mark', qs: '??' },
	{ name: 'question and ampersand', qs: '?&' },
	{ name: 'multiple leading ampersands', qs: '?&&&q=foo' },
	{ name: 'empty q value', qs: '?q=' },
	{ name: 'q value of single space (encoded)', qs: '?q=%20' },
	{ name: 'q value of plus only', qs: '?q=+' },
	{ name: 'q value of equals sign', qs: '?q==' },
	{ name: 'repeated q parameter', qs: '?q=foo&q=bar&q=baz' },
];

test.describe('Public listing: edge query character tolerance', () => {
	for (const { name, qs } of EDGE_QUERIES) {
		test(`discover tolerates ${name}`, async ({ page }) => {
			const response = await page.goto(`${LISTING_PATH}${qs}`, { waitUntil: 'domcontentloaded' });
			expect(response, qs).not.toBeNull();
			expect(response!.status(), `status for ${qs}`).toBeLessThan(500);
			await expect(page.locator('body')).toBeVisible();
		});
	}
});
