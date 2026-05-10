import { test, expect } from '@playwright/test';
import { DiscoverPage } from '../../page-objects/public/discover.page';

/**
 * Home / discover-page performance & integrity contract — Spec 019.
 *
 * The home page rewrites internally to `/<locale>/discover/1`. Spec 019
 * fixes two bugs that were observed on `demo.ever.works` in 2026-05:
 *
 *   1. CDN bypass — every request was served `Cache-Control: no-store`
 *      because next-intl middleware was writing a `NEXT_LOCALE` cookie.
 *   2. Silent item drops — `EMFILE: too many open files` errors caused
 *      individual `parseItem` calls to fail, and the listing just got
 *      shorter without surfacing an error.
 *
 * The integrity tests below run against any deployment (local dev,
 * preview, prod). The cache assertion is gated on `BASE_URL` being a
 * real Vercel deployment so it does not flake against the local dev
 * server.
 */
test.describe('Public: Home / Discover — performance & integrity', () => {
	test('renders the full configured page of items', async ({ page }) => {
		const discoverPage = new DiscoverPage(page);
		await discoverPage.navigate(1);
		await discoverPage.waitForPageReady();

		// We don't hard-code the absolute item count (it grows over time).
		// We assert it's at least the page size from `works.yml`
		// (`pagination.itemsPerPage`), which today is 12. If `fetchItems`
		// silently drops items due to an IO error (the symptom Spec 019
		// closes), this falls below the threshold and the test fails loud.
		const MIN_ITEMS_PER_PAGE = 10; // small safety margin under the 12-item config
		const itemCount = await discoverPage.getItemCount();
		expect(itemCount).toBeGreaterThanOrEqual(MIN_ITEMS_PER_PAGE);
	});

	test('home page renders an item count consistent across reloads', async ({ page }) => {
		const discoverPage = new DiscoverPage(page);

		await discoverPage.navigate(1);
		await discoverPage.waitForPageReady();
		const first = await discoverPage.getItemCount();

		await page.reload({ waitUntil: 'domcontentloaded' });
		await discoverPage.waitForPageReady();
		const second = await discoverPage.getItemCount();

		// If `fetchItems` non-determinstically drops items under fd
		// pressure (the silent-drop bug), reload counts will differ.
		// Spec 019 makes that condition throw instead, so counts must
		// match across reloads.
		expect(second).toBe(first);
	});

	test('@cdn second hit returns X-Vercel-Cache: HIT against a Vercel deployment', async ({ request }) => {
		const baseUrl = process.env.BASE_URL ?? '';
		test.skip(
			!/\.vercel\.app$|demo\.ever\.works$|ever\.works$/.test(baseUrl),
			'CDN HIT assertion requires BASE_URL pointing at a real Vercel deployment'
		);

		// Warm the cache.
		await request.get('/', { headers: { 'cache-control': 'no-cache' } });
		await new Promise((r) => setTimeout(r, 1500));

		const second = await request.get('/');
		expect(second.status()).toBe(200);

		const cache = second.headers()['x-vercel-cache'] ?? '';
		expect(cache, `expected X-Vercel-Cache HIT/STALE, got "${cache}"`).toMatch(/HIT|STALE/);

		// Defence-in-depth: make sure the response also doesn't ship a
		// `Set-Cookie: NEXT_LOCALE=...` header. That header is the
		// fingerprint of the bug Spec 019 closes.
		const setCookie = second.headers()['set-cookie'] ?? '';
		expect(setCookie).not.toMatch(/NEXT_LOCALE/);
	});
});
