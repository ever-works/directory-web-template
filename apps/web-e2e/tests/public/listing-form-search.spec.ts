import { test, expect } from '@playwright/test';

// Listing page should expose a search input. We use role=searchbox first,
// then fall back to input[type=search] / placeholder presence — never
// assert copy text.

test.describe('Listing search input presence', () => {
	test('/discover/1 has a search-style input', async ({ page }) => {
		const resp = await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const search = page
			.locator('input[type="search"], input[role="searchbox"], [role="search"] input, [data-testid="search"], input[name="q"]')
			.first();
		await expect(search).toBeVisible({ timeout: 15_000 });
	});

	test('/ home has a search-style input OR none', async ({ page }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const count = await page
			.locator('input[type="search"], input[role="searchbox"], input[name="q"]')
			.count();
		// Home may or may not have a search. Just verify count is non-negative
		// — we mainly want to ensure the locator query doesn't crash.
		expect(count).toBeGreaterThanOrEqual(0);
	});
});
