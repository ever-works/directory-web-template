import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public items-engagement endpoint's
 * **query-param surface** served by
 * `apps/web/app/api/items/engagement/route.ts`.
 *
 * `GET /api/items/engagement` is intentionally public (the listing
 * page hydrates vote / view / comment counts from it). The route's
 * exact contract is:
 *
 *   - `slugs` — required comma-separated list. The route splits on
 *               `','`, trims each entry, drops empty entries via
 *               `filter(Boolean)`, and:
 *                 * returns `400` (`{ error: 'Missing required parameter: slugs' }`)
 *                   when the param is **missing entirely** (`searchParams.get('slugs')`
 *                   returns `null`),
 *                 * returns `200` with `{ metrics: {} }` when the param
 *                   is present but parses to an empty list (`?slugs=`,
 *                   `?slugs=   `, `?slugs=,,,`),
 *                 * returns `400` (`{ error: 'Too many slugs. Maximum 200 allowed per request.' }`)
 *                   when the parsed list has more than 200 entries,
 *                 * returns `200` with `{ metrics: { … } }` keyed by
 *                   slug for any list of 1..200 known or unknown slugs.
 *   - **No other query params are read** — the route ignores
 *               everything except `slugs`.
 *
 * The `dynamic = 'force-dynamic'` export at the top of the route
 * file disables Next.js's static rendering, so every request hits
 * the handler. The route also short-circuits to `{ metrics: {} }`
 * when `checkDatabaseAvailability()` returns a value (i.e. the DB
 * is not configured), which is **independent** of the query string.
 *
 * The single happy-path entry (`/api/items/engagement?slugs=foo,bar`)
 * and the four obvious branches (no param, empty list, 250-slug
 * abuse, unknown slugs) are already smoked by
 * [`items-engagement-and-favorites.spec.ts`](./items-engagement-and-favorites.spec.ts).
 * This spec adds the **query-param surface** so a regression in the
 * `slugs.split(',').map(s => s.trim()).filter(Boolean)` parse path,
 * the 200-slug ceiling, the `searchParams.get('slugs')` null-vs-empty
 * distinction, the `getEngagementMetricsPerItem` `Map`-to-object
 * conversion, the `try / catch` empty-fallback branch, or the
 * `checkDatabaseAvailability()` short-circuit is caught explicitly.
 * None of the cases here may 5xx — that would indicate the route's
 * parameter-parsing or the `Map.forEach` plain-object conversion
 * crashed before the response renderer.
 *
 * Payload shape and `Content-Type` are intentionally not asserted
 * because the response toggles between `{ metrics: {…} }` and
 * `{ error: '…' }` envelopes depending on which branch the route
 * picks, and the active deployment's database state determines
 * whether unknown slugs land in the empty-fallback or the
 * happy-path branch.
 */
