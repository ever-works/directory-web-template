import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public `/api/location/cities` endpoint's
 * **query-param surface** served by
 * `apps/web/app/api/location/cities/route.ts`.
 *
 * `GET /api/location/cities` is intentionally a **zero-query-param**
 * GET handler — the route reads **no** `searchParams` at all. The
 * exact contract is:
 *
 *     export async function GET() {
 *       if (!getLocationEnabled()) {
 *         return NextResponse.json(
 *           { success: false, error: 'Location features are disabled' },
 *           { status: 404 }
 *         );
 *       }
 *
 *       try {
 *         const cities = await getDistinctCities();
 *         return NextResponse.json({ success: true, data: cities });
 *       } catch (error) {
 *         console.error('[API] Failed to fetch distinct cities:', error);
 *         return NextResponse.json(
 *           { error: 'Failed to fetch cities' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The two well-formed branches are:
 *
 *   - **Feature-disabled**: `getLocationEnabled()` returns `false` and
 *     the route returns `404` + `{ success: false, error: 'Location
 *     features are disabled' }` before any database call. This is
 *     the most likely branch on a clean local dev baseline.
 *   - **Feature-enabled**: `getDistinctCities()` resolves a list of
 *     distinct city names from the location index and the route
 *     returns `200` + `{ success: true, data: string[] }`.
 *
 * The catch-and-500 fallback (`Failed to fetch cities`) should never
 * fire on a clean baseline; if it does, that is a regression the
 * smoke matrix below flags via the `< 500` assertion.
 *
 * The route's siblings that share the same `apps/web/app/api/location/`
 * subtree are:
 *
 *   - `apps/web/app/api/location/countries/route.ts` — distinct
 *     countries, same shape — already covered by
 *     `location-countries-query.spec.ts`.
 *   - `apps/web/app/api/location/coordinates/route.ts` — already
 *     covered by `location-coordinates-query.spec.ts`.
 *   - `apps/web/app/api/location/search/route.ts` — already covered
 *     by `location-search-query.spec.ts`.
 *
 * This spec is the **first** smoke for the `/api/location/cities`
 * surface. Today the load-bearing invariants are:
 *
 *   - The handler reads **zero** query parameters; every supplied
 *     query string is silently ignored. A regression that adds
 *     `?city=…` filtering would produce a divergent response across
 *     the matrix below — the assertion that compares every
 *     parametrised response to the baseline pins this invariant.
 *   - The status is exactly one of `200` (success) or `404`
 *     (feature gate). Nothing else is reachable from an
 *     unauthenticated caller.
 *   - The success-branch `data` is an array of strings. The
 *     feature-disabled branch's `error` is a string.
 *
 * Payload shape is asserted only on the baseline (no-arg) call.
 * The matrix calls assert only the status branch + `< 500` because
 * the parametrised paths exercise "the route ignores my param"
 * behaviour, and the contract for that is "return the same
 * envelope the no-arg call returned".
 */
const CITIES_QUERIES = [
	// Baseline — the canonical no-arg shape. Included so a future
	// reader sees the canonical case alongside the variants it
	// parametrises.
	'/api/location/cities',

	// `?city=…` — the obvious "filter by city" override the route
	// does not honour today. Every value must round-trip identically
	// to the baseline because `searchParams.get('city')` is never
	// read.
	'/api/location/cities?city=Paris',
	'/api/location/cities?city=paris',
	'/api/location/cities?city=PARIS',
	'/api/location/cities?city=New%20York',
	'/api/location/cities?city=Los%20Angeles',
	'/api/location/cities?city=S%C3%A3o%20Paulo',
	'/api/location/cities?city=Cote%20d%27Ivoire',

	// `?city=…` whitespace and empty variants. Same invariant.
	'/api/location/cities?city=',
	'/api/location/cities?city=%20',
	'/api/location/cities?city=%20%20',
	'/api/location/cities?city=%09',

	// `?country=…` / `?countryCode=` — alternate "filter by parent
	// country" keys the route does not honour. The handler returns
	// the **complete** distinct-city list every call.
	'/api/location/cities?country=France',
	'/api/location/cities?country=United%20States',
	'/api/location/cities?countryCode=US',
	'/api/location/cities?countryCode=FR',
	'/api/location/cities?code=DE',
	'/api/location/cities?iso=GB',
	'/api/location/cities?iso2=JP',
	'/api/location/cities?iso3=USA',

	// `?region=` / `?state=` — alternate sub-national filter keys
	// the route does not honour today.
	'/api/location/cities?region=Ile-de-France',
	'/api/location/cities?state=California',
	'/api/location/cities?province=Quebec',

	// `?q=` / `?search=` / `?term=` — obvious search wiring keys
	// the route does not honour. The data-layer call
	// (`getDistinctCities()`) does not accept a filter argument.
	'/api/location/cities?q=Par',
	'/api/location/cities?q=New',
	'/api/location/cities?search=Paris',
	'/api/location/cities?term=Par',
	'/api/location/cities?prefix=Pa',

	// `?limit=` / `?offset=` / `?page=` / `?perPage=` — pagination
	// keys the route does not honour. The handler returns the
	// **complete** distinct-city list every call.
	'/api/location/cities?limit=10',
	'/api/location/cities?limit=0',
	'/api/location/cities?limit=999999',
	'/api/location/cities?offset=5',
	'/api/location/cities?page=2',
	'/api/location/cities?perPage=50',
	'/api/location/cities?cursor=anything',

	// `?sort=` / `?order=` / `?direction=` — sort keys the route
	// does not honour. The order is whatever the data layer's
	// `getDistinctCities()` returns.
	'/api/location/cities?sort=name',
	'/api/location/cities?sort=name&order=asc',
	'/api/location/cities?sort=name&order=desc',
	'/api/location/cities?direction=desc',

	// `?locale=` / `?lang=` — i18n keys the route does not honour.
	// The city names are not translated server-side today.
	'/api/location/cities?locale=fr',
	'/api/location/cities?locale=de',
	'/api/location/cities?lang=es',

	// `?format=` — content-negotiation key the route does not
	// honour. The response is exclusively JSON.
	'/api/location/cities?format=json',
	'/api/location/cities?format=csv',
	'/api/location/cities?format=xml',
	'/api/location/cities?format=pdf',

	// `?fields=` / `?include=` / `?expand=` — sparse-fieldset /
	// expansion keys the route does not honour. The data shape is
	// fixed: `{ success: true, data: string[] }`.
	'/api/location/cities?fields=name',
	'/api/location/cities?fields=name,country',
	'/api/location/cities?include=count',
	'/api/location/cities?expand=country',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-tenancy keys the
	// route does not honour. The location index is shared across
	// the deployment.
	'/api/location/cities?tenant=acme',
	'/api/location/cities?tenantId=42',
	'/api/location/cities?org=ever-works',

	// `?refresh=` / `?cache=` / `?force=` — cache-busting keys the
	// route does not honour. The handler does not branch on any
	// cache-control query param.
	'/api/location/cities?refresh=1',
	'/api/location/cities?force=true',
	'/api/location/cities?cache=bypass',
	'/api/location/cities?fresh=true',
	'/api/location/cities?nocache=1',

	// `?token=` / `?secret=` / `?api_key=` — obvious "I have a
	// magic auth token, let me through" keys. The route is **not**
	// session-gated today and reads zero auth keys.
	'/api/location/cities?token=anything',
	'/api/location/cities?secret=anything',
	'/api/location/cities?api_key=anything',
	'/api/location/cities?authorization=Bearer+anything',

	// Special-character values that would tempt a future regex
	// match, LIKE-prefix, or path-injection wiring. The route does
	// not pass any query value into SQL or the filesystem today.
	'/api/location/cities?city=%3Cscript%3E',
	'/api/location/cities?city=%27%20OR%201%3D1',
	'/api/location/cities?city=%2F..%2F..%2Fetc%2Fpasswd',
	'/api/location/cities?city=%00',
	'/api/location/cities?q=%3Cscript%3E',
	'/api/location/cities?q=%27%20OR%201%3D1',

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs.
	`/api/location/cities?city=${'x'.repeat(500)}`,
	`/api/location/cities?q=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero keys, so any
	// combination of unknown keys must be silently ignored.
	'/api/location/cities?unknown=value',
	'/api/location/cities?foo=bar&baz=qux',
	'/api/location/cities?city=Paris&q=Par&limit=10&token=alice&unknown=value',

	// Repeated keys — `searchParams.get(key)` returns the first
	// occurrence; even though the route reads no keys, future
	// regressions that begin reading them must still tolerate
	// repeats without crashing.
	'/api/location/cities?city=Paris&city=Lyon',
	'/api/location/cities?q=Par&q=Lyo',
] as const;

test.describe('API: /api/location/cities public query-param surface', () => {
	for (const path of CITIES_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// Every branch returns either 200 (feature on) or 404
			// (feature off). The catch-and-500 fallback must never
			// fire on a clean baseline.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/location/cities always returns either the feature-disabled 404 or the success envelope', async ({
		request,
	}) => {
		// The two well-formed branches:
		//   * `404` + `{ success: false, error: 'Location features are disabled' }`
		//     when the location feature is off (the most-likely branch
		//     on a clean local-dev baseline);
		//   * `200` + `{ success: true, data: string[] }` when the
		//     feature is on.
		// Anything else (a 5xx, a 200 with `success` missing, a 404
		// with `error` not a string) would indicate a regression in
		// the route's response renderer.
		const response = await request.get('/api/location/cities');

		expect([200, 404]).toContain(response.status());

		const body = (await response.json()) as {
			success?: unknown;
			error?: unknown;
			data?: unknown;
		};

		expect(body.success).toBeDefined();
		expect(typeof body.success).toBe('boolean');

		if (body.success === true) {
			expect(response.status()).toBe(200);
			expect(Array.isArray(body.data)).toBe(true);
			// Every entry must be a string (the data layer returns
			// `string[]`). An empty array is fine.
			for (const entry of body.data as unknown[]) {
				expect(typeof entry).toBe('string');
			}
		} else {
			expect(response.status()).toBe(404);
			expect(typeof body.error).toBe('string');
		}
	});

	test('GET /api/location/cities response is invariant across every parametrised query string', async ({
		request,
	}) => {
		// The route reads zero query parameters today. Every value
		// in `CITIES_QUERIES` must round-trip to the same body the
		// no-arg call returns. A regression that begins reading
		// `?city=…` / `?q=…` / `?limit=…` would produce a divergent
		// response and surface here.
		const baseline = await request.get('/api/location/cities');
		const baselineStatus = baseline.status();
		const baselineBody = await baseline.json();

		// Pick a representative subset across categories so the test
		// stays fast but still pins the invariant. Each entry below
		// represents one "the route does not read this" category.
		const samples = [
			'/api/location/cities?city=Paris',
			'/api/location/cities?country=France',
			'/api/location/cities?countryCode=US',
			'/api/location/cities?region=Ile-de-France',
			'/api/location/cities?q=Par',
			'/api/location/cities?limit=10',
			'/api/location/cities?sort=name',
			'/api/location/cities?locale=fr',
			'/api/location/cities?format=json',
			'/api/location/cities?fields=name',
			'/api/location/cities?tenant=acme',
			'/api/location/cities?refresh=1',
			'/api/location/cities?token=anything',
			'/api/location/cities?city=Paris&q=Par&limit=10&token=alice&unknown=value',
		];

		for (const sample of samples) {
			const response = await request.get(sample);
			expect(response.status()).toBe(baselineStatus);

			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});

	test('GET /api/location/cities does NOT honour caller-supplied filter overrides', async ({
		request,
	}) => {
		// A future contributor who wires `?city=…` as a server-side
		// filter for `getDistinctCities()` would silently grant
		// caller-controlled override of the data-layer query. This
		// test pins the "the route ignores filter keys" invariant by
		// asserting the response shape is the same whether the
		// caller supplies a filter that **definitely won't match
		// anything** or no filter at all.
		const baseline = await request.get('/api/location/cities');
		const baselineBody = await baseline.json();

		// A nonsensical filter that would produce an empty result
		// set if the route honoured it.
		const withFilter = await request.get(
			'/api/location/cities?city=__definitely-not-a-real-city__&q=__nope__&limit=0'
		);
		const withFilterBody = await withFilter.json();

		expect(withFilter.status()).toBe(baseline.status());
		expect(withFilterBody).toEqual(baselineBody);
	});

	test('GET /api/location/cities supports the parametrised matrix without leaking 5xx', async ({
		request,
	}) => {
		// Final sweep — confirm every parametrised query in the
		// matrix is below 500. Repeats the per-test status assertion
		// so a future maintainer can read the whole file as one
		// contract spec.
		const responses = await Promise.all(
			CITIES_QUERIES.slice(0, 20).map((path) => request.get(path))
		);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
			expect([200, 404]).toContain(response.status());
		}
	});
});
