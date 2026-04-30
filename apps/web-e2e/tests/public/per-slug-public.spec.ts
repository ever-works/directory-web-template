import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public per-slug detail pages that take a
 * single dynamic segment. We hit each with a slug that is intentionally
 * missing so the page exercises its `notFound()` / disabled-feature
 * branch:
 *
 *   - `/comparisons/[slug]` — per-comparison MDX page; `notFound()`
 *     when `getCachedComparison()` returns `null`.
 *   - `/categories/[category]` — single-segment category listing;
 *     `notFound()` when the category feature is disabled or the
 *     resolved id matches no items.
 *   - `/tags/[tag]` — single-segment tag listing; `notFound()` when
 *     the tags feature is disabled or no items match.
 *
 * Same "non-5xx contract" as the rest of the smoke layer — the page
 * must respond with a 4xx / 3xx (typically a 404 render) but never
 * crash. This complements the legacy `(listing)` versions covered by
 * `legacy-routing.spec.ts`.
 */
const SMOKE_SLUG = '__smoke-unknown__';

const PER_SLUG_PUBLIC_PAGES = [
	`/comparisons/${SMOKE_SLUG}`,
	`/categories/${SMOKE_SLUG}`,
	`/tags/${SMOKE_SLUG}`,
] as const;

test.describe('Public: per-slug detail pages do not 5xx for unknown slugs', () => {
	for (const path of PER_SLUG_PUBLIC_PAGES) {
		test(`GET ${path} responds without a server error`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

			expect(response?.status()).toBeLessThan(500);
			await expect(page.locator('body')).toBeVisible();
		});
	}
});
