import { test, expect } from '@playwright/test';

// Every <img> on every key page must have an alt attribute (alt="" is OK
// for decorative). Missing alt is an a11y failure.

const PROBES = ['/', '/about', '/discover/1', '/categories', '/tags', '/pricing'];

test.describe('Images have alt attribute', () => {
	for (const path of PROBES) {
		test(`${path} every <img> has alt attribute`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const missing = await page.evaluate(() =>
				Array.from(document.querySelectorAll('img'))
					.filter((img) => img.getAttribute('alt') === null)
					.map((img) => img.getAttribute('src') || '?')
			);
			expect(missing, `${path} <img> missing alt: ${missing.join(', ')}`).toEqual([]);
		});
	}
});
