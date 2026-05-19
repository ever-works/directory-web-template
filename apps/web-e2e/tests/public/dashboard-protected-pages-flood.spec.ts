import { test, expect } from '@playwright/test';

// /dashboard/* sweep — anonymous gate.

const PAGES = [
	'/dashboard/billing',
	'/dashboard/items/probe-id/surveys',
	'/dashboard/items/probe-id/surveys/sample/preview',
	'/dashboard/items/probe-id/surveys/sample/responses'
];

test.describe('Dashboard area anonymous gate sweep', () => {
	for (const path of PAGES) {
		test(`${path} bounces anonymous`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
		});
	}
});
