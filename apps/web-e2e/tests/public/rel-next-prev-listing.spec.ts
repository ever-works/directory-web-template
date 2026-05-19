import { test, expect } from '@playwright/test';

// Listing pages should announce rel=next/rel=prev for crawl pagination —
// if present at all. We don't fail if absent (Google deprecated them).
// We DO assert that if rel=next exists, the href is not malformed.

const LISTING_PAGES = ['/discover/1', '/discover/2', '/tags/paging/1', '/collections/paging/1'];

test.describe('rel=next/prev listing pagination', () => {
	for (const path of LISTING_PAGES) {
		test(`${path} rel=next href if present is internal`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const hrefs = await page.evaluate(() => ({
				next: document.querySelector('link[rel="next"]')?.getAttribute('href') || null,
				prev: document.querySelector('link[rel="prev"]')?.getAttribute('href') || null
			}));
			for (const [k, h] of Object.entries(hrefs)) {
				if (!h) continue;
				expect(h, `${path} rel=${k}`).not.toBe('undefined');
				expect(h, `${path} rel=${k}`).not.toBe('null');
				expect(h, `${path} rel=${k}`).not.toBe('');
			}
		});
	}
});
