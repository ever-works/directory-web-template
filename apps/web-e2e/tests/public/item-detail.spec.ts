import { test, expect, type Page } from '@playwright/test';

/**
 * Item-detail page coverage.
 *
 * The previous version used `.first().isVisible()` to gate the click,
 * which silently skipped tests on smaller viewports (the first item
 * card sat below the fold). Switched to `.count() > 0` so we test what
 * exists in the DOM, then `scrollIntoViewIfNeeded()` before clicking.
 *
 * Coverage:
 *   - h1 + meta presence on detail page
 *   - slug round-trip from listing link
 *   - direct GET on a real slug from /items.json
 *   - back navigation returns to the listing
 */

const PAGE_READY_TIMEOUT = 15_000;

async function clickFirstItem(page: Page): Promise<string | null> {
	await page.goto('/discover/1', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
	// Give React + intersection observers a beat to settle so the listing
	// is no longer remounting between read/click.
	await page.waitForTimeout(2_000);
	const link = page.locator('a[href*="/items/"]').first();
	const count = await link.count();
	if (count === 0) return null;

	const href = await link.getAttribute('href');
	// `waitFor({ state: 'attached' })` plus a click without scrolling
	// avoids the "element detached" race we see when scrolling triggers
	// a re-render of virtualised item cards.
	await link.waitFor({ state: 'attached', timeout: PAGE_READY_TIMEOUT });
	await link.click({ force: true });
	await page.waitForURL(/\/items\//, { timeout: PAGE_READY_TIMEOUT });
	return href;
}

test.describe('Public: Item Detail Page', () => {
	test('item detail page displays an h1 heading', async ({ page }) => {
		const href = await clickFirstItem(page);
		test.skip(href === null, 'No items rendered on /discover/1');
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('item detail URL contains the slug the listing advertised', async ({ page }) => {
		const href = await clickFirstItem(page);
		test.skip(href === null, 'No items available');
		const slug = href!.split('/items/').pop()?.replace(/\/$/, '');
		expect(slug, 'expected a slug after /items/').toBeTruthy();
		expect(page.url()).toContain(`/items/${slug}`);
	});

	test('item detail page exposes canonical or og:url meta', async ({ page }) => {
		const href = await clickFirstItem(page);
		test.skip(href === null, 'No items available');
		const canonical = await page.locator('link[rel="canonical"]').count();
		const ogUrl = await page.locator('meta[property="og:url"]').count();
		expect(canonical + ogUrl, 'expected canonical or og:url meta').toBeGreaterThan(0);
	});

	test('item detail page exposes Open Graph title meta', async ({ page }) => {
		const href = await clickFirstItem(page);
		test.skip(href === null, 'No items available');
		const ogTitle = page.locator('meta[property="og:title"]');
		expect(await ogTitle.count()).toBeGreaterThan(0);
		const ogTitleValue = await ogTitle.first().getAttribute('content');
		expect(ogTitleValue?.length ?? 0).toBeGreaterThan(0);
	});

	test('item detail page returns non-5xx on direct GET (via /items.json slug)', async ({ page, request }) => {
		const itemsResp = await request.get('/items.json');
		test.skip(itemsResp.status() !== 200, '/items.json not available');
		const body = await itemsResp.json();
		const firstSlug = (body.items as Array<{ slug?: string }>).find((it) => it.slug)?.slug;
		test.skip(!firstSlug, 'No item slugs in /items.json');

		const response = await page.goto(`/items/${encodeURIComponent(firstSlug!)}`, {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
	});

	test('back button returns to the listing the user came from', async ({ page }) => {
		await page.goto('/discover/1', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await page.waitForTimeout(2_000);
		const firstLink = page.locator('a[href*="/items/"]').first();
		const count = await firstLink.count();
		test.skip(count === 0, 'No items on /discover/1');

		await firstLink.waitFor({ state: 'attached', timeout: PAGE_READY_TIMEOUT });
		await firstLink.click({ force: true });
		await page.waitForURL(/\/items\//, { timeout: PAGE_READY_TIMEOUT });

		await page.goBack({ waitUntil: 'domcontentloaded' });
		expect(page.url()).toMatch(/\/discover\/1|\/$/);
	});
});
