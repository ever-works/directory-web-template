import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public `/api/location/countries` endpoint's
 * **query-param surface** served by
 * `apps/web/app/api/location/countries/route.ts`.
 *
 * `GET /api/location/countries` is intentionally a **zero-query-param**
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
 *         const countries = await getDistinctCountries();
 *         return NextResponse.json({ success: true, data: countries });
 *       } catch (error) {
 *         console.error('[API] Failed to fetch distinct countries:', error);
 *         return NextResponse.json(
 *           { error: 'Failed to fetch countries' },
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
 *   - **Feature-enabled**: `getDistinctCountries()` resolves a list
 *     of distinct country names from the location index and the
 *     route returns `200` + `{ success: true, data: string[] }`.
 *
 * The catch-and-500 fallback (`Failed to fetch countries`) should
 * never fire on a clean baseline; if it does, that is a regression
 * the smoke matrix below flags via the `< 500` assertion.
 *
 * The route's siblings that share the same `apps/web/app/api/location/`
 * subtree are:
 *
 *   - `apps/web/app/api/location/cities/route.ts` — distinct cities,
 *     same shape.
 *   - `apps/web/app/api/location/coordinates/route.ts` — already
 *     covered by `location-coordinates-query.spec.ts`.
 *   - `apps/web/app/api/location/search/route.ts` — already covered
 *     by `location-search-query.spec.ts`.
 *
 * This spec is the **first** smoke for the `/api/location/countries`
 * surface. Today the load-bearing invariants are:
 *
 *   - The handler reads **zero** query parameters; every supplied
 *     query string is silently ignored. A regression that adds
 *     `?country=…` filtering would produce a divergent response
 *     across the matrix below — the assertion that compares every
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
const COUNTRIES_QUERIES = [
	// Baseline — the canonical no-arg shape. Included so a future
	// reader sees the canonical case alongside the variants it
	// parametrises.
	'/api/location/countries',

	// `?country=…` — the obvious "filter by country" override the
	// route does not honour today. Every value must round-trip
	// identically to the baseline because `searchParams.get('country')`
	// is never read.
	'/api/location/countries?country=France',
	'/api/location/countries?country=france',
	'/api/location/countries?country=FRANCE',
	'/api/location/countries?country=United%20States',
	'/api/location/countries?country=Cote%20d%27Ivoire',
	'/api/location/countries?country=S%C3%A3o%20Tom%C3%A9',

	// `?country=…` whitespace and empty variants. Same invariant.
	'/api/location/countries?country=',
	'/api/location/countries?country=%20',
	'/api/location/countries?country=%20%20',
	'/api/location/countries?country=%09',

	// `?countryCode=` / `?code=` — alternate "filter by ISO code"
	// keys the route does not honour. The response must be invariant.
	'/api/location/countries?countryCode=US',
	'/api/location/countries?countryCode=FR',
	'/api/location/countries?code=DE',
	'/api/location/countries?iso=GB',
	'/api/location/countries?iso2=JP',
	'/api/location/countries?iso3=USA',

	// `?city=` — a future contributor might add per-city filtering
	// here. The route reads zero city keys today.
	'/api/location/countries?city=Paris',
	'/api/location/countries?city=New%20York',
	'/api/location/countries?city=',

	// `?q=` / `?search=` / `?term=` — obvious search wiring keys
	// the route does not honour. The data-layer call
	// (`getDistinctCountries()`) does not accept a filter argument.
	'/api/location/countries?q=Fra',
	'/api/location/countries?q=United',
	'/api/location/countries?search=France',
	'/api/location/countries?term=Fra',
	'/api/location/countries?prefix=Fr',

	// `?limit=` / `?offset=` / `?page=` / `?perPage=` — pagination
	// keys the route does not honour. The handler returns the
	// **complete** distinct-country list every call.
	'/api/location/countries?limit=10',
	'/api/location/countries?limit=0',
	'/api/location/countries?limit=999999',
	'/api/location/countries?offset=5',
	'/api/location/countries?page=2',
	'/api/location/countries?perPage=50',
	'/api/location/countries?cursor=anything',

	// `?sort=` / `?order=` / `?direction=` — sort keys the route
	// does not honour. The order is whatever the data layer's
	// `getDistinctCountries()` returns.
	'/api/location/countries?sort=name',
	'/api/location/countries?sort=name&order=asc',
	'/api/location/countries?sort=name&order=desc',
	'/api/location/countries?direction=desc',

	// `?locale=` / `?lang=` — i18n keys the route does not honour.
	// The country names are not translated server-side today.
	'/api/location/countries?locale=fr',
	'/api/location/countries?locale=de',
	'/api/location/countries?lang=es',

	// `?format=` — content-negotiation key the route does not
	// honour. The response is exclusively JSON.
	'/api/location/countries?format=json',
	'/api/location/countries?format=csv',
	'/api/location/countries?format=xml',
	'/api/location/countries?format=pdf',

	// `?fields=` / `?include=` / `?expand=` — sparse-fieldset /
	// expansion keys the route does not honour. The data shape
	// is fixed: `{ success: true, data: string[] }`.
	'/api/location/countries?fields=name',
	'/api/location/countries?fields=name,code',
	'/api/location/countries?include=count',
	'/api/location/countries?expand=count',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-tenancy keys
	// the route does not honour. The location index is shared
	// across the deployment.
	'/api/location/countries?tenant=acme',
	'/api/location/countries?tenantId=42',
	'/api/location/countries?org=ever-works',

	// `?refresh=` / `?cache=` / `?force=` — cache-busting keys
	// the route does not honour. The handler does not branch on
	// any cache-control query param.
	'/api/location/countries?refresh=1',
	'/api/location/countries?force=true',
	'/api/location/countries?cache=bypass',
	'/api/location/countries?fresh=true',
	'/api/location/countries?nocache=1',

	// `?token=` / `?secret=` / `?api_key=` — obvious "I have a
	// magic auth token, let me through" keys. The route is
	// **not** session-gated today and reads zero auth keys.
	'/api/location/countries?token=anything',
	'/api/location/countries?secret=anything',
	'/api/location/countries?api_key=anything',
	'/api/location/countries?authorization=Bearer+anything',

	// Special-character values that would tempt a future regex
	// match, LIKE-prefix, or path-injection wiring. The route
	// does not pass any query value into SQL or the filesystem
	// today.
	'/api/location/countries?country=%3Cscript%3E',
	'/api/location/countries?country=%27%20OR%201%3D1',
	'/api/location/countries?country=%2F..%2F..%2Fetc%2Fpasswd',
	'/api/location/countries?country=%00',
	'/api/location/countries?q=%3Cscript%3E',
	'/api/location/countries?q=%27%20OR%201%3D1',

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs.
	`/api/location/countries?country=${'x'.repeat(500)}`,
	`/api/location/countries?q=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero keys, so
	// any combination of unknown keys must be silently ignored.
	'/api/location/countries?unknown=value',
	'/api/location/countries?foo=bar&baz=qux',
	'/api/location/countries?country=France&q=Fra&limit=10&token=alice&unknown=value',

	// Repeated keys — `searchParams.get(key)` returns the first
	// occurrence; even though the route reads no keys, future
	// regressions that begin reading them must still tolerate
	// repeats without crashing.
	'/api/location/countries?country=France&country=Germany',
	'/api/location/countries?q=Fra&q=Ger',
] as const;

test.describe('API: /api/location/countries public query-param surface', () => {
	for (const path of COUNTRIES_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// Every branch returns either 200 (feature on) or 404
			// (feature off). The catch-and-500 fallback must never
			// fire on a clean baseline.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/location/countries always returns either the feature-disabled 404 or the success envelope', async ({
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
		const response = await request.get('/api/location/countries');

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

	test('GET /api/location/countries response is invariant across every parametrised query string', async ({
		request,
	}) => {
		// The route reads zero query parameters today. Every value
		// in `COUNTRIES_QUERIES` must round-trip to the same body
		// the no-arg call returns. A regression that begins reading
		// `?country=…` / `?q=…` / `?limit=…` would produce a
		// divergent response and surface here.
		const baseline = await request.get('/api/location/countries');
		const baselineStatus = baseline.status();
		const baselineBody = await baseline.json();

		// Pick a representative subset across categories so the test
		// stays fast but still pins the invariant. Each entry below
		// represents one "the route does not read this" category.
		const samples = [
			'/api/location/countries?country=France',
			'/api/location/countries?countryCode=US',
			'/api/location/countries?city=Paris',
			'/api/location/countries?q=Fra',
			'/api/location/countries?limit=10',
			'/api/location/countries?sort=name',
			'/api/location/countries?locale=fr',
			'/api/location/countries?format=json',
			'/api/location/countries?fields=name',
			'/api/location/countries?tenant=acme',
			'/api/location/countries?refresh=1',
			'/api/location/countries?token=anything',
			'/api/location/countries?country=France&q=Fra&limit=10&token=alice&unknown=value',
		];

		for (const sample of samples) {
			const response = await request.get(sample);
			expect(response.status()).toBe(baselineStatus);

			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});

	test('GET /api/location/countries does NOT honour caller-supplied filter overrides', async ({
		request,
	}) => {
		// A future contributor who wires `?country=…` as a server-side
		// filter for `getDistinctCountries()` would silently grant
		// caller-controlled override of the data-layer query. This
		// test pins the "the route ignores filter keys" invariant by
		// asserting the response shape is the same whether the
		// caller supplies a filter that **definitely won't match
		// anything** or no filter at all.
		const baseline = await request.get('/api/location/countries');
		const baselineBody = await baseline.json();

		// A nonsensical filter that would produce an empty result
		// set if the route honoured it.
		const withFilter = await request.get(
			'/api/location/countries?country=__definitely-not-a-real-country__&q=__nope__&limit=0'
		);
		const withFilterBody = await withFilter.json();

		expect(withFilter.status()).toBe(baseline.status());
		expect(withFilterBody).toEqual(baselineBody);
	});

	test('GET /api/location/countries supports the parametrised matrix without leaking 5xx', async ({
		request,
	}) => {
		// Final sweep — confirm every parametrised query in the
		// matrix is below 500. Repeats the per-test status assertion
		// so a future maintainer can read the whole file as one
		// contract spec.
		const responses = await Promise.all(
			COUNTRIES_QUERIES.slice(0, 20).map((path) => request.get(path))
		);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
			expect([200, 404]).toContain(response.status());
		}
	});
});
