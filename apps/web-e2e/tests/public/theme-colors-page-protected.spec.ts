import { test, expect } from '@playwright/test';

// /client/settings/profile/theme-colors anonymous gate + RSC variants.

const PROBES = [
	'/client/settings/profile/theme-colors',
	'/client/settings/profile/theme-colors?_rsc=abc',
	'/client/settings/profile/theme-colors?reset=1',
	'/en/client/settings/profile/theme-colors',
	'/fr/client/settings/profile/theme-colors'
];

test.describe('Theme-colors page anonymous gate', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
