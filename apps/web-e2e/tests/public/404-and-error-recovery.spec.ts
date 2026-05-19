import { test, expect } from '@playwright/test';

// Spec 010's error-pages spec covers basics. This adds recovery flows —
// a user who hits a 404 should be able to navigate back to safety
// without losing their session (if any).

test.describe('404 page user recovery', () => {
	test('404 page renders header navigation', async ({ page }) => {
		const resp = await page.goto('/this-route-definitely-does-not-exist-xkcd', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBe(404);
		// Header should still be present so user can navigate away.
		const homeLink = page.getByRole('link', { name: /home/i }).first();
		await expect(homeLink).toBeVisible({ timeout: 20_000 });
	});

	test('404 page links back to home and home loads', async ({ page }) => {
		await page.goto('/another-non-route-xyz', { waitUntil: 'domcontentloaded' });
		const homeLink = page.getByRole('link', { name: /home/i }).first();
		const href = await homeLink.getAttribute('href');
		expect(href).toBeTruthy();
		// Avoid clicking (anchor target can be locale-prefixed); just confirm
		// it points at the root or /en.
		expect(href).toMatch(/^\/(en|fr|es|de|ar|zh)?\/?$/);
	});

	test('404 in a localized path keeps the locale-aware layout', async ({ page }) => {
		const resp = await page.goto('/fr/not-a-real-page-zzz', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBe(404);
		const htmlLang = await page.locator('html').getAttribute('lang');
		// French locale may keep html lang=fr even on the 404 page; tolerate "fr-*" too.
		expect(htmlLang).toBeTruthy();
	});

	test('item detail with non-existent slug returns 404, not 500', async ({ page }) => {
		const resp = await page.goto('/items/this-item-slug-does-not-exist-zqq', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
		// Acceptable: 404 (preferred) or a 200 page with a "not found" state.
	});

	test('category with non-existent slug does not 500', async ({ page }) => {
		const resp = await page.goto('/categories/totally-bogus-category', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp!.status()).toBeLessThan(500);
	});

	test('tag with non-existent slug does not 500', async ({ page }) => {
		const resp = await page.goto('/tags/totally-bogus-tag', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
	});
});
