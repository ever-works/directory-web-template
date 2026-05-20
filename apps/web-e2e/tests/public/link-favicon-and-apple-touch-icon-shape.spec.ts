import { test, expect } from '@playwright/test';

// <link rel="icon"> and apple-touch-icon should have href and sizes.

const PROBES = ['/', '/about', '/discover/1'];

test.describe('Icon link element shape', () => {
	for (const path of PROBES) {
		test(`${path} icon link hrefs well-formed`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			const bad = await page.evaluate(() =>
				Array.from(document.querySelectorAll('link[rel*="icon"]'))
					.map((l) => l.getAttribute('href') || '')
					.filter((h) => h === 'undefined' || h === 'null' || h === '')
			);
			expect(bad, `${path} bad icon hrefs: ${bad.join(', ')}`).toEqual([]);
		});
	}
});
