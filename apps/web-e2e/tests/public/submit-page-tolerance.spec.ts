import { test, expect } from '@playwright/test';

// /submit lets users submit a new entry. May require auth, may be a
// public-facing form. Either way: never 5xx, and the page renders or
// bounces to signin.

const SUBMIT_PROBES = [
	'/submit',
	'/submit?category=sample',
	'/submit?ref=external',
	'/submit?step=1',
	'/submit?step=99'
];

test.describe('Submit route tolerance', () => {
	for (const path of SUBMIT_PROBES) {
		test(`${path} does not 5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}
});
