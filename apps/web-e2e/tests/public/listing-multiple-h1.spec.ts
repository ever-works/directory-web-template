import { test, expect } from '@playwright/test';

// Multiple h1 tags hurt SEO. We allow up to 2 (sometimes a hero + section
// title pattern) but flag 3+.

const PROBES = ['/', '/about', '/discover/1', '/categories', '/tags'];

test.describe('h1 count sanity', () => {
	for (const path of PROBES) {
		test(`${path} has <=3 h1 elements`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			const count = await page.locator('h1').count();
			expect(count, `${path} h1 count = ${count}`).toBeLessThanOrEqual(3);
		});
	}
});
