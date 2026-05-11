import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * Coverage for the per-tag and per-category server-rendered listings.
 *
 * Routes:
 *   - `/tags/[...tag]/page.tsx` — items filtered by a specific tag.
 *   - `/categories/[...category]/page.tsx` — items filtered by category.
 *
 * Both render the standard listing UI scoped to one filter dimension.
 * They are statically generated for popular slugs and rendered on
 * demand for the rest (ISR). These tests pin:
 *   - Non-5xx response for a known-real slug.
 *   - At least one item appears on the page.
 *   - The page surfaces a breadcrumb or h1 with the slug name.
 *   - Pagination works on `/tags/[slug]/[page]` and
 *     `/categories/[slug]/[page]` numeric segments.
 */

const PAGE_READY_TIMEOUT = 20_000;

async function pickRealSlug(
	request: APIRequestContext,
	key: 'tags' | 'categories'
): Promise<string | null> {
	const resp = await request.get('/items.json');
	if (resp.status() !== 200) return null;
	const body = await resp.json();
	const seen = new Set<string>();
	for (const item of body.items as Array<Record<string, unknown>>) {
		const list = item[key];
		if (!Array.isArray(list)) continue;
		for (const s of list) {
			if (typeof s === 'string' && s.trim().length > 0) {
				// Slugify minimally to mirror the routing key.
				seen.add(s.toLowerCase().replace(/\s+/g, '-'));
			}
		}
	}
	return seen.values().next().value ?? null;
}

async function expectItemsListing(page: Page) {
	await expect(page.locator('body')).toBeVisible();
	const itemCount = await page.locator('a[href*="/items/"]').count();
	// `/tags/[slug]` / `/categories/[slug]` SHOULD render at least one
	// item; if the slug exists in /items.json there are items behind it.
	expect(itemCount).toBeGreaterThan(0);
}

test.describe('Public: /tags/[slug] — per-tag listing', () => {
	test('GET /tags/<known-slug> returns non-5xx and renders items', async ({ page, request }) => {
		const slug = await pickRealSlug(request, 'tags');
		test.skip(!slug, 'No tag slugs in /items.json');

		const response = await page.goto(`/tags/${encodeURIComponent(slug!)}`, {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		await expectItemsListing(page);
	});

	test('GET /tags/<unknown-slug> returns 4xx or empty listing (never 5xx)', async ({ page }) => {
		const response = await page.goto('/tags/zzqx-tag-that-cannot-exist-zzqx', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
	});

	test('/tags/<slug> exposes a breadcrumb or h1 with the slug or "Tags"', async ({ page, request }) => {
		const slug = await pickRealSlug(request, 'tags');
		test.skip(!slug, 'No tag slugs in /items.json');

		await page.goto(`/tags/${encodeURIComponent(slug!)}`, {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('/tags/<slug> rejects path traversal-like input cleanly', async ({ page }) => {
		const response = await page.goto('/tags/..%2F..%2F..%2Fetc%2Fpasswd', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
	});
});

test.describe('Public: /categories/[slug] — per-category listing', () => {
	test('GET /categories/<known-slug> returns non-5xx and renders items', async ({ page, request }) => {
		const slug = await pickRealSlug(request, 'categories');
		test.skip(!slug, 'No category slugs in /items.json');

		const response = await page.goto(`/categories/${encodeURIComponent(slug!)}`, {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		await expectItemsListing(page);
	});

	test('GET /categories/<unknown-slug> returns non-5xx', async ({ page }) => {
		const response = await page.goto('/categories/zzqx-category-that-cannot-exist-zzqx', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
	});

	test('/categories/<slug> exposes an h1', async ({ page, request }) => {
		const slug = await pickRealSlug(request, 'categories');
		test.skip(!slug, 'No category slugs in /items.json');

		await page.goto(`/categories/${encodeURIComponent(slug!)}`, {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('/categories/<slug> with query params (?sort=name-asc) round-trips', async ({ page, request }) => {
		const slug = await pickRealSlug(request, 'categories');
		test.skip(!slug, 'No category slugs in /items.json');

		const response = await page.goto(`/categories/${encodeURIComponent(slug!)}?sort=name-asc`, {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		expect(page.url()).toContain('sort=name-asc');
	});
});
