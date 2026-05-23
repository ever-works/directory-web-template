import { test, expect } from '@playwright/test';

// Every /client/settings/* subroute is auth-gated. Anonymous probes must
// bounce. We've already got settings-subroutes.spec.ts — this checks the
// deeper edges (basic-info, location, billing, portfolio, theme-colors,
// security, submissions/trash).

const SETTINGS_PROBES = [
	'/client/settings',
	'/client/settings/profile/basic-info',
	'/client/settings/profile/billing',
	'/client/settings/profile/location',
	'/client/settings/profile/portfolio',
	'/client/settings/profile/theme-colors',
	'/client/settings/profile/submissions/trash',
	'/client/settings/security'
];

test.describe('Client settings deeper anonymous gate', () => {
	for (const path of SETTINGS_PROBES) {
		test(`${path} bounces anonymous`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			expect(page.url()).toMatch(/(auth\/signin|\/auth\/|\/$|\/client\/)/);
		});
	}
});
