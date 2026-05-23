import { test, expect } from '@playwright/test';

// /<locale>/client/* + /<locale>/dashboard/* deeper variants.

const LOCALES = ['en', 'fr', 'es', 'de'];

const PATHS = [
	'/client/dashboard',
	'/client/profile/sample',
	'/client/settings',
	'/client/sponsorships',
	'/client/submissions',
	'/dashboard/billing'
];

test.describe('Client / dashboard locale prefix bounces anonymous (deeper)', () => {
	for (const loc of LOCALES) {
		for (const p of PATHS) {
			test(`/${loc}${p} non-5xx`, async ({ page }) => {
				const resp = await page.goto(`/${loc}${p}`, { waitUntil: 'domcontentloaded' });
				expect(resp).toBeTruthy();
				expect(resp!.status(), `/${loc}${p}`).toBeLessThan(500);
			});
		}
	}
});
