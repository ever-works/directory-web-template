import { test, expect } from '@playwright/test';

// /surveys/[slug] detail page tolerance.

const PROBES = [
	'/surveys/sample',
	'/surveys/does-not-exist-zzz',
	'/surveys/' + encodeURIComponent('<weird>'),
	'/surveys/' + 'a'.repeat(256)
];

test.describe('Survey detail tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
