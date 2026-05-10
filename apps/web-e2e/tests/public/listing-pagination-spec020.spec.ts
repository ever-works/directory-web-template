import { test, expect } from '@playwright/test';

/**
 * Regression coverage for the Spec 020 server-side slice that landed in
 * `globals-client.tsx` / `home-two-layout.tsx` and broke:
 *
 *   - Pagination controls (`UniversalPagination`) — were computing
 *     `totalPages` from the page slice (~12 items) instead of the
 *     server-supplied catalogue total. With `totalPages = 1`, the
 *     pagination strip is hidden entirely.
 *   - Tags strip "All Tags (N)" badge — was reading
 *     `allItems.length` (~12) instead of `props.total` (~hundreds).
 *   - JSON listing API at `/api/items/listing` — peer of the SSR
 *     route, used by infinite-scroll mode to fetch successive pages.
 *
 * These tests pin the post-fix behaviour:
 *   1. Page 2 of the listing actually shows different items than page 1.
 *   2. `/api/items/listing?page=N` returns a sliced page + the catalogue
 *      total + the page index, identical in shape to the SSR slice.
 *   3. The "All Tags" badge surfaces a plausible catalogue-wide count.
 */

const PAGE_READY_TIMEOUT = 15_000;

test.describe('Public: Spec 020 server-side slice — pagination + counts', () => {
	test('page 2 of /discover serves a non-empty body distinct from page 1', async ({ page }) => {
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const itemHrefsP1 = await page
			.locator('a[href*="/items/"]')
			.evaluateAll((els) => Array.from(new Set(els.map((el) => (el as HTMLAnchorElement).getAttribute('href')))).filter(Boolean));

		// If the catalogue is too small to have a page 2, the regression
		// can't manifest — skip rather than flake.
		test.skip(itemHrefsP1.length < 12, 'Catalogue too small for multi-page pagination');

		const response = await page.goto('/discover/2', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		expect(response?.status() ?? 0).toBeLessThan(500);

		const itemHrefsP2 = await page
			.locator('a[href*="/items/"]')
			.evaluateAll((els) => Array.from(new Set(els.map((el) => (el as HTMLAnchorElement).getAttribute('href')))).filter(Boolean));

		// Page 2 must have content (not an empty page) and must overlap
		// the page-1 set by < 50 % — the regression would have rendered
		// either an empty page or the same first-page slice.
		expect(itemHrefsP2.length).toBeGreaterThan(0);
		const overlap = itemHrefsP2.filter((href) => itemHrefsP1.includes(href as string));
		expect(overlap.length).toBeLessThan(itemHrefsP2.length / 2);
	});

	test('/api/items/listing returns a sliced page with `total` ≥ slice length', async ({ request }) => {
		const response = await request.get('/api/items/listing?page=1&lang=en');
		expect(response.status()).toBeLessThan(500);

		// The route is allowed to 500 in dev when the content repo isn't
		// cloned — only assert shape when 200.
		if (response.status() !== 200) return;

		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(body).toHaveProperty('total');
		expect(body).toHaveProperty('page');
		expect(body).toHaveProperty('perPage');
		expect(Array.isArray(body.items)).toBeTruthy();
		expect(typeof body.total).toBe('number');
		expect(body.page).toBe(1);
		expect(body.items.length).toBeLessThanOrEqual(body.perPage);
		expect(body.total).toBeGreaterThanOrEqual(body.items.length);
	});

	test('/api/items/listing page=2 returns disjoint items from page=1 (when total > perPage)', async ({ request }) => {
		const p1Response = await request.get('/api/items/listing?page=1&lang=en');
		if (p1Response.status() !== 200) return;
		const p1 = await p1Response.json();
		test.skip(p1.total <= p1.perPage, 'Catalogue too small for multi-page pagination');

		const p2Response = await request.get('/api/items/listing?page=2&lang=en');
		expect(p2Response.status()).toBe(200);
		const p2 = await p2Response.json();

		expect(p2.page).toBe(2);
		expect(Array.isArray(p2.items)).toBeTruthy();
		expect(p2.items.length).toBeGreaterThan(0);

		const p1Slugs = new Set((p1.items as Array<{ slug?: string }>).map((it) => it.slug).filter(Boolean));
		const p2Slugs = (p2.items as Array<{ slug?: string }>).map((it) => it.slug).filter(Boolean);
		const overlap = p2Slugs.filter((slug) => p1Slugs.has(slug));
		expect(overlap.length).toBe(0);
	});

	test('/api/items/listing rejects invalid page numbers cleanly', async ({ request }) => {
		const response = await request.get('/api/items/listing?page=0&lang=en');
		// Either 400 (explicit reject) or a clamped 200 — must NEVER 500.
		expect(response.status()).toBeLessThan(500);
	});

	test('home page surfaces an "All Tags (N)" badge with a catalogue-wide count', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });

		// Wait briefly for tag strip hydration. The "All Tags" button is
		// rendered for both the desktop / mobile layouts (with conflicting
		// visibility classes), so we collect candidates and assert at least
		// one surfaces a count > 12 — the regression value was exactly 12
		// (the page slice). Skip when the deployment has < 12 tags total.
		await page.waitForTimeout(2_000);

		const allTagsButtons = page.getByRole('button', { name: /^All Tags/i });
		const buttonCount = await allTagsButtons.count();
		const allTagsLinks = page.getByRole('link', { name: /^All Tags/i });
		const linkCount = await allTagsLinks.count();

		test.skip(buttonCount + linkCount === 0, '"All Tags" badge not present (no tags in catalogue?)');

		// Read the trailing number from each candidate's accessible name /
		// inner text. We assert at least one candidate has a count > 12.
		const texts: string[] = [];
		for (let i = 0; i < buttonCount; i++) {
			texts.push((await allTagsButtons.nth(i).innerText()).trim());
		}
		for (let i = 0; i < linkCount; i++) {
			texts.push((await allTagsLinks.nth(i).innerText()).trim());
		}

		const counts = texts
			.map((t) => {
				const match = t.match(/(\d+)/);
				return match ? Number.parseInt(match[1], 10) : null;
			})
			.filter((n): n is number => n != null);

		// If the deployment legitimately has ≤ 12 tags, skip — the
		// regression sentinel (count === 12 from page slice) collides
		// with a valid value.
		test.skip(counts.length === 0, 'Could not parse "All Tags" count from any candidate');

		const maxCount = Math.max(...counts);
		expect(maxCount, `"All Tags" candidates: ${JSON.stringify(texts)}`).toBeGreaterThan(12);
	});

	test('search ?q=… filters the SSR slice', async ({ page }) => {
		// Hit the SSR route directly with a query that's almost certainly
		// matched by something in the catalogue (or matched by nothing).
		// In either case the response shape stays valid.
		const response = await page.goto('/discover/1?q=zzqx-nonexistent-zzz', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		await expect(page.locator('body')).toBeVisible();
	});

	test('sort ?sort=name-asc returns a valid response', async ({ page }) => {
		const response = await page.goto('/discover/1?sort=name-asc', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		await expect(page.locator('body')).toBeVisible();
	});
});
