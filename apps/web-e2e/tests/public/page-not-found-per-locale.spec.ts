import { test, expect } from '@playwright/test';

// Unknown paths under each locale prefix should return a proper 404 (not
// 200/500). The 404 page may render localized chrome but the HTTP status
// must be 404.

const LOCALES = ['', 'de', 'fr', 'es', 'it', 'pt', 'ja'];

const UNKNOWN_PATH = '/this-page-does-not-exist-' + Math.random().toString(36).slice(2, 10);

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
