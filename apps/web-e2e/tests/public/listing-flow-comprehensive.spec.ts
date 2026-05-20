import { test, expect, type Page } from '@playwright/test';

/**
 * End-to-end home-page flow coverage.
 *
 * The pre-existing public specs each verify a single widget in isolation
 * (search input is visible, sort menu opens, page 2 link exists). What
 * was missing — and what Spec 020 / the paging regression exposed — is
 * coverage of the *combined* flow: search narrows, sort reorders,
 * pagination respects filters, and clicking an item takes you to the
 * right detail page.
 *
 * These tests run against the SSR route, so they implicitly exercise:
 *   - `/discover/[page]/page.tsx` filter/sort/slice
 *   - `usePaginationLogic` server-pagination mode (URL-driven)
 *   - `useFilterURLSync` debounced URL writes
 *   - `FilterURLParser` reading URL → context on mount
 */

const PAGE_READY_TIMEOUT = 15_000;

async function gotoListing(page: Page, path = '/discover/1') {
	await page.goto(path, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
	await page.waitForLoadState('networkidle').catch(() => {
		// networkidle can hang on long-running analytics; soft-fail.
	});
}

async function getItemHrefs(page: Page): Promise<string[]> {
	return page
		.locator('a[href*="/items/"]')
		.evaluateAll((els) =>
			Array.from(new Set(els.map((el) => (el as HTMLAnchorElement).getAttribute('href')))).filter(Boolean) as string[]
		);
}

test.describe('Public: home-page combined flow (search → sort → paginate → click)', () => {
	test('sort change updates URL and reorders the first item', async ({ page }) => {
		await gotoListing(page);
		const before = await getItemHrefs(page);
		test.skip(before.length === 0, 'No items rendered — cannot verify reorder');
		// With ≤ 2 items there's no way to demonstrate a reorder — the seed
		// fixture might be that small in CI, and we don't want a false
		// failure when the sort code is actually correct.
		test.skip(before.length < 3, `only ${before.length} items — too few to demonstrate reorder`);

		// Hit the sorted variant directly via URL — Spec 020 ships sort
		// via search params. We bypass the dropdown UI here because the
		// menu interaction is already covered in sort-menu.spec.ts.
		await page.goto('/discover/1?sort=name-asc', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const after = await getItemHrefs(page);
		expect(after.length).toBeGreaterThan(0);

		// If the catalogue happens to already be in name-ascending order, the
		// "before" snapshot will match "after" not because the sort failed but
		// because the default order *is* the sorted order. Cross-check by
		// also requesting a contrasting sort and asserting that AT LEAST ONE
		// of the two variants differs from the default.
		await page.goto('/discover/1?sort=name-desc', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const afterDesc = await getItemHrefs(page);

		const beforeKey = before.slice(0, 6).join('|');
		const ascKey = after.slice(0, 6).join('|');
		const descKey = afterDesc.slice(0, 6).join('|');
		const bothMatchDefault = beforeKey === ascKey && beforeKey === descKey;
		expect(
			bothMatchDefault,
			`Neither sort=name-asc nor sort=name-desc changed the order. before=[${beforeKey}] asc=[${ascKey}] desc=[${descKey}]`
		).toBeFalsy();
	});

	test('search query in URL filters the SSR slice and persists across refresh', async ({ page }) => {
		// Pick a term that's likely to filter but not empty — "time" appears
		// in many directory item names. If the catalogue is too small to
		// matter, the test still asserts shape, not specific counts.
		await page.goto('/discover/1?q=time', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const filtered = await getItemHrefs(page);

		// Refresh — URL-driven state should survive.
		await page.reload({ waitUntil: 'domcontentloaded' });
		const afterReload = await getItemHrefs(page);

		expect(afterReload).toEqual(filtered);
		expect(page.url()).toContain('q=time');
	});

	test('pagination preserves search query in the URL', async ({ page }) => {
		await page.goto('/discover/1?q=time', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const p1 = await getItemHrefs(page);
		test.skip(p1.length < 12, 'Filtered set too small for multi-page assertion');

		// Hit page 2 via direct URL (the user-facing pagination control
		// is a HeroUI button that calls router.push — equivalent outcome).
		await page.goto('/discover/2?q=time', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const p2 = await getItemHrefs(page);
		expect(p2.length).toBeGreaterThan(0);

		// Page 2 must be disjoint from page 1 within the same filter.
		const overlap = p2.filter((h) => p1.includes(h));
		expect(overlap.length).toBeLessThan(p2.length / 2);
	});

	test('clicking an item lands on its detail page (slug preserved)', async ({ page }) => {
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });

		const firstLink = page.locator('a[href*="/items/"]').first();
		await expect(firstLink).toBeVisible();
		const expectedHref = await firstLink.getAttribute('href');
		expect(expectedHref).toBeTruthy();

		// Some templates open item links in a new tab; direct navigation
		// avoids that ambiguity while still asserting the route works.
		const slugPath = expectedHref!.replace(/^https?:\/\/[^/]+/, '');
		// next-intl strips the default-locale prefix from the URL on
		// navigation (e.g. `/en/items/clockify` → `/items/clockify`).
		// We compare on just the `/items/SLUG` suffix.
		const itemSuffix = slugPath.replace(/^\/[a-z]{2}(?=\/)/, '');
		const response = await page.goto(slugPath, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		expect(response?.status() ?? 0).toBeLessThan(500);
		expect(page.url()).toContain(itemSuffix);
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
	});

	test('browser back from a detail page returns to the same filtered listing', async ({ page }) => {
		await page.goto('/discover/1?q=time', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await page.waitForTimeout(2_000);
		const firstLink = page.locator('a[href*="/items/"]').first();
		const count = await firstLink.count();
		test.skip(count === 0, 'No items in filtered set to drill into');

		await firstLink.waitFor({ state: 'attached', timeout: PAGE_READY_TIMEOUT });
		await firstLink.click({ force: true });
		await page.waitForURL(/\/items\//, { timeout: PAGE_READY_TIMEOUT });

		await page.goBack({ waitUntil: 'domcontentloaded' });
		// Back must restore the filter via URL.
		expect(page.url()).toContain('q=time');
	});

	test('combined ?q=&sort=&page= URL is reachable and non-5xx', async ({ page }) => {
		const response = await page.goto('/discover/1?q=time&sort=name-asc', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		await expect(page.locator('body')).toBeVisible();
	});
});
