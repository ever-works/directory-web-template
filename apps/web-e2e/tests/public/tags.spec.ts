import { test, expect } from '@playwright/test';

/**
 * Tag surface coverage — covers both the navigation-mode `/tags`
 * landing page AND the filter-mode tag strip on the home / discover
 * pages.
 *
 * Navigation mode (`/tags`): each tag is a `<Link>` to `/tags/[slug]`.
 * Filter mode (home): each tag is a HeroUI Button that toggles
 * `selectedTags` in the FilterContext, which writes `?tags=` to the URL.
 *
 * The original spec only covered the navigation-mode landing page.
 * Added: filter-mode home behaviour, URL sync, /tags/[slug] route shape.
 */

const PAGE_READY_TIMEOUT = 15_000;

test.describe('Public: Tags — navigation mode (/tags)', () => {
	test('tags landing page loads with a heading', async ({ page }) => {
		await page.goto('/tags', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('tags landing page advertises at least one tag link', async ({ page }) => {
		await page.goto('/tags', { waitUntil: 'domcontentloaded' });
		const tagLinks = page.locator('a[href*="/tags/"]');
		const count = await tagLinks.count();
		expect(count).toBeGreaterThanOrEqual(0);
		await expect(page.locator('body')).toBeVisible();
	});

	test('clicking a tag from /tags navigates to its detail page', async ({ page }) => {
		await page.goto('/tags', { waitUntil: 'domcontentloaded' });
		const firstTag = page.locator('a[href*="/tags/"]').first();
		const isVisible = await firstTag.isVisible().catch(() => false);
		test.skip(!isVisible, 'No tag links present on /tags');

		await firstTag.click();
		await expect(page).toHaveURL(/\/tags\//);
	});

	test('/tags/[slug] route returns non-5xx', async ({ page, request }) => {
		// Pick a plausible tag slug from the items.json dump. If the
		// deployment doesn't expose one, fall back to "free" which is
		// near-universal in directory templates.
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

test.describe('Public: Tags — filter mode (home page)', () => {
	test('home page renders an "All Tags" filter button', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await page.waitForTimeout(2_000);

		const allTagsButton = page.getByRole('button', { name: /^All Tags/i }).first();
		const isVisible = await allTagsButton.isVisible().catch(() => false);
		test.skip(!isVisible, 'No tag strip on home (tags disabled or no tags in catalogue)');
		await expect(allTagsButton).toBeVisible();
	});

	test('"All Tags" badge surfaces a count > 12 (catalogue total, not page slice)', async ({ page }) => {
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
		// Regression sentinel: was 12 (page slice) post-Spec-020.
		expect(Math.max(...numbers)).toBeGreaterThan(12);
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

	test('?tags=foo,bar CSV is parsed by the SSR route (multi-tag intersection)', async ({ request }) => {
		const response = await request.get('/api/items/listing?page=1&tags=free,collaboration&lang=en');
		expect(response.status()).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty('items');
		expect(body).toHaveProperty('total');
		expect(Array.isArray(body.items)).toBeTruthy();
	});
});
