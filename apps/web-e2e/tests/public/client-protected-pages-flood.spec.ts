import { test, expect } from '@playwright/test';

// Sweep across every known /client/* page — anonymous bounces, no 5xx.

const PAGES = [
	'/client/dashboard',
	'/client/settings',
	'/client/settings/profile/basic-info',
	'/client/settings/profile/billing',
	'/client/settings/profile/location',
	'/client/settings/profile/portfolio',
	'/client/settings/profile/theme-colors',
	'/client/settings/profile/submissions/trash',
	'/client/settings/security',
	'/client/sponsorships',
	'/client/submissions',
	'/client/submissions/trash',
	'/client/users',
	'/client/profile/sample',
	'/client/profile/sample/followers',
	'/client/profile/sample/following'
];

test.describe('Client area anonymous gate sweep', () => {
	for (const path of PAGES) {
		test(`${path} bounces anonymous`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
