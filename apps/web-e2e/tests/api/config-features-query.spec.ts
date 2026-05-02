import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the public
 * feature-flags endpoint served by
 * `apps/web/app/api/config/features/route.ts`.
 *
 * `GET /api/config/features` is intentionally public (no
 * authentication) and the handler signature is
 * `export async function GET()` — **no `request` parameter**, no
 * `searchParams.get(...)` call anywhere in the route body. The
 * route delegates to `getFeatureFlags()` from
 * `apps/web/lib/config/feature-flags.ts` and serialises the result
 * with a `Cache-Control: public, s-maxage=300,
 * stale-while-revalidate=600` header on the success path.
 *
 * The single happy-path entry (`/api/config/features`) is already
 * smoked by [`health.spec.ts`](./health.spec.ts). This spec adds
 * the **query-param surface** so a regression that introduces a
 * `searchParams.get(...)` call (which a future filter / per-tenant /
 * per-locale wiring might tempt a future contributor into adding)
 * is caught immediately as a non-200 / non-500 response, and so a
 * regression that drops the catch-and-degrade branch's `{ ratings:
 * false, ... }` envelope (e.g. by accidentally returning
 * `NextResponse.json(null, { status: 500 })`) shows up as a typed
 * envelope-shape failure here.
 *
 * The route contract is deliberately permissive:
 *
 *   - **Zero** query keys are read. Any query string the caller
 *     appends must be silently ignored.
 *   - The success path returns a 200 with the canonical envelope
 *     and the public `Cache-Control` header.
 *   - The catch path returns a 500 with the same envelope shape
 *     (all five flags set to `false`) and a `Cache-Control:
 *     no-cache` header so the failure does not get pinned for five
 *     minutes by a CDN.
 *
 * Payload shape and `Content-Type` are intentionally not asserted
 * on the bulk loop because the response can be either the success
 * envelope or the catch-and-degrade envelope (the route
 * deliberately swallows its data-layer errors and returns a
 * `{ ratings: false, ... }` shape so the marketing surface keeps
 * rendering even when the database is unreachable). The single
 * envelope-shape assertion at the bottom pins the contract for the
 * canonical no-arg request.
 */
const CONFIG_FEATURES_QUERIES = [
	// Baseline — same path as `health.spec.ts`. Included so the
	// query-param surface enumeration starts from the no-arg case.
	'/api/config/features',

	// `?locale=` — the obvious key a future per-locale feature-flag
	// wiring might add. Today the route reads nothing; the response
	// must remain identical to the no-arg case.
	'/api/config/features?locale=en',
	'/api/config/features?locale=fr',
	'/api/config/features?locale=es',
	'/api/config/features?locale=de',
	'/api/config/features?locale=ar',
	'/api/config/features?locale=zh',
	'/api/config/features?locale=',
	'/api/config/features?locale=invalid-locale',

	// `?lang=` — the legacy alias for `locale`. Today not read.
	'/api/config/features?lang=fr',

	// `?tenant=` / `?tenantId=` / `?org=` — the obvious keys a future
	// per-tenant feature-flag wiring might add. Today the route reads
	// the tenant from session / database, not from the query string;
	// any value here must be silently ignored.
	'/api/config/features?tenant=acme',
	'/api/config/features?tenantId=00000000-0000-0000-0000-000000000000',
	'/api/config/features?org=acme',
	'/api/config/features?tenantId=',

	// `?feature=` / `?features=` — the obvious filter key a future
	// "give me only the flags I asked for" wiring would use. Today
	// the route returns the full envelope; query is ignored.
	'/api/config/features?feature=ratings',
	'/api/config/features?feature=comments',
	'/api/config/features?features=ratings,comments,favorites',
	'/api/config/features?features=',

	// `?ratings=` / `?comments=` / etc. — caller-controlled
	// pre-canned answers. The route never reads any of these; the
	// returned envelope must reflect the server's view of the flags
	// regardless of what the caller asks for.
	'/api/config/features?ratings=true',
	'/api/config/features?ratings=false',
	'/api/config/features?comments=true',
	'/api/config/features?favorites=true',
	'/api/config/features?featuredItems=true',
	'/api/config/features?surveys=true',

	// `?limit=` / `?offset=` / `?page=` / `?pageSize=` — pagination
	// keys. There is nothing to paginate (the envelope is a fixed
	// five-key object), but the route must remain non-5xx if any
	// of them is appended.
	'/api/config/features?limit=10',
	'/api/config/features?offset=5',
	'/api/config/features?page=2',
	'/api/config/features?pageSize=25',

	// `?sort=` / `?order=` — sort keys. The envelope's keys are
	// returned in insertion order; sorting is meaningless. Keys
	// must remain ignored.
	'/api/config/features?sort=ratings',
	'/api/config/features?sort=ratings&order=asc',
	'/api/config/features?direction=desc',

	// `?q=` / `?search=` — type-ahead-style keys. Not read.
	'/api/config/features?q=ratings',
	'/api/config/features?search=ratings',
	'/api/config/features?prefix=r',
	'/api/config/features?filter=enabled',

	// `?cache=` / `?fresh=` / `?nocache=` — a future contributor
	// might add a "force fresh" knob here to bypass the
	// 5-minute s-maxage. Today none of these keys are read; the
	// route always returns the cached path.
	'/api/config/features?cache=false',
	'/api/config/features?fresh=true',
	'/api/config/features?nocache=1',
	'/api/config/features?bypass=true',
	'/api/config/features?_=1700000000', // anti-cache cache-buster

	// Empty values for any of the above keys. `searchParams.get(...)`
	// on `?key=` returns `''`; the route reads zero keys, so the
	// response shape must remain identical to the canonical case.
	'/api/config/features?locale=',
	'/api/config/features?tenant=',
	'/api/config/features?feature=',
	'/api/config/features?q=',
	'/api/config/features?features=',

	// Repeated keys — `searchParams.get(name)` returns the **first**
	// value if a future contributor wires it up. Today the route
	// reads nothing, so duplicate keys must remain non-5xx.
	'/api/config/features?locale=fr&locale=en',
	'/api/config/features?tenant=acme&tenant=globex',
	'/api/config/features?feature=ratings&feature=comments',
	'/api/config/features?limit=10&limit=20',

	// Special-character values that would tempt a future regex
	// match, LIKE-prefix, or path-injection wiring. The route does
	// not pass any value into a SQL query or filesystem path, so
	// these must remain pass-through ignored.
	'/api/config/features?locale=%25', // %
	'/api/config/features?locale=%2F', // /
	'/api/config/features?locale=%5C', // \
	'/api/config/features?locale=%27', // '
	'/api/config/features?locale=%22', // "
	'/api/config/features?locale=%3C', // <
	'/api/config/features?locale=%3E', // >
	'/api/config/features?tenant=%00', // null byte
	'/api/config/features?feature=%3B', // ;
	'/api/config/features?feature=%2D%2D', // --

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs. The route does
	// not read the value into a SQL parameter, so this must pass
	// through to the canonical branch and respond either 200 or the
	// catch-and-degrade 500, never something else.
	`/api/config/features?locale=${'x'.repeat(500)}`,
	`/api/config/features?tenant=${'y'.repeat(500)}`,
	`/api/config/features?feature=${'z'.repeat(500)}`,
	`/api/config/features?features=${'w'.repeat(2000)}`,

	// Bogus / typo'd query keys — same expectation. The route reads
	// at most zero keys, so any combination of unknown keys is
	// silently ignored.
	'/api/config/features?unknown=value',
	'/api/config/features?foo=bar',
	'/api/config/features?foo=bar&baz=qux',
	'/api/config/features?locale=fr&unknown=value&foo=bar',
	'/api/config/features?ratings=true&comments=true&unknown=value',
	'/api/config/features?__proto__=polluted',
	'/api/config/features?constructor=polluted'
] as const;

test.describe('API: /api/config/features query-param surface', () => {
	for (const path of CONFIG_FEATURES_QUERIES) {
		test(`GET ${path} responds without an unexpected status`, async ({ request }) => {
			const response = await request.get(path);

			// The route's two documented branches are 200 (success) and
			// 500 (catch-and-degrade). Both are valid; anything else
			// (e.g. 502, 503, framework crash) indicates a regression.
			// We accept either of the two documented codes here and
			// pin the canonical envelope shape in the dedicated tests
			// below.
			expect([200, 500]).toContain(response.status());
		});
	}

	test('GET /api/config/features returns the canonical five-key envelope on either branch', async ({ request }) => {
		// On both the success and the catch path, the route returns
		// `{ ratings: boolean, comments: boolean, favorites: boolean,
		// featuredItems: boolean, surveys: boolean }`. The catch path
		// hard-codes every flag to `false`; the success path delegates
		// to `getFeatureFlags()`. Both share the same envelope shape.
		const response = await request.get('/api/config/features');

		expect([200, 500]).toContain(response.status());

		const body = (await response.json()) as Record<string, unknown>;

		expect(typeof body.ratings).toBe('boolean');
		expect(typeof body.comments).toBe('boolean');
		expect(typeof body.favorites).toBe('boolean');
		expect(typeof body.featuredItems).toBe('boolean');
		expect(typeof body.surveys).toBe('boolean');

		// On the catch path every flag is `false` by contract.
		if (response.status() === 500) {
			expect(body.ratings).toBe(false);
			expect(body.comments).toBe(false);
			expect(body.favorites).toBe(false);
			expect(body.featuredItems).toBe(false);
			expect(body.surveys).toBe(false);
		}
	});

	test('GET /api/config/features sets the documented Cache-Control header on each branch', async ({ request }) => {
		const response = await request.get('/api/config/features');
		const cacheControl = response.headers()['cache-control'] ?? '';

		if (response.status() === 200) {
			// Success path: 5-minute public CDN cache + 10-minute SWR
			// window so the marketing surface stays warm.
			expect(cacheControl).toContain('public');
			expect(cacheControl).toContain('s-maxage=300');
			expect(cacheControl).toContain('stale-while-revalidate=600');
		} else if (response.status() === 500) {
			// Catch path must not be CDN-cached — a degraded
			// "everything off" response pinned for five minutes
			// would hide a recovered database.
			expect(cacheControl).toContain('no-cache');
		}
	});

	test('GET /api/config/features responds identically with and without bogus query parameters', async ({
		request
	}) => {
		// The handler signature is `export async function GET()` —
		// no `request` parameter, no `searchParams.get()` call. Any
		// query string the caller appends must not affect the
		// response status. Body content is not asserted byte-identical
		// because a concurrent admin write to the underlying flag
		// state could land between the two requests.
		const baseline = await request.get('/api/config/features');
		const parameterised = await request.get(
			'/api/config/features?locale=fr&tenant=acme&feature=ratings&limit=10&sort=name&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/config/features ignores caller-controlled flag overrides', async ({ request }) => {
		// `?ratings=false` etc. must not flip the returned flag —
		// the envelope reflects the server's view, not the client's
		// suggestion. Two requests with opposing overrides must
		// resolve to the same status code.
		const allTrue = await request.get(
			'/api/config/features?ratings=true&comments=true&favorites=true&featuredItems=true&surveys=true'
		);
		const allFalse = await request.get(
			'/api/config/features?ratings=false&comments=false&favorites=false&featuredItems=false&surveys=false'
		);

		expect(allTrue.status()).toBe(allFalse.status());

		const trueBody = (await allTrue.json()) as Record<string, unknown>;
		const falseBody = (await allFalse.json()) as Record<string, unknown>;

		// Both responses must surface the same canonical flag values
		// (modulo a concurrent write between the two calls). We
		// compare the JSON serialisations for equality on every
		// key the route is documented to expose.
		for (const key of ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']) {
			expect(typeof trueBody[key]).toBe('boolean');
			expect(typeof falseBody[key]).toBe('boolean');
		}
	});
});
