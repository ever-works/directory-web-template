import { test, expect } from '@playwright/test';

// /items/[slug] is the primary directory detail page. /items/[slug]/surveys/[surveySlug]
// is the embedded survey route. Both have to tolerate missing fixtures and
// gracefully 404 — not 500.

test.describe('Item detail & embedded survey page', () => {
	test('item detail with non-existent slug 404s (no 5xx)', async ({ page }) => {
		const resp = await page.goto('/items/this-slug-truly-does-not-exist-zzzxw', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status(), `non-existent item`).toBeLessThan(500);
	});

	test('item embedded survey route does not 5xx for bad slugs', async ({ page }) => {
		const resp = await page.goto('/items/probe-item/surveys/probe-survey', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('item .md mirror tolerates missing slug', async ({ request }) => {
		const resp = await request.get('/items/another-non-existent-item.md');
		expect(resp.status()).toBeLessThan(500);
	});

	test('item discover URL with absurd page param does not crash', async ({ page }) => {
		const resp = await page.goto('/discover/2147483648', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('collections detail with non-existent slug does not 5xx', async ({ page }) => {
		const resp = await page.goto('/collections/zz-fake-collection', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp!.status()).toBeLessThan(500);
	});

	test('comparisons detail with non-existent slug does not 5xx', async ({ page }) => {
		const resp = await page.goto('/comparisons/zz-fake-compare', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp!.status()).toBeLessThan(500);
	});

	test('pages [slug] CMS page with non-existent slug does not 5xx', async ({ page }) => {
		const resp = await page.goto('/pages/zz-fake-page', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
	});
});
