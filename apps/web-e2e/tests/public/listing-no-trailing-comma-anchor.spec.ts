import { test, expect } from '@playwright/test';

// Common code-generation bug: hrefs like "/foo," (trailing comma) often
// come from JSX-template glitches.

const PROBES = ['/', '/discover/1', '/about'];

test.describe('No anchors with trailing-comma href', () => {
	for (const path of PROBES) {
		test(`${path} no <a href> ending with comma`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const bad = await page.evaluate(() =>
				Array.from(document.querySelectorAll('a[href]'))
					.map((a) => a.getAttribute('href') || '')
					.filter((h) => h.endsWith(','))
			);
			expect(bad, `${path} trailing-comma hrefs: ${bad.join(', ')}`).toEqual([]);
		});
	}
});
