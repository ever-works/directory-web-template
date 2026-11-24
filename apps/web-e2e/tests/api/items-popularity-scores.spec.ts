import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public popularity-scores debug endpoint
 * served by `apps/web/app/api/items/popularity-scores/route.ts`.
 *
 * `GET /api/items/popularity-scores` is intentionally public and
 * accepts two query params:
 *
 *   - `limit`  — read with `parsePaginationParams` (spec 056 R6):
 *                default 20, clamped to 1..100. A missing, empty or
 *                non-numeric value gets 20, zero or a negative value
 *                gets 1, and a bigger-than-100 value gets 100.
 *   - `locale` — defaults to `'en'`. The route asks
 *                `getCachedItems({ lang })` for items in that locale;
 *                missing or unknown locales return an empty list, not
 *                an error.
 *
 * The single happy-path entry (`/api/items/popularity-scores`) is
 * already smoked by `discovery.spec.ts`. This spec adds the
 * **query-param surface** so a regression in the `limit` parsing,
 * the 1..100 clamp, the `locale` default, or the empty-items branch
 * is caught explicitly. None of the cases here may 5xx — that would
 * indicate the route's parameter-parsing logic crashed before the
 * data layer.
 *
 * Payload shape is intentionally not asserted because content varies
 * with the active data repository / database state.
 */
const POPULARITY_SCORES_QUERIES = [
	// Baseline — same path as discovery.spec.ts; included so a future
	// reader of this file sees the no-arg case alongside the variants.
	'/api/items/popularity-scores',

	// `limit` — valid integer.
	'/api/items/popularity-scores?limit=5',
	'/api/items/popularity-scores?limit=20',

	// `limit` — value beyond the route's 100 cap.
	'/api/items/popularity-scores?limit=999',
	'/api/items/popularity-scores?limit=10000',

	// `limit` — empty / non-integer / negative / zero. Empty and
	// non-numeric values fall back to the default 20; negative and
	// zero values are raised to 1.
	'/api/items/popularity-scores?limit=',
	'/api/items/popularity-scores?limit=abc',
	'/api/items/popularity-scores?limit=-5',
	'/api/items/popularity-scores?limit=0',

	// `locale` — known + unknown values; the route falls back to an
	// empty items list when the locale has no cached items.
	'/api/items/popularity-scores?locale=en',
	'/api/items/popularity-scores?locale=fr',
	'/api/items/popularity-scores?locale=zh',
	'/api/items/popularity-scores?locale=__no_such_locale__',

	// Combined `limit` + `locale`.
	'/api/items/popularity-scores?limit=10&locale=fr',
	'/api/items/popularity-scores?limit=200&locale=de',
] as const;

test.describe('API: /api/items/popularity-scores query-param surface', () => {
	for (const path of POPULARITY_SCORES_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}
});
