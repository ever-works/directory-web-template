import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public per-survey detail page
 * `/surveys/[slug]`. The route resolves a survey by slug and falls
 * through to `notFound()` when `surveyService.getBySlug(...)` returns
 * `null` or the surveys feature is disabled.
 *
 * Same "non-5xx contract" as the rest of the smoke layer — the page
 * must respond with a 4xx / 3xx (typically a 404 render) for an
 * unknown slug, but never crash.
 *
 * Complements:
 *   - `tests/public/surveys.spec.ts` — `/surveys` listing.
 *   - `tests/public/item-survey-public.spec.ts` —
 *     `/items/[slug]/surveys/[surveySlug]` per-item survey-response page.
 *   - `tests/public/dashboard-surveys-protected.spec.ts` — owner
 *     `/dashboard/items/[itemId]/surveys/...` flow.
 *   - `tests/public/admin-by-id-pages-protected.spec.ts` — admin
 *     `/admin/surveys/[slug]/{edit,preview,responses}` pages.
 *   - `tests/api/surveys.spec.ts` — `/api/surveys/[surveyId]` REST
 *     surface.
 *
 * This closes the last public-survey page surface that was implicit
 * rather than explicit.
 */
const SMOKE_SLUG = '__smoke-unknown-survey__';

const PER_SURVEY_PUBLIC_PAGES = [`/surveys/${SMOKE_SLUG}`] as const;

test.describe('Public: per-survey detail page does not 5xx for unknown slugs', () => {
	for (const path of PER_SURVEY_PUBLIC_PAGES) {
		test(`GET ${path} responds without a server error`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

			expect(response?.status()).toBeLessThan(500);
			await expect(page.locator('body')).toBeVisible();
		});
	}
});
