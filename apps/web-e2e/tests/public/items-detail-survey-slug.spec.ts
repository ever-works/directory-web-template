import { test, expect } from '@playwright/test';

// /items/[slug]/surveys/[surveySlug] is a nested survey route. Both segments
// may not exist (404). Must never 5xx.

const ITEM_SURVEY_PROBES = [
	'/items/sample/surveys/sample',
	'/items/does-not-exist-xyz/surveys/also-not-real',
	'/items/sample/surveys/' + 'a'.repeat(300),
	'/items/' + encodeURIComponent('<weird>') + '/surveys/anything'
];

test.describe('Item survey nested route tolerance', () => {
	for (const path of ITEM_SURVEY_PROBES) {
		test(`${path} does not 5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}
});
