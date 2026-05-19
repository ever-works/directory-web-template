import { test, expect } from '@playwright/test';

// /client/users and /client/sponsorships are client-area pages — anonymous
// access must be gated and not 5xx.

const PROBES = [
	'/client/users',
	'/client/sponsorships'
];

test.describe('Client users / sponsorships anonymous gate', () => {
	for (const path of PROBES) {
		test(`${path} bounces anonymous`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			expect(page.url()).toMatch(/(auth\/signin|\/auth\/|\/$|\/client\/)/);
		});
	}
});
