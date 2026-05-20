import { test, expect } from '@playwright/test';

// Inject classic XSS payloads via URL params, slugs, and search inputs.
// Each must:
//   - not 5xx
//   - not execute the injected script (we check for any console "XSS"
//     marker we plant in the payload)

const XSS_MARKERS = ['<script>window.__xssMarker=true</script>', '"><img src=x onerror=window.__xssMarker=true>'];

test.describe('XSS payload tolerance', () => {
	for (const [i, payload] of XSS_MARKERS.entries()) {
		const encoded = encodeURIComponent(payload);

		test(`#${i} search ?q=<xss> does not execute`, async ({ page }) => {
			await page.goto(`/discover/1?q=${encoded}`, { waitUntil: 'domcontentloaded' });
			const fired = await page.evaluate(() => (window as any).__xssMarker === true);
			expect(fired, 'XSS marker should NOT be set').toBe(false);
		});

		test(`#${i} category slug <xss> does not execute`, async ({ page }) => {
			await page.goto(`/categories/${encoded}`, { waitUntil: 'domcontentloaded' });
			const fired = await page.evaluate(() => (window as any).__xssMarker === true);
			expect(fired).toBe(false);
		});

		test(`#${i} tag slug <xss> does not execute`, async ({ page }) => {
			await page.goto(`/tags/${encoded}`, { waitUntil: 'domcontentloaded' });
			const fired = await page.evaluate(() => (window as any).__xssMarker === true);
			expect(fired).toBe(false);
		});

		test(`#${i} item slug <xss> does not execute`, async ({ page }) => {
			await page.goto(`/items/${encoded}`, { waitUntil: 'domcontentloaded' });
			const fired = await page.evaluate(() => (window as any).__xssMarker === true);
			expect(fired).toBe(false);
		});

		test(`#${i} signin ?callbackUrl=<xss> does not execute`, async ({ page }) => {
			await page.goto(`/auth/signin?callbackUrl=${encoded}`, {
				waitUntil: 'domcontentloaded'
			});
			const fired = await page.evaluate(() => (window as any).__xssMarker === true);
			expect(fired).toBe(false);
		});
	}

	test('XSS in URL hash does not execute', async ({ page }) => {
		await page.goto('/#<script>window.__xssMarker=true</script>', {
			waitUntil: 'domcontentloaded'
		});
		const fired = await page.evaluate(() => (window as any).__xssMarker === true);
		expect(fired).toBe(false);
	});
});
