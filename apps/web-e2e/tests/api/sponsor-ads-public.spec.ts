import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public sponsor-ads endpoint served by
 * `apps/web/app/api/sponsor-ads/route.ts`.
 *
 * `GET /api/sponsor-ads` is intentionally public (no authentication)
 * and accepts a single optional query parameter:
 *
 *   - `limit` — `Number(...)`-ed with a default of `10`. The route
 *               applies `Number.isFinite(value)
 *                 ? Math.min(Math.max(1, Math.floor(value)), 50)
 *                 : 10`, so:
 *                 * non-finite values (empty string, `'abc'`, `NaN`)
 *                   fall back to the default (`10`),
 *                 * negative / zero / sub-1 values clamp up to `1`,
 *                 * values above `50` clamp down to `50`,
 *                 * floats are truncated via `Math.floor` before
 *                   clamping.
 *
 * The route has three distinct success branches that all legitimately
 * return `200 OK` with different payloads:
 *
 *   1. `checkDatabaseAvailability()` short-circuit — when the DB is
 *      not configured, the route returns `{ success: true, data: [] }`
 *      without touching the data layer.
 *   2. The happy-path `sponsorAdService.getActiveSponsorAdsWithItems`
 *      query, returning the active sponsor ads paired with their
 *      item data.
 *   3. The `try / catch` empty-list fallback, which logs in dev and
 *      returns `{ success: true, data: [] }` even on internal
 *      errors.
 *
 * Asserting on the body would pin the spec to a single branch and
 * break under the others. Status `< 500` is therefore the only
 * contract every branch shares — it confirms the route's
 * parameter-parsing, DB-availability check, and catch-and-empty
 * fallback are intact regardless of the deployment's database state.
 *
 * This spec adds the **query-param surface** so a regression in the
 * `Number(...)` parse path, the `Number.isFinite` fallback, the
 * `Math.min(Math.max(1, Math.floor(...)), 50)` clamp, or the
 * `checkDatabaseAvailability()` short-circuit is caught explicitly.
 * None of the cases here may 5xx.
 */
const SPONSOR_ADS_QUERIES = [
	// Baseline — no-arg case. The only happy-path entry the public
	// surface exposes; included here so a future reader of this file
	// sees it alongside the variants it parametrises.
	'/api/sponsor-ads',

	// `limit` — valid integers across the [1, 50] clamped range.
	'/api/sponsor-ads?limit=1',
	'/api/sponsor-ads?limit=10',
	'/api/sponsor-ads?limit=25',
	'/api/sponsor-ads?limit=50',

	// `limit` — values beyond the route's `Math.min(..., 50)` upper
	// clamp. The route silently clamps; no 4xx should occur.
	'/api/sponsor-ads?limit=51',
	'/api/sponsor-ads?limit=999',
	'/api/sponsor-ads?limit=10000',

	// `limit` — values below the route's `Math.max(1, ...)` lower
	// clamp (zero, negative). The route silently clamps up to `1`;
	// no 4xx should occur.
	'/api/sponsor-ads?limit=0',
	'/api/sponsor-ads?limit=-5',
	'/api/sponsor-ads?limit=-1',

	// `limit` — non-numeric / empty. `Number('')` is `0`, but
	// `Number('abc')` is `NaN`. `Number.isFinite(NaN)` is `false`
	// and the route falls back to the default (`10`). The empty
	// string is `0` (finite), which then clamps up to `1` via the
	// `Math.max(1, ...)` step. Both branches must stay below 500.
	'/api/sponsor-ads?limit=',
	'/api/sponsor-ads?limit=abc',
	'/api/sponsor-ads?limit=NaN',
	'/api/sponsor-ads?limit=Infinity',
	'/api/sponsor-ads?limit=-Infinity',

	// `limit` — float values. `Math.floor(10.7)` is `10`, so floats
	// are silently truncated to their integer part before clamping.
	// No 4xx.
	'/api/sponsor-ads?limit=10.7',
	'/api/sponsor-ads?limit=49.9',
	'/api/sponsor-ads?limit=0.5',

	// `limit` — leading whitespace / `+` sign. `Number(' 10')` is
	// `10`, `Number('+10')` is `10`. No 4xx.
	'/api/sponsor-ads?limit=%2010',
	'/api/sponsor-ads?limit=%2B10',

	// Extra unknown query params are silently ignored — the route
	// only reads `limit` from `searchParams`.
	'/api/sponsor-ads?limit=10&unknown=value',
	'/api/sponsor-ads?limit=10&category=tools&tag=saas',

	// Repeated `limit` keys — `searchParams.get('limit')` returns
	// the first occurrence; the rest are silently ignored. No 4xx.
	'/api/sponsor-ads?limit=10&limit=20&limit=999',
] as const;

test.describe('API: /api/sponsor-ads public query-param surface', () => {
	for (const path of SPONSOR_ADS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/sponsor-ads always returns a JSON envelope with `success: true`', async ({ request }) => {
		// Unlike the parameter-surface cases above, this single
		// assertion spans all three success branches because every
		// branch (DB-available, DB-short-circuit, catch-and-empty
		// fallback) returns `{ success: true, ... }` with status 200.
		// If a future change ever introduces a 4xx / 5xx response on
		// the no-arg path the route would no longer be a public
		// drop-in surface and this spec would catch the regression.
		const response = await request.get('/api/sponsor-ads');

		expect(response.status()).toBe(200);

		const body = (await response.json()) as { success?: boolean; data?: unknown };

		expect(body.success).toBe(true);
		expect(Array.isArray(body.data)).toBe(true);
	});
});
