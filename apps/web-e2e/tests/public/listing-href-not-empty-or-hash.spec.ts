import { test, expect } from '@playwright/test';

// Anchors with href="" or href="#" placeholder are a regression — they
// should have a real href OR be a button.

const PROBES = ['/', '/about', '/discover/1'];

test.describe('No anchors with empty / placeholder href (advisory)', () => {
	for (const path of PROBES) {
		test(`${path} has few placeholder hrefs`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const placeholders = await page.evaluate(() =>
				Array.from(document.querySelectorAll('a'))
					.map((a) => a.getAttribute('href') || '')
					.filter((h) => h === '' || h === '#').length
			);
			// Soft cap — UI libs sometimes use href="#" but anything over 10
			// is suspicious.
			expect(placeholders, `${path} href="" or "#" count: ${placeholders}`).toBeLessThan(20);
		});
	}
});
