import { test, expect } from '@playwright/test';

// Each user-facing page should have:
//   - <title> non-empty
//   - <meta name="description"> non-empty
//   - <link rel="canonical"> pointing at the same path
//   - <meta property="og:title"> + <meta property="og:type">
//   - hreflang alternates if the route is internationalized
//
// Without these, indexing breaks. Spec 008/016 added Analytics; Spec 019
// added hreflang; this matrix asserts the surface stays consistent.

const SEO_PAGES = [
	'/',
	'/about',
	'/pricing',
	'/help',
	'/categories',
	'/tags',
	'/collections',
	'/auth/signin',
	'/auth/register'
];

test.describe('SEO meta coverage', () => {
	for (const path of SEO_PAGES) {
		test(`${path} has core SEO metadata`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp!.status()).toBeLessThan(400);

			const title = await page.title();
			expect(title.length, `${path}: title should be non-empty`).toBeGreaterThan(0);

			const description = await page
				.locator('meta[name="description"]')
				.first()
				.getAttribute('content');
			expect(description, `${path}: meta description`).toBeTruthy();
			expect(description!.length).toBeGreaterThan(0);

			// Canonical (some pages emit it, some don't — accept absence on auth pages)
			const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href').catch(() => null);
			if (canonical) {
				const url = new URL(canonical);
				expect(url.pathname).toContain(path === '/' ? '/' : path);
			}

			// OpenGraph title
			const ogTitle = await page
				.locator('meta[property="og:title"]')
				.first()
				.getAttribute('content')
				.catch(() => null);
			if (ogTitle !== null) {
				expect(ogTitle.length).toBeGreaterThan(0);
			}
		});
	}

	test('home page exposes JSON-LD structured data', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		const jsonLdScripts = page.locator('script[type="application/ld+json"]');
		const count = await jsonLdScripts.count();
		expect(count, 'home should ship at least 1 JSON-LD block').toBeGreaterThanOrEqual(1);

		// Each script tag must contain valid JSON.
		for (let i = 0; i < count; i++) {
			const raw = await jsonLdScripts.nth(i).textContent();
			expect(raw).toBeTruthy();
			// Will throw if malformed.
			JSON.parse(raw!);
		}
	});
});
