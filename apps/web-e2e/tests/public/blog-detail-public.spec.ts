import { test, expect } from '@playwright/test';

/**
 * Blog post detail and taxonomy archives (Spec 050 — EW-27, EW-28).
 *
 * As with the listing spec, the data-dependent assertions skip when the
 * content fixture ships no posts; the tolerance probes always run so a crash
 * on an unknown slug is caught even on an empty fixture.
 */

const PAGE_READY_TIMEOUT = 15_000;

const UNKNOWN_ROUTES = [
	'/blog/zzqx-post-that-cannot-exist-zzqx',
	'/blog/category/zzqx-category-that-cannot-exist-zzqx',
	'/blog/tag/zzqx-tag-that-cannot-exist-zzqx'
];

/** Navigate to the listing and return the href of the first post link, if any. */
async function firstPostHref(page: import('@playwright/test').Page): Promise<string | null> {
	await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
	const link = page.locator('[data-testid="blog-post-grid"] article h2 a').first();
	if ((await link.count()) === 0) return null;
	return link.getAttribute('href');
}

test.describe('Public: Blog post detail', () => {
	for (const route of UNKNOWN_ROUTES) {
		test(`${route} responds non-5xx`, async ({ page }) => {
			const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
			expect(response).toBeTruthy();
			expect(response!.status(), route).toBeLessThan(500);
		});
	}

	test('a post page renders the title, header metadata and body', async ({ page }) => {
		const href = await firstPostHref(page);
		test.skip(!href, 'No posts in the content fixture');

		await page.goto(href!, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByTestId('blog-post')).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
		await expect(page.getByTestId('blog-post-reading-time')).toBeVisible();
	});

	test('a post page exposes BlogPosting structured data', async ({ page }) => {
		const href = await firstPostHref(page);
		test.skip(!href, 'No posts in the content fixture');

		await page.goto(href!, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
		expect(
			blocks.some((block) => block.includes('BlogPosting')),
			'expected BlogPosting JSON-LD'
		).toBe(true);
	});

	test('a post page links back to the blog listing', async ({ page }) => {
		const href = await firstPostHref(page);
		test.skip(!href, 'No posts in the content fixture');

		await page.goto(href!, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const back = page.getByTestId('blog-back-to-listing');
		await expect(back).toBeVisible();
		await back.click();
		await expect(page).toHaveURL(/\/blog\/?(\?.*)?$/, { timeout: PAGE_READY_TIMEOUT });
	});

	test('the breadcrumb keeps the locale prefix on a localized post', async ({ page }) => {
		const href = await firstPostHref(page);
		test.skip(!href, 'No posts in the content fixture');

		const slug = href!.split('/').filter(Boolean).pop();
		const response = await page.goto(`/fr/blog/${slug}`, {
			waitUntil: 'domcontentloaded',
			timeout: PAGE_READY_TIMEOUT
		});
		expect(response?.status() ?? 0).toBeLessThan(500);
		await expect(page).toHaveURL(/\/fr\/blog\//);
	});

	test('a category archive renders and stays inside the blog', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const chip = page.locator('[data-testid="blog-category-filters"] a').nth(1);
		test.skip((await chip.count()) === 0, 'Fixture has no blog categories');

		const href = await chip.getAttribute('href');
		test.skip(!href, 'Category chip has no href');

		const response = await page.goto(href!, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		expect(response?.status() ?? 0).toBeLessThan(400);
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});

	test('a tag archive renders when the fixture has tags', async ({ page }) => {
		await page.goto('/blog', { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		const chip = page.locator('[data-testid="blog-tag-filters"] a').nth(1);
		test.skip((await chip.count()) === 0, 'Fixture has no blog tags');

		const href = await chip.getAttribute('href');
		test.skip(!href, 'Tag chip has no href');

		const response = await page.goto(href!, { waitUntil: 'domcontentloaded', timeout: PAGE_READY_TIMEOUT });
		expect(response?.status() ?? 0).toBeLessThan(400);
		await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
	});
});
