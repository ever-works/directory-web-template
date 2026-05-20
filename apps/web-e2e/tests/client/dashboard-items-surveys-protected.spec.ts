import { test, expect } from '@playwright/test';

// /dashboard/items/[itemId]/surveys[ /[surveySlug]/preview | /[surveySlug]/responses ]
// must respond without a 5xx for anonymous requests. These routes are
// currently soft-public (the page itself doesn't redirect anonymous
// users — visibility is enforced inside the surveys API and the empty
// view simply shows no data), so we only assert the route shape.

const DASHBOARD_SURVEY_ROUTES = [
	'/dashboard/items/probe-itemid/surveys',
	'/dashboard/items/probe-itemid/surveys/sample/preview',
	'/dashboard/items/probe-itemid/surveys/sample/responses'
];

test.describe('Dashboard items-surveys routes — anonymous shape', () => {
	for (const path of DASHBOARD_SURVEY_ROUTES) {
		test(`${path} responds non-5xx for anonymous`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
		});
	}
});
