import { test, expect } from '@playwright/test';

// When all filter query-string keys are present and EMPTY, the listing
// should still render (no NaN comparisons crashing the server).

const EMPTY_FILTER_PROBES = [
	'/discover/1?q=&category=&tag=&sort=&view=',
	'/discover/1?q=%20&category=%20&tag=%20',
	'/categories?q=&sort=',
	'/tags?q=&sort='
];

test.describe('Empty filter values tolerance', () => {
	for (const path of EMPTY_FILTER_PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
