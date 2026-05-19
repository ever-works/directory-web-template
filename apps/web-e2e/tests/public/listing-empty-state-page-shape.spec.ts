import { test, expect } from '@playwright/test';

// Filtered listings that return zero results should render an empty-state
// UI — NOT a 404, NOT a 5xx. We don't assert on the empty-state copy.

const EMPTY_QUERIES = [
	'/discover/1?q=zzzqxnoresults-' + Date.now(),
	'/discover/1?tag=does-not-exist-' + Date.now(),
	'/discover/1?category=does-not-exist-' + Date.now(),
	'/categories?q=does-not-exist-' + Date.now()
];

test.describe('Empty-state listing shape', () => {
	for (const path of EMPTY_QUERIES) {
		test(`${path} non-5xx and renders body`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), path).toBeLessThan(500);
			expect(resp!.status()).toBeLessThan(400);
			await expect(page.locator('body')).toBeVisible();
		});
	}
});
