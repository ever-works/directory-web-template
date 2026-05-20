import { test, expect } from '@playwright/test';

// Unknown paths under each locale prefix should return a proper 404 (not
// 200/500). The 404 page may render localized chrome but the HTTP status
// must be 404.

// Only the locales actually configured in this template — `it`, `pt`,
// `ja` aren't shipped, so /<unknown-locale>/... renders the
// default-locale 404 page (not a per-locale 404) and the test was
// over-asserting.
const LOCALES = ['', 'de', 'fr', 'es'];

// Static path — `Math.random()` produced non-deterministic test IDs
// across Playwright workers (same issue as `Date.now()` in the
// listing-empty-state spec).
const UNKNOWN_PATH = '/this-page-does-not-exist-ci-sentinel';

test.describe('Localized 404: unknown paths return 404 per locale', () => {
	for (const locale of LOCALES) {
		const url = locale === '' ? UNKNOWN_PATH : `/${locale}${UNKNOWN_PATH}`;
		test(`${url} returns 404`, async ({ page }) => {
			const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
			expect(response, url).not.toBeNull();
			expect(response!.status(), `status for ${url}`).toBe(404);
		});
	}
});
