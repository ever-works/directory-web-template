import { test, expect } from '@playwright/test';

// Public read pages MUST be usable without JavaScript (RSC SSR). If a
// page is entirely a client component, search engines and accessibility
// tools can't index/use it.

test.describe('No-JS fallback rendering', () => {
	test.use({ javaScriptEnabled: false });

	for (const path of ['/', '/about', '/help', '/categories', '/tags']) {
		test(`${path} renders core content with JS disabled`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);

			// At least a heading must render in raw HTML.
			const headings = page.getByRole('heading');
			await expect(headings.first()).toBeVisible({ timeout: 30_000 });

			// Footer / nav must also be there for accessibility.
			const nav = page.locator('header, nav').first();
			await expect(nav).toBeVisible({ timeout: 30_000 });
		});
	}
});