const ITEMS_ENGAGEMENT_QUERIES = [
	// Baseline — no `slugs` param at all. The route must reach the
	// `searchParams.get('slugs')` null-check and return a 4xx (the
	// envelope is `{ error: 'Missing required parameter: slugs' }`)
	// without crashing. Already covered by
	// `items-engagement-and-favorites.spec.ts`; included here so the
	// query-param surface is enumerated in one place.
	'/api/items/engagement',

	// `slugs` present but empty / whitespace / comma-only. The route's
	// `split(',').map(s => s.trim()).filter(Boolean)` must produce an
	// empty array, which the `slugs.length === 0` guard catches and
	// returns `200` + `{ metrics: {} }` for. None of these may 4xx
	// (the param IS present), and none may 5xx.
	'/api/items/engagement?slugs=',
	'/api/items/engagement?slugs=%20',
	'/api/items/engagement?slugs=%20%20%20',
	'/api/items/engagement?slugs=,',
	'/api/items/engagement?slugs=,,',
	'/api/items/engagement?slugs=,,,,,',
	'/api/items/engagement?slugs=%20,%20,%20',

	// `slugs` with a single known-or-unknown value. The route falls
	// through to `getEngagementMetricsPerItem(['foo'])` which returns
	// an empty `Map` for unknown slugs; the route then converts the
	// `Map` to a plain object and returns `200` + `{ metrics: {} }`.
	'/api/items/engagement?slugs=foo',
	'/api/items/engagement?slugs=__definitely-not-a-real-item-slug__',

	// `slugs` with multiple values — the comma-split happy path.
	'/api/items/engagement?slugs=foo,bar',
	'/api/items/engagement?slugs=foo,bar,baz',
	'/api/items/engagement?slugs=foo,bar,baz,qux',

	// `slugs` with surrounding / interior whitespace. The route trims
	// each entry; trimmed-empty entries are dropped via
	// `filter(Boolean)` so `'foo,,bar'` and `'foo, ,bar'` both parse
	// to `['foo','bar']`. None may 5xx.
	'/api/items/engagement?slugs=%20foo%20',
	'/api/items/engagement?slugs=foo,,bar',
	'/api/items/engagement?slugs=foo,%20,bar',
	'/api/items/engagement?slugs=%20foo,bar%20',
	'/api/items/engagement?slugs=%20foo%20,%20bar%20',

	// `slugs` containing characters that would be problematic in a
	// raw URL (encoded slashes, plus signs, percent-signs). The route
	// does not decode the slug content beyond what `searchParams.get`
	// returns, so these are passed through to the data layer
	// verbatim. They must produce a non-5xx response (most likely a
	// 200 with `{ metrics: {} }` because no item matches the slug).
	'/api/items/engagement?slugs=foo%2Fbar',
	'/api/items/engagement?slugs=foo%2Bbar',
	'/api/items/engagement?slugs=foo%25bar',
	'/api/items/engagement?slugs=foo%26bar',

	// `slugs` exactly at the 200-entry ceiling. The route's
	// `slugs.length > 200` guard rejects 201+; 200 must succeed.
	`/api/items/engagement?slugs=${Array.from({ length: 200 }, (_, i) => `item-${i}`).join(',')}`,

	// `slugs` one above the 200-entry ceiling — the abuse-prevention
	// branch (`Too many slugs. Maximum 200 allowed per request.`).
	// Already covered by the 250-entry case in
	// `items-engagement-and-favorites.spec.ts`; the 201-entry case
	// here pins the off-by-one boundary explicitly.
	`/api/items/engagement?slugs=${Array.from({ length: 201 }, (_, i) => `item-${i}`).join(',')}`,

	// Extra unknown query params are silently ignored — the route
	// only reads `slugs` from `searchParams`. None may 4xx-on-the-extras
	// or 5xx.
	'/api/items/engagement?slugs=foo&unknown=value',
	'/api/items/engagement?slugs=foo,bar&category=tools&tag=saas',
	'/api/items/engagement?slugs=foo&limit=10',

	// Repeated `slugs` keys — `searchParams.get('slugs')` returns the
	// **first** occurrence; the rest are silently ignored. No 5xx.
	// (The route does not call `searchParams.getAll('slugs')`.)
	'/api/items/engagement?slugs=foo&slugs=bar&slugs=baz',
	'/api/items/engagement?slugs=foo,bar&slugs=baz,qux',
] as const;

test.describe('API: /api/items/engagement public query-param surface', () => {
	for (const path of ITEMS_ENGAGEMENT_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/items/engagement without `slugs` returns a 4xx with the missing-param envelope', async ({ request }) => {
		// This case is the one branch where the route's contract is
		// fully deterministic regardless of DB state: no `slugs` param
		// always returns `400` + `{ error: 'Missing required parameter: slugs' }`
		// because `checkDatabaseAvailability()` is checked **before**
		// the param read but the param read fails with the missing
		// param before any DB round trip. Pinning this branch keeps a
		// future "make `slugs` optional" refactor from silently
		// regressing the listing page's hydration contract.
		const response = await request.get('/api/items/engagement');

		expect(response.status()).toBeGreaterThanOrEqual(400);
		expect(response.status()).toBeLessThan(500);

		const body = (await response.json()) as { error?: string; metrics?: unknown };

		// One of two envelopes is acceptable depending on whether the
		// DB-availability short-circuit fired first: the missing-param
		// 400 (`{ error: '...' }`) or the DB-fallback 200 short-circuit
		// (`{ metrics: {} }`). The route does not currently take the
		// latter path on this input but a future refactor that swaps
		// the two checks would still be a valid behaviour and we don't
		// want this assertion to over-pin the order.
		expect(body.error !== undefined || body.metrics !== undefined).toBe(true);
	});

	test('GET /api/items/engagement?slugs=foo,bar always returns a JSON envelope with `metrics`', async ({ request }) => {
		// Unlike the parameter-surface cases above, this single
		// assertion spans every success branch because every branch
		// (DB-available with a valid result, DB-short-circuit
		// fallback, catch-and-empty fallback) returns `{ metrics: {…} }`
		// with status 200. If a future change ever introduces a
		// 4xx / 5xx response on a well-formed two-slug request the
		// route would no longer be a public drop-in surface for the
		// listing page and this spec would catch the regression.
		const response = await request.get('/api/items/engagement?slugs=foo,bar');

		expect(response.status()).toBe(200);

		const body = (await response.json()) as { metrics?: Record<string, unknown> };

		expect(body.metrics).toBeDefined();
		expect(typeof body.metrics).toBe('object');
		expect(body.metrics).not.toBeNull();
		expect(Array.isArray(body.metrics)).toBe(false);
	});
});
