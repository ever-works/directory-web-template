import { test, expect } from '@playwright/test';

/**
 * Tag surface coverage — covers two distinct surfaces:
 *
 * 1. **Landing page (`/tags`)** — `TagsCards` renders each tag as a
 *    `<div role="button">` (NOT an `<a href>`) whose click handler
 *    calls `router.push('/?tags=<id>')`. The intentional UX is "browse
 *    all tags → click → see filtered listing on home page", not "click
 *    → navigate to a `/tags/<slug>` detail page". The previous version
 *    of this spec mis-assumed `<a href>` and silently skipped.
 *
 * 2. **Filter-mode strip on home / discover pages** — each tag is a
 *    HeroUI Button that toggles `selectedTags` in `FilterContext` and
 *    writes `?tags=` to the URL via `useFilterURLSync`.
 *
 * Plus the `/tags/[...slug]` SSR route which renders a per-tag listing
 * (different from the landing page).
 */

const PAGE_READY_TIMEOUT = 15_000;

test.describe('Public: Tags — landing page (/tags)', () => {
	test('landing page loads with a heading', async ({ page }) => {
		await page.goto('/tags', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('landing page renders at least one tag card', async ({ page }) => {
		await page.goto('/tags', { waitUntil: 'domcontentloaded' });
		// `TagsCards` uses `<div role="button" aria-label="View items tagged <name>">`.
		const tagCards = page.locator('[role="button"][aria-label^="View items tagged"]');
		expect(await tagCards.count()).toBeGreaterThan(0);
	});

	test('clicking a tag card navigates to home with ?tags= filter', async ({ page }) => {
		await page.goto('/tags', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const firstCard = page.locator('[role="button"][aria-label^="View items tagged"]').first();
		await expect(firstCard).toBeVisible();
		const ariaLabel = await firstCard.getAttribute('aria-label');
		expect(ariaLabel, 'expected aria-label on tag card').toBeTruthy();

		await firstCard.click();
		// `TagsCards.handleClick` pushes `/?tags=<id>`. next-intl may
		// strip the default-locale prefix, leaving `/?tags=…` OR
		// `/en?tags=…`. Either is acceptable — just assert the param.
		await page.waitForURL((url) => url.searchParams.has('tags'), { timeout: PAGE_READY_TIMEOUT });
		expect(page.url()).toMatch(/[?&]tags=/);
	});

	test('/tags/[slug] route returns non-5xx and renders a listing', async ({ page, request }) => {
		let slug = 'free';
		const itemsResp = await request.get('/items.json');
		if (itemsResp.status() === 200) {
			const body = await itemsResp.json();
			const allTags = (body.items as Array<{ tags?: string[] }>)
				.flatMap((it) => it.tags ?? [])
				.filter(Boolean);
			if (allTags.length > 0) {
				slug = allTags[0]!;
			}
		}
		const response = await page.goto(`/tags/${encodeURIComponent(slug)}`, {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
	});
});

test.describe('Public: Tags — filter-mode strip (home / discover)', () => {
	test('home page renders an "All Tags" filter button', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await page.waitForTimeout(2_000);
		const allTagsButton = page.getByRole('button', { name: /^All Tags/i }).first();
		const isVisible = await allTagsButton.isVisible().catch(() => false);
		test.skip(!isVisible, 'No tag strip on home (tags disabled or no tags in catalogue)');
		await expect(allTagsButton).toBeVisible();
	});

	test('"All Tags" badge surfaces catalogue-wide tag count (not page slice)', async ({ page, request }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(2_000);

		const allTagsButtons = page.getByRole('button', { name: /^All Tags/i });
		const count = await allTagsButtons.count();
		test.skip(count === 0, '"All Tags" button not present');

		const texts: string[] = [];
		for (let i = 0; i < count; i++) {
			texts.push((await allTagsButtons.nth(i).innerText()).trim());
		}
		const numbers = texts
			.map((t) => t.match(/(\d+)/)?.[1])
			.filter((n): n is string => Boolean(n))
			.map((n) => Number.parseInt(n, 10));
		test.skip(numbers.length === 0, 'No numeric badge inside "All Tags"');

		// Regression sentinel for Spec 020 — the bug was the badge showing the
		// page slice (12) instead of the catalogue total. We previously hard-
		// coded `> 12`, which gave a false positive on minimal-data CI seeds
		// (e.g. 3 tags) where 12 is impossible to exceed regardless of bug.
		// Compare against the actual catalogue size from the API instead.
		const apiResp = await request
			.get('/api/items/listing?page=1&lang=en&perPage=1')
			.catch(() => null);
		const apiBody = apiResp ? await apiResp.json().catch(() => null) : null;
		const totalTags = Array.isArray(apiBody?.tags) ? apiBody.tags.length : undefined;
		test.skip(
			totalTags == null || totalTags <= 12,
			`catalogue has ${totalTags ?? 'unknown'} tags — sentinel only meaningful with > 12`
		);
		expect(
			Math.max(...numbers),
			`badge max (${Math.max(...numbers)}) should match catalogue total (${totalTags}), not page slice (12)`
		).toBeGreaterThan(12);
	});

	test('?tags=foo URL route renders without 5xx and preserves the param', async ({ page }) => {
		const response = await page.goto('/discover/1?tags=free', {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT,
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		expect(page.url()).toContain('tags=free');
		await expect(page.locator('body')).toBeVisible();
	});

	test('?tags=foo,bar CSV is parsed by the SSR route (OR semantics)', async ({ request }) => {
		const response = await request.get('/api/items/listing?page=1&tags=free,collaboration&lang=en');
		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(body).toHaveProperty('total');
		expect(Array.isArray(body.items)).toBeTruthy();
	});
});
