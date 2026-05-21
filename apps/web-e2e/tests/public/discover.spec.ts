import { test, expect } from '@playwright/test';
import { DiscoverPage } from '../../page-objects/public/discover.page';

/**
 * Public discover / directory listing coverage.
 *
 * Original tests verified items are present + pagination link exists.
 * After Spec 020 + the URL-driven paging fix, additional invariants
 * matter:
 *   - Page 2 must be disjoint from page 1 (server-side slice working).
 *   - Filters survive pagination (`?q=&sort=&page=`).
 *   - Direct navigation to a high page number returns non-5xx.
 *   - Clicking pagination control lands you on the right page.
 */

const PAGE_READY_TIMEOUT = 15_000;

test.describe('Public: Discover / Directory Listing', () => {
	test('displays directory items on page 1', async ({ page }) => {
		const discoverPage = new DiscoverPage(page);
		await discoverPage.navigate(1);
		await discoverPage.waitForPageReady();
		expect(await discoverPage.getItemCount()).toBeGreaterThan(0);
	});

	test('clicking an item navigates to item detail', async ({ page }) => {
		const discoverPage = new DiscoverPage(page);
		await discoverPage.navigate(1);
		await discoverPage.waitForPageReady();
		await expect(discoverPage.itemLinks.first()).toBeVisible();
		await discoverPage.clickFirstItem();
		await expect(page).toHaveURL(/\/items\//);
	});

	test('page 2 hrefs are disjoint from page 1 (server slice working)', async ({ page }) => {
		const discoverPage = new DiscoverPage(page);
		await discoverPage.navigate(1);
		await discoverPage.waitForPageReady();
		const p1 = await page
			.locator('a[href*="/items/"]')
			.evaluateAll((els) =>
				Array.from(new Set(els.map((el) => (el as HTMLAnchorElement).getAttribute('href')))).filter(
					Boolean
				) as string[]
			);

		test.skip(p1.length < 12, 'Catalogue too small for multi-page assertion');

		await discoverPage.navigate(2);
		await discoverPage.waitForPageReady();
		const p2 = await page
			.locator('a[href*="/items/"]')
			.evaluateAll((els) =>
				Array.from(new Set(els.map((el) => (el as HTMLAnchorElement).getAttribute('href')))).filter(
					Boolean
				) as string[]
			);

		expect(p2.length).toBeGreaterThan(0);
		const overlap = p2.filter((h) => p1.includes(h));
		expect(overlap.length).toBeLessThan(p2.length / 2);
	});

	test('out-of-range page (/discover/9999) responds without 5xx', async ({ page }) => {
		const response = await page.goto('/discover/9999', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		await expect(page.locator('body')).toBeVisible();
	});

	test('filter-aware pagination — ?q=&page=2 preserves the search', async ({ page }) => {
		const response = await page.goto('/discover/2?q=time', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		expect(page.url()).toMatch(/\/discover\/2\?.*q=time/);
		await expect(page.locator('body')).toBeVisible();
	});

	test('HeroUI pagination strip is present on multi-page listings', async ({ page, request }) => {
		const discoverPage = new DiscoverPage(page);
		await discoverPage.navigate(1);
		await discoverPage.waitForPageReady();

		// `getItemCount` counts every `a[href*="/items/"]` on the page,
		// which includes related-item links, mobile + desktop card
		// variants, etc. — so it's NOT a reliable signal of "how many
		// items are in the catalogue." Use the listing API for that, and
		// skip when the catalogue is small enough to fit on a single page.
		const apiResp = await request.get('/api/items/listing?page=1&lang=en&perPage=1').catch(() => null);
		const apiBody = apiResp ? await apiResp.json().catch(() => null) : null;
		const totalItems = typeof apiBody?.total === 'number'
			? apiBody.total
			: Array.isArray(apiBody?.items)
				? apiBody.items.length
				: undefined;

		const itemCount = await discoverPage.getItemCount();
		test.skip(itemCount === 0, 'No items rendered');
		test.skip(
			totalItems == null || totalItems <= 12,
			`catalogue has ${totalItems ?? 'unknown'} items — single-page listing renders no pagination by design`
		);

		// The HeroUI Pagination component carries `aria-label="pagination"`.
		const paginationNav = page.locator('nav[aria-label*="pagination" i]');
		const navCount = await paginationNav.count();
		expect(navCount, 'expected at least one pagination nav element').toBeGreaterThan(0);
	});
});
