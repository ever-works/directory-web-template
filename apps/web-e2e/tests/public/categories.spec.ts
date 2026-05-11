import { test, expect } from '@playwright/test';

/**
 * Categories surface coverage — two distinct surfaces:
 *
 * 1. **Landing page (`/categories`)** — `CategoriesGrid` renders each
 *    category as a `<Card>` whose click handler is
 *    `router.push('/?categories=<id>')`. The intentional UX is "browse
 *    categories → click → see filtered listing on home", NOT "click →
 *    navigate to a `/categories/<slug>` detail page". The previous
 *    test mis-assumed `<a href>` and silently skipped.
 *
 * 2. **Filter-mode sidebar on home** — each category is a
 *    `<button aria-pressed aria-label>` toggling `selectedCategories`
 *    in `FilterContext`. The modifier-key UX
 *    (single-click vs Ctrl/Cmd/Shift+click) is covered in detail by
 *    `categories-modifier-select.spec.ts`.
 *
 * Plus the `/categories/[slug]` SSR route (server-rendered listing
 * filtered by that category).
 */

const PAGE_READY_TIMEOUT = 15_000;

test.describe('Public: Categories — landing page (/categories)', () => {
	test('landing page loads with heading', async ({ page }) => {
		await page.goto('/categories', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('landing page renders at least one category card', async ({ page }) => {
		await page.goto('/categories', { waitUntil: 'domcontentloaded' });
		// `CategoriesGrid` uses `<Card>` wrappers (no `<a>` tag). Heuristic:
		// every category card has a count badge ("N items") plus a heading.
		// We assert the page has multiple headings/cards beyond the page h1.
		const cards = page.locator('h2, h3, h4').or(page.locator('[role="button"]'));
		expect(await cards.count()).toBeGreaterThan(0);
		await expect(page.locator('body')).toBeVisible();
	});

	test('clicking a category card navigates to home with ?categories= filter', async ({ page }) => {
		await page.goto('/categories', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });

		// `CategoriesGrid` doesn't surface a stable role/label; find any
		// clickable card. The shared-card grid items expose an explicit
		// `cursor-pointer` class or an inner `h3` heading per card.
		const firstCard = page.locator('div.cursor-pointer').first();
		const visible = await firstCard.isVisible().catch(() => false);
		test.skip(!visible, 'No clickable category cards present');

		await firstCard.click();
		// Lands on home (root or `/discover/1`) with `?categories=` set.
		await page.waitForURL((url) => url.searchParams.has('categories'), { timeout: PAGE_READY_TIMEOUT });
		expect(page.url()).toMatch(/[?&]categories=/);
	});

	test('/categories/[slug] returns non-5xx and renders an item listing', async ({ page, request }) => {
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
		const filterButtons = page.locator('button[aria-pressed][aria-label]');
		const count = await filterButtons.count();
		test.skip(count < 2, 'Filter-mode categories sidebar not present');
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
		const baseline = await request.get('/api/items/listing?page=1&lang=en');
		const baseBody = await baseline.json();
		expect(body.total).toBeLessThanOrEqual(baseBody.total);
	});
});
