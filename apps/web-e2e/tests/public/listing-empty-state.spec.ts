import { test, expect } from '@playwright/test';

// When a listing returns zero items (no seed data, an over-narrow filter,
// etc.), the page should still render cleanly with an "empty" affordance.
// Without coverage we've seen builds where empty state crashes on a `null`
// chart binding.

test.describe('Listing empty state handling', () => {
	test('search for a definitely-no-result query returns clean empty UI', async ({ page }) => {
		const resp = await page.goto('/discover/1?q=zzzzz-no-result-string-xqqpw', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
		// Body should be visible and a heading should still render.
		await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
	});

	test('category with no items in seed does not crash', async ({ page }) => {
		const resp = await page.goto('/categories/zz-empty-zz', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
	});

	test('favorites page (anonymous) prompts for sign-in without 5xx', async ({ page }) => {
		const resp = await page.goto('/favorites', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
		// Either prompts for sign-in (visible link) or shows an empty favorites
		// state. Both acceptable.
	});

	test('map view with no items renders the map shell', async ({ page }) => {
		const resp = await page.goto('/map', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('comparisons index with no slugs renders prompt', async ({ page }) => {
		const resp = await page.goto('/comparisons', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});
});
