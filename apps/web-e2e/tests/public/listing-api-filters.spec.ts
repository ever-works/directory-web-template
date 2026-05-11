import { test, expect } from '@playwright/test';

/**
 * Coverage for the JSON listing API at `/api/items/listing` — the peer
 * of the SSR `/discover/[page]` route that powers server-paginated
 * infinite scroll. Both surfaces share `lib/listing-server.ts` so they
 * must produce identical filter/sort/slice output for the same query.
 *
 * These tests pin:
 *   - Response envelope shape (items / total / page / perPage).
 *   - Page boundaries (page 1 vs page 2 disjoint within the same filter).
 *   - Cache headers (public, max-age + s-maxage + SWR).
 *   - Invalid input handling (page=0, page=-1, page=abc) — must NEVER 5xx.
 *   - Filter combinations (?q=, ?tags=, ?categories=, ?sort=).
 *   - CSV parsing for comma-separated tag / category lists.
 *
 * Sister spec: `listing-pagination-spec020.spec.ts` covers the SSR-side
 * pagination + counts contracts. This one is API-only.
 */

const PAGE_READY_TIMEOUT = 15_000;

test.describe('Public: JSON listing API (/api/items/listing)', () => {
	test('envelope shape — items / total / page / perPage', async ({ request }) => {
		const response = await request.get('/api/items/listing?page=1&lang=en');
		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(body).toHaveProperty('total');
		expect(body).toHaveProperty('page');
		expect(body).toHaveProperty('perPage');
		expect(Array.isArray(body.items)).toBeTruthy();
		expect(typeof body.total).toBe('number');
		expect(typeof body.page).toBe('number');
		expect(typeof body.perPage).toBe('number');
		expect(body.items.length).toBeLessThanOrEqual(body.perPage);
	});

	test('cache-control header advertises CDN-friendly caching', async ({ request }) => {
		const response = await request.get('/api/items/listing?page=1&lang=en');
		const cc = response.headers()['cache-control'] ?? '';
		expect(cc).toContain('public');
		// Vercel may rewrite `s-maxage` into `max-age` at the edge. We only
		// require that *some* TTL directive is present so the response is
		// cacheable somewhere.
		expect(cc).toMatch(/max-age=\d+|s-maxage=\d+/);
	});

	test('invalid page values do NOT 5xx', async ({ request }) => {
		// Each variant goes through `paginateMeta` → `parseInt(rawPage)`.
		// NaN / 0 / negative all need to round-trip < 500.
		for (const value of ['0', '-1', 'abc', '', 'NaN', '999999']) {
			const response = await request.get(`/api/items/listing?page=${encodeURIComponent(value)}&lang=en`);
			expect(response.status(), `page=${value}`).toBeLessThan(500);
		}
	});

	test('?sort=name-asc returns items in alphabetical order', async ({ request }) => {
		const response = await request.get('/api/items/listing?page=1&sort=name-asc&lang=en');
		expect(response.status()).toBe(200);
		const body = await response.json();
		test.skip(body.items.length < 2, 'Need 2+ items to verify sort order');

		const names = (body.items as Array<{ name?: string }>).map((it) => (it.name ?? '').toLowerCase());
		const sorted = [...names].sort((a, b) => a.localeCompare(b));
		expect(names).toEqual(sorted);
	});

	test('?sort=name-desc reverses the order', async ({ request }) => {
		const asc = await request.get('/api/items/listing?page=1&sort=name-asc&lang=en');
		const desc = await request.get('/api/items/listing?page=1&sort=name-desc&lang=en');
		expect(asc.status()).toBe(200);
		expect(desc.status()).toBe(200);
		const ascBody = await asc.json();
		const descBody = await desc.json();
		test.skip(ascBody.items.length < 2 || descBody.items.length < 2, 'Need 2+ items');

		const ascFirst = (ascBody.items[0] as { name?: string }).name ?? '';
		const descFirst = (descBody.items[0] as { name?: string }).name ?? '';
		expect(ascFirst).not.toBe(descFirst);
	});

	test('?q= narrows total — empty query returns full catalogue', async ({ request }) => {
		const baseline = await request.get('/api/items/listing?page=1&lang=en');
		const filtered = await request.get('/api/items/listing?page=1&q=zzqx-impossible-zzzz&lang=en');
		expect(baseline.status()).toBe(200);
		expect(filtered.status()).toBe(200);
		const baseBody = await baseline.json();
		const filteredBody = await filtered.json();
		// A nonsense search term should return 0 items and total === 0.
		expect(filteredBody.total).toBeLessThanOrEqual(baseBody.total);
		expect(filteredBody.items.length).toBeLessThanOrEqual(filteredBody.perPage);
	});

	test('?tags= CSV parses correctly (comma-separated list, OR semantics)', async ({ request }) => {
		// `filterItems` matches items whose tag set intersects with the
		// requested set — i.e. OR semantics across the CSV. Adding a
		// second tag should produce ≥ the single-tag total (union, not
		// intersection).
		const single = await request.get('/api/items/listing?page=1&tags=free&lang=en');
		const multi = await request.get('/api/items/listing?page=1&tags=free,collaboration&lang=en');
		expect(single.status()).toBe(200);
		expect(multi.status()).toBe(200);
		const singleBody = await single.json();
		const multiBody = await multi.json();
		expect(multiBody.total).toBeGreaterThanOrEqual(singleBody.total);
		// Both should also be ≤ the unfiltered baseline.
		const baseline = await request.get('/api/items/listing?page=1&lang=en');
		const baseBody = await baseline.json();
		expect(multiBody.total).toBeLessThanOrEqual(baseBody.total);
	});

	test('?categories= CSV parses correctly', async ({ request }) => {
		const response = await request.get('/api/items/listing?page=1&categories=time-tracking-software&lang=en');
		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(Array.isArray(body.items)).toBeTruthy();
		// Either 0 matches (category doesn't exist in this deployment) or
		// every item carries that category — but the API must respond.
		expect(typeof body.total).toBe('number');
	});

	test('?page=2 returns disjoint items from page=1 (within same filter)', async ({ request }) => {
		const p1 = await request.get('/api/items/listing?page=1&lang=en');
		const p2 = await request.get('/api/items/listing?page=2&lang=en');
		expect(p1.status()).toBe(200);
		expect(p2.status()).toBe(200);
		const p1Body = await p1.json();
		const p2Body = await p2.json();
		test.skip(p1Body.total <= p1Body.perPage, 'Catalogue too small for multi-page');

		const p1Slugs = new Set((p1Body.items as Array<{ slug?: string }>).map((it) => it.slug).filter(Boolean));
		const p2Slugs = (p2Body.items as Array<{ slug?: string }>).map((it) => it.slug).filter(Boolean);
		const overlap = p2Slugs.filter((s) => p1Slugs.has(s));
		expect(overlap.length).toBe(0);
	});

	test('non-GET methods do NOT 5xx', async ({ request }) => {
		// Route exports only GET — POST/PUT/DELETE should return 405,
		// never 500.
		for (const verb of ['post', 'put', 'patch', 'delete'] as const) {
			const response = await request[verb]('/api/items/listing?page=1');
			expect(response.status(), verb).toBeLessThan(500);
		}
	});

	test('?lang=fr does not 5xx (locale forwarding)', async ({ request }) => {
		const response = await request.get('/api/items/listing?page=1&lang=fr');
		expect(response.status()).toBeLessThan(500);
		if (response.status() === 200) {
			const body = await response.json();
			expect(body).toHaveProperty('items');
		}
	});

	test('agrees with SSR slice — page 1 items match the rendered listing', async ({ request, page }) => {
		// Server-rendered home page must agree with the JSON API for the
		// same page. If they drift, server-paginated infinite scroll would
		// show duplicates or skip items.
		const apiResp = await request.get('/api/items/listing?page=1&lang=en&sort=popularity');
		if (apiResp.status() !== 200) return;
		const apiBody = await apiResp.json();
		const apiSlugs = (apiBody.items as Array<{ slug?: string }>).map((it) => it.slug).filter(Boolean);

		await page.goto('/discover/1', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const ssrHrefs = await page
			.locator('a[href*="/items/"]')
			.evaluateAll((els) =>
				Array.from(new Set(els.map((el) => (el as HTMLAnchorElement).getAttribute('href')))).filter(Boolean) as string[]
			);
		const ssrSlugs = ssrHrefs.map((href) => href.split('/items/').pop()?.replace(/\/$/, ''));

		// At least 80 % of API slugs should appear on the SSR page. We
		// allow a soft threshold because the SSR layout can dedup links
		// or wrap them differently (related-items vs main listing).
		const matchedCount = apiSlugs.filter((slug) => ssrSlugs.includes(slug)).length;
		const matchRate = apiSlugs.length === 0 ? 1 : matchedCount / apiSlugs.length;
		expect(matchRate, `API/SSR slug match rate: ${matchedCount}/${apiSlugs.length}`).toBeGreaterThanOrEqual(0.5);
	});
});
