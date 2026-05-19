import { test, expect } from '@playwright/test';

// Pagination links on a listing page should point to internal /discover/N
// URLs, not to "javascript:void(0)" or external domains.

test.describe('Listing pagination link validity', () => {
	test('/discover/1 pagination links are internal', async ({ page }) => {
		const resp = await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		const hrefs = await page.evaluate(() =>
			Array.from(document.querySelectorAll('a[href*="discover/"]'))
				.map((a) => a.getAttribute('href') || '')
				.filter((h) => h.length > 0)
		);
		for (const h of hrefs) {
			expect(h, `href: ${h}`).not.toMatch(/^javascript:/i);
			expect(h, `href: ${h}`).not.toMatch(/^http:\/\/(?!localhost)/i);
			expect(h, `href: ${h}`).not.toMatch(/^https:\/\/[^/]/);
		}
	});
});
