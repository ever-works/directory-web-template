import { test, expect } from '@playwright/test';

// /sponsor is the public sponsor landing. May redirect to /sponsor/checkout
// behind auth. Either way: non-5xx, page loads.

const SPONSOR_PROBES = [
	'/sponsor',
	'/sponsor?plan=basic',
	'/sponsor?plan=pro',
	'/sponsor?plan=' + encodeURIComponent('does-not-exist'),
	'/sponsor?ref=invite',
	'/sponsor?coupon=ABC123',
	'/sponsor?coupon=' + 'a'.repeat(500)
];

test.describe('Sponsor public route tolerance', () => {
	for (const path of SPONSOR_PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
