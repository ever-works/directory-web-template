import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public featured-items endpoint's
 * **query-param surface** served by
 * `apps/web/app/api/featured-items/route.ts`.
 *
 * `GET /api/featured-items` is intentionally public and accepts
 * two query parameters (per the route's swagger block):
 *
 *   - `limit`          — `Number.parseInt`-ed with a default of `6`,
 *                        clamped via `Math.min(Math.max(value, 1), 50)`
 *                        when the parsed result is finite. Non-finite
 *                        values fall back to the default (`6`).
 *   - `includeExpired` — strict equality against the literal string
 *                        `'true'`. Anything else (`'false'`,
 *                        `'1'`, missing) keeps the default
 *                        (`includeExpired = false`) and the route
 *                        filters out items past their
 *                        `featured_until` date.
 *
 * The single happy-path entry (`/api/featured-items`) is already
 * smoked by [`items.spec.ts`](./items.spec.ts). This spec adds the
 * **query-param surface** so a regression in the `Number.parseInt`
 * path, the `Math.min(Math.max(...))` clamp, the `Number.isFinite`
 * fallback, the `includeExpired === 'true'` strict-string check, or
 * the `getTenantId() === null` short-circuit (which returns
 * `{ success: true, data: [], count: 0 }` without ever touching the
 * DB) is caught explicitly. None of the cases here may 5xx — that
 * would indicate the route's parameter-parsing or tenant-resolution
 * plumbing crashed before the response renderer or before the
 * try / catch's empty-list fallback fired.
 *
 * Payload shape is intentionally not asserted because content varies
 * with the active data repository / tenant / DB state and the route
 * has two distinct success branches (DB-available vs.
 * checkDatabaseAvailability-short-circuit) that both legitimately
 * return `200 OK` with different payloads. Status `< 500` is the
 * only contract every branch of the route shares.
 */
const FEATURED_ITEMS_QUERIES = [
	// Baseline — same path as items.spec.ts; included so a future
	// reader of this file sees the no-arg case alongside the variants
	// it parametrises.
	'/api/featured-items',

	// `limit` — valid integers across the [1, 50] clamped range.
	'/api/featured-items?limit=1',
	'/api/featured-items?limit=6',
	'/api/featured-items?limit=10',
	'/api/featured-items?limit=50',

	// `limit` — values beyond the route's `Math.min(..., 50)` upper
	// clamp. The route silently clamps; no 4xx should occur.
	'/api/featured-items?limit=51',
	'/api/featured-items?limit=999',
	'/api/featured-items?limit=10000',

	// `limit` — values below the route's `Math.max(..., 1)` lower
	// clamp (zero, negative). The route silently clamps; no 4xx
	// should occur.
	'/api/featured-items?limit=0',
	'/api/featured-items?limit=-5',

	// `limit` — non-numeric / empty. `Number.parseInt('abc', 10)`
	// returns `NaN`, `Number.isFinite(NaN)` is `false`, and the
	// route falls back to the default (`6`). Empty string parses to
	// `NaN` the same way.
	'/api/featured-items?limit=',
	'/api/featured-items?limit=abc',
	'/api/featured-items?limit=NaN',

	// `limit` — float values. `Number.parseInt('6.5', 10)` returns
	// `6`, so floats are silently truncated to their integer part
	// before clamping. No 4xx.
	'/api/featured-items?limit=6.5',
	'/api/featured-items?limit=49.9',

	// `limit` — leading whitespace / `+` sign. `Number.parseInt`
	// tolerates both. No 4xx.
	'/api/featured-items?limit=%2010',
	'/api/featured-items?limit=%2B10',

	// `includeExpired` — the only value that flips the default is
	// the literal string `'true'`. Every other value keeps the
	// default (filter out expired items).
	'/api/featured-items?includeExpired=true',
	'/api/featured-items?includeExpired=false',
	'/api/featured-items?includeExpired=1',
	'/api/featured-items?includeExpired=0',
	'/api/featured-items?includeExpired=',
	'/api/featured-items?includeExpired=TRUE',

	// `includeExpired` — combined with `limit`. The two params are
	// independent; combining them must not produce a different
	// failure mode.
	'/api/featured-items?limit=10&includeExpired=true',
	'/api/featured-items?limit=999&includeExpired=true',
	'/api/featured-items?limit=abc&includeExpired=true',

	// Extra unknown query params are silently ignored — the route
	// only reads `limit` and `includeExpired` from `searchParams`.
	'/api/featured-items?limit=6&unknown=value',
	'/api/featured-items?limit=6&category=tools&tag=saas',
] as const;

test.describe('API: /api/featured-items query-param surface', () => {
	for (const path of FEATURED_ITEMS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}
});
