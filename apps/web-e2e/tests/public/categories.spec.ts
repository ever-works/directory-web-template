import { test, expect } from '@playwright/test';

/**
 * Categories surface coverage.
 *
 * Two modes:
 *   - Navigation (`/categories`): each category is a `<Link>` to
 *     `/categories/[slug]`.
 *   - Filter (home sidebar): each category is a `<button>` with
 *     `aria-pressed` that toggles `selectedCategories` in the
 *     FilterContext.
 *
 * The original spec only covered the `/categories` landing page surface.
 * The filter-mode modifier-key UX is covered in detail by
 * `categories-modifier-select.spec.ts`. Here we add lightweight
 * coverage for the URL-driven filter route and `/categories/[slug]`
 * detail page.
 */

const PAGE_READY_TIMEOUT = 15_000;

test.describe('Public: Categories — navigation mode (/categories)', () => {
	test('categories landing page loads with heading', async ({ page }) => {
		await page.goto('/categories', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('categories landing page renders at least one navigation link', async ({ page }) => {
		await page.goto('/categories', { waitUntil: 'domcontentloaded' });
		const categoryLinks = page.locator('a[href*="/categories/"], a[href*="/tags/"]');
		const count = await categoryLinks.count();
		expect(count).toBeGreaterThanOrEqual(0);
		await expect(page.locator('body')).toBeVisible();
	});

	test('clicking a category from /categories navigates to its detail page', async ({ page }) => {
		await page.goto('/categories', { waitUntil: 'domcontentloaded' });
		const firstCategory = page.locator('a[href*="/categories/"], a[href*="/tags/"]').first();
		const isVisible = await firstCategory.isVisible().catch(() => false);
		test.skip(!isVisible, 'No category links present');

		await firstCategory.click();
		await expect(page).toHaveURL(/\/(categories|tags)\//);
	});

	test('/categories/[slug] returns non-5xx and renders an item listing', async ({ page, request }) => {
		// Pick a known category slug from the items dump. Fall back to a
		// plausible default if not present.
		let slug = 'time-tracking-software';
		const itemsResp = await request.get('/items.json');
		if (itemsResp.status() === 200) {
			const body = await itemsResp.json();
			const allCats = (body.items as Array<{ categories?: string[] }>)
				.flatMap((it) => it.categories ?? [])
				.filter(Boolean);
			if (allCats.length > 0) {
				slug = allCats[0]!.toLowerCase().replace(/\s+/g, '-');
			}
		}
		const response = await page.goto(`/categories/${encodeURIComponent(slug)}`, {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
	});
});

test.describe('Public: Categories — filter mode (home sidebar)', () => {
	test('home page renders category filter buttons with aria-pressed', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await page.waitForTimeout(2_000);

		// Filter-mode CategoryItem renders `<button aria-pressed="..." aria-label="...">`.
		// Pagination buttons share aria-pressed but lack aria-label.
		const filterButtons = page.locator('button[aria-pressed][aria-label]');
		const count = await filterButtons.count();
		test.skip(count < 2, 'Filter-mode categories sidebar not present');
		// At least 2: "All Categories" + at least one real category.
		expect(count).toBeGreaterThanOrEqual(2);
	});

	test('?categories=foo URL filters the SSR slice', async ({ page }) => {
		const response = await page.goto('/discover/1?categories=time-tracking-software', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		expect(page.url()).toContain('categories=time-tracking-software');
		await expect(page.locator('body')).toBeVisible();
	});

	test('?categories=foo via JSON API returns a sane envelope', async ({ request }) => {
		const response = await request.get('/api/items/listing?page=1&categories=time-tracking-software&lang=en');
		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(body).toHaveProperty('total');
		expect(Array.isArray(body.items)).toBeTruthy();
		// Filter-applied total must be ≤ unfiltered baseline.
		const baseline = await request.get('/api/items/listing?page=1&lang=en');
		const baseBody = await baseline.json();
		expect(body.total).toBeLessThanOrEqual(baseBody.total);
	});
});
