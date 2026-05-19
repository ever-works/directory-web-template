import { test, expect } from '@playwright/test';

// /collections/[slug] detail page. Unknown slugs are 404; never 5xx.

const PROBES = [
	'/collections/sample',
	'/collections/does-not-exist-zzz',
	'/collections/' + encodeURIComponent('<weird>'),
	'/collections/' + 'a'.repeat(256),
	'/collections/with.dots'
];

test.describe('Collection detail tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
