import { test, expect } from '@playwright/test';

// Truly anonymous (empty cookie jar) visit to every public route. Catches
// regressions where a page assumes a cookie value exists (NEXT_LOCALE,
// theme, session) and crashes server-side when none does.

const PAGES = [
	'/',
	'/about',
	'/help',
	'/pricing',
	'/categories',
	'/tags',
	'/collections',
	'/comparisons',
	'/map',
	'/discover/1',
	'/auth/signin',
	'/auth/register',
	'/auth/forgot-password',
	'/auth/new-password',
	'/auth/new-verification',
	'/privacy-policy',
	'/terms-of-service',
	'/cookies'
];

test.describe('Page stability with empty cookie jar', () => {
	for (const path of PAGES) {
		test(`${path} survives empty-cookie request`, async ({ browser }) => {
			const ctx = await browser.newContext({
				// No cookies, no storage.
				storageState: { cookies: [], origins: [] }
			});
			const page = await ctx.newPage();
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
			await ctx.close();
		});
	}
});
