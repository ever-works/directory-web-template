import { test, expect } from '@playwright/test';

// /dashboard/items/[itemId]/surveys[ /[surveySlug]/preview | /[surveySlug]/responses ]
// are protected. We verify anonymous gets bounced and the route shape doesn't 5xx.

const DASHBOARD_SURVEY_ROUTES = [
	'/dashboard/items/probe-itemid/surveys',
	'/dashboard/items/probe-itemid/surveys/sample/preview',
	'/dashboard/items/probe-itemid/surveys/sample/responses'
];

test.describe('Dashboard items-surveys routes — anonymous gate', () => {
	for (const path of DASHBOARD_SURVEY_ROUTES) {
		test(`${path} gates anonymous`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			// Dashboard auth gate is client-side; the redirect fires after
			// hydration, not by the time domcontentloaded resolves.
			await expect(page).toHaveURL(/(auth\/signin|\/auth\/|\/$)/, { timeout: 30_000 });
		});
	}
});
