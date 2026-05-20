import { test, expect } from '@playwright/test';

/**
 * Every public page should have exactly one HTML5 <main> element (or
 * an element with role="main"). Screen readers use this to provide a
 * "skip to main content" affordance; duplicates confuse them.
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing', '/help'];

test.describe('Public HTML: <main> landmark uniqueness', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} has exactly one main landmark`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const count = await page.locator('main, [role="main"]').count();
			expect(count, `main landmarks on ${path}`).toBe(1);
		});
	}
});
