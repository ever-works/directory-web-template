import { test, expect, type Page } from '@playwright/test';

/**
 * Item-detail page coverage.
 *
 * The original spec verified the page renders an h1 and a body. This
 * version also pins:
 *   - The slug in the URL matches the link clicked from the listing.
 *   - The page exposes structured-data anchors (canonical, og:title).
 *   - Direct GET on a real slug returns non-5xx.
 *   - Back navigation returns to the originating listing.
 */

const PAGE_READY_TIMEOUT = 15_000;

async function gotoFirstItem(page: Page): Promise<string | null> {
	await page.goto('/discover/1', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
	const link = page.locator('a[href*="/items/"]').first();
	const visible = await link.isVisible().catch(() => false);
	if (!visible) return null;
	const href = await link.getAttribute('href');
	await link.click();
	await page.waitForURL(/\/items\//, { timeout: PAGE_READY_TIMEOUT });
	return href;
}

test.describe('Public: Item Detail Page', () => {
	test('item detail page displays an h1 heading', async ({ page }) => {
		const href = await gotoFirstItem(page);
		test.skip(href === null, 'No items available');
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('item detail URL contains the slug the listing advertised', async ({ page }) => {
		const href = await gotoFirstItem(page);
		test.skip(href === null, 'No items available');
		const slug = href!.split('/items/').pop()?.replace(/\/$/, '');
		expect(slug, 'expected a slug after /items/').toBeTruthy();
		expect(page.url()).toContain(`/items/${slug}`);
	});

	test('item detail page advertises a canonical / og:url meta tag', async ({ page }) => {
		const href = await gotoFirstItem(page);
		test.skip(href === null, 'No items available');

		// Either rel="canonical" OR og:url should be present.
		const canonical = await page.locator('link[rel="canonical"]').count();
		const ogUrl = await page.locator('meta[property="og:url"]').count();
		expect(canonical + ogUrl, 'expected canonical or og:url meta').toBeGreaterThan(0);
	});

	test('item detail page returns non-5xx on direct GET', async ({ page, request }) => {
		// Get a real slug via the public items dump if available.
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
		const firstLink = page.locator('a[href*="/items/"]').first();
		const visible = await firstLink.isVisible().catch(() => false);
		test.skip(!visible, 'No items on /discover/1');

		await firstLink.click();
		await page.waitForURL(/\/items\//, { timeout: PAGE_READY_TIMEOUT });

		await page.goBack({ waitUntil: 'domcontentloaded' });
		expect(page.url()).toMatch(/\/discover\/1|\/$/);
	});
});
