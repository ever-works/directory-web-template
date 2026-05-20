import { test, expect } from '@playwright/test';

/**
 * Document <title> should be within a sensible length range. Google
 * truncates SERP titles around 50-60 chars; a title under 10 chars is
 * usually too generic to be useful, and over 100 chars is truncated
 * junk.
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing', '/help'];

const MIN_LEN = 10;
const MAX_LEN = 100;

test.describe('Public HTML: <title> length', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} title is within ${MIN_LEN}-${MAX_LEN} chars`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const title = (await page.title()).trim();
			if (title.length === 0) return; // covered by head-meta-essentials
			expect(title.length, `title length on ${path}`).toBeGreaterThanOrEqual(MIN_LEN);
			expect(title.length, `title length on ${path}`).toBeLessThanOrEqual(MAX_LEN);
		});
	}
});
