import { test, expect } from '@playwright/test';

// /sponsor/* flow — multi-step checkout with provider parameters.

const PROBES = [
	'/sponsor',
	'/sponsor?step=1',
	'/sponsor?step=2',
	'/sponsor?provider=stripe',
	'/sponsor?provider=polar',
	'/sponsor?provider=lemonsqueezy',
	'/sponsor?provider=solidgate',
	'/sponsor?plan=basic&provider=stripe',
	'/sponsor?coupon=ABC&plan=pro&provider=stripe'
];

test.describe('Sponsor prefix flow tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
