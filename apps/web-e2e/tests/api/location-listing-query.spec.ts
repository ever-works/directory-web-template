import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the public
 * Location *listing* endpoints — the two no-argument GET handlers:
 *
 *   - `apps/web/app/api/location/cities/route.ts` — distinct city
 *     names from the location index.
 *   - `apps/web/app/api/location/countries/route.ts` — distinct
 *     country names from the location index.
 *
 * Both routes are intentionally **no-arg** — the `GET()` function
 * signature is `export async function GET()` (no `request` parameter,
 * no `searchParams` read). The route's contract is therefore that
 * **any** query string the caller appends is silently ignored. The
 * existing [`location.spec.ts`](./location.spec.ts) covers the
 * no-param happy path for both endpoints; this spec walks the
 * **query-param surface** so a regression that introduces a typo'd
 * `request.nextUrl.searchParams.get(...)` call (which a future
 * filter-by-country-prefix or filter-by-locale change might tempt a
 * future contributor into adding) is caught immediately as a
 * non-200 / non-404 / 5xx response.
 *
 * The route has exactly two response branches:
 *
 *   - `getLocationEnabled() === false` → `404` +
 *     `{ success: false, error: 'Location features are disabled' }`.
 *     This is the most-likely branch in local dev unless the
 *     `LOCATION_ENABLED` environment flag is set.
 *   - `getLocationEnabled() === true` → `200` +
 *     `{ success: true, data: string[] }` (the array of distinct
 *     city / country names).
 *
 * The catch-and-500 fallback exists for the
 * `getDistinctCities()` / `getDistinctCountries()` data-layer call,
 * but on a clean baseline no query-param-only abuse should reach
 * that branch — the data layer never reads the request URL, so the
 * query string cannot influence whether the call throws. Any 5xx
 * here would indicate a regression at a layer below the route
 * handler (e.g. a Drizzle query builder that started reading
 * request-context globals).
 *
 * Payload shape and `Content-Type` are intentionally not asserted on
 * the bulk loop because the response toggles between
 * `{ success: false, error: 'Location features are disabled' }`
 * (feature gate fired) and `{ success: true, data: [...] }`
 * (feature enabled) depending on the active deployment's settings.
 * The two `always returns either ...` assertions at the bottom pin
 * the envelope shape for both endpoints once each.
 */
const LOCATION_LISTING_QUERIES = [
	// Baseline — same path as `location.spec.ts`. Included so the
	// query-param surface enumeration starts from the no-arg case.
	'/api/location/cities',
	'/api/location/countries',

	// `?city=` / `?country=` keys — these would be the obvious typo
	// for a future contributor who confuses the listing endpoints
	// with `/api/location/coordinates`. The listing routes never
	// read those keys, so the response must be identical to the
	// no-arg case.
	'/api/location/cities?city=Paris',
	'/api/location/cities?country=France',
	'/api/location/cities?city=Paris&country=France',
	'/api/location/countries?city=Paris',
	'/api/location/countries?country=France',
	'/api/location/countries?city=Paris&country=France',

	// `?prefix=` / `?q=` / `?search=` / `?filter=` — the obvious typed
	// query keys a future contributor might add when wiring up
	// type-ahead search. None of them are read today; all of them
	// must produce the same response as the no-arg case.
	'/api/location/cities?prefix=P',
	'/api/location/cities?q=Par',
	'/api/location/cities?search=Paris',
	'/api/location/cities?filter=name',
	'/api/location/countries?prefix=F',
	'/api/location/countries?q=Fra',
	'/api/location/countries?search=France',
	'/api/location/countries?filter=name',

	// `?limit=` / `?offset=` / `?page=` / `?pageSize=` — the obvious
	// pagination keys. The listing endpoints return the **full**
	// distinct list today and must continue to do so until a Spec Kit
	// change documents pagination as the new contract.
	'/api/location/cities?limit=10',
	'/api/location/cities?offset=5',
	'/api/location/cities?page=2',
	'/api/location/cities?pageSize=25',
	'/api/location/cities?limit=10&offset=5',
	'/api/location/cities?page=2&pageSize=25',
	'/api/location/countries?limit=10',
	'/api/location/countries?offset=5',
	'/api/location/countries?page=2',
	'/api/location/countries?pageSize=25',
	'/api/location/countries?limit=10&offset=5',
	'/api/location/countries?page=2&pageSize=25',

	// `?sort=` / `?order=` / `?direction=` — the obvious sort keys.
	// Today the route returns the data layer's natural ordering;
	// a future sort wiring would need a Spec Kit change.
	'/api/location/cities?sort=name',
	'/api/location/cities?sort=name&order=asc',
	'/api/location/cities?sort=name&order=desc',
	'/api/location/cities?direction=desc',
	'/api/location/countries?sort=name',
	'/api/location/countries?sort=name&order=asc',
	'/api/location/countries?sort=name&order=desc',
	'/api/location/countries?direction=desc',

	// `?locale=` / `?lang=` — the obvious i18n keys. Today the route
	// returns the un-localised distinct list. A future i18n wiring
	// would respect the host's `next-intl` locale, not a query
	// parameter — so these keys must remain ignored.
	'/api/location/cities?locale=en',
	'/api/location/cities?locale=fr',
	'/api/location/cities?lang=de',
	'/api/location/countries?locale=en',
	'/api/location/countries?locale=fr',
	'/api/location/countries?lang=de',

	// Empty values for any of the above keys. `searchParams.get(...)`
	// on `?key=` returns `''`, but the route never calls it — the
	// response must still be identical to the no-arg case.
	'/api/location/cities?prefix=',
	'/api/location/cities?q=',
	'/api/location/cities?limit=',
	'/api/location/countries?prefix=',
	'/api/location/countries?q=',
	'/api/location/countries?limit=',

	// Repeated keys — `searchParams.get(name)` would return the first
	// value, but the route never calls it. The response must remain
	// the no-arg case.
	'/api/location/cities?prefix=A&prefix=B',
	'/api/location/cities?limit=10&limit=20',
	'/api/location/countries?prefix=A&prefix=B',
	'/api/location/countries?limit=10&limit=20',

	// Special-character values that would tempt a future regex /
	// LIKE-prefix wiring. They must remain ignored.
	'/api/location/cities?prefix=%25', // %
	'/api/location/cities?prefix=%2F', // /
	'/api/location/cities?prefix=%5C', // \
	'/api/location/cities?prefix=%27', // '
	'/api/location/countries?prefix=%25',
	'/api/location/countries?prefix=%2F',
	'/api/location/countries?prefix=%5C',
	'/api/location/countries?prefix=%27',

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs. The route does
	// not read the value, so this should pass through to the no-arg
	// branch and respond either 200 or 404, never 5xx.
	`/api/location/cities?prefix=${'x'.repeat(500)}`,
	`/api/location/countries?prefix=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The route reads
	// nothing from the request URL, so any combination of unknown
	// keys is silently ignored.
	'/api/location/cities?unknown=value',
	'/api/location/cities?foo=bar&baz=qux',
	'/api/location/cities?city=Paris&unknown=value&foo=bar',
	'/api/location/countries?unknown=value',
	'/api/location/countries?foo=bar&baz=qux',
	'/api/location/countries?country=France&unknown=value&foo=bar',
] as const;

test.describe('API: /api/location/cities + /api/location/countries query-param surface', () => {
	for (const path of LOCATION_LISTING_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/location/cities always returns either the feature-disabled 404 or the success envelope', async ({
		request,
	}) => {
		// This single assertion spans every success branch because every
		// branch returns one of two well-formed envelopes:
		//   * `404` + `{ success: false, error: 'Location features are disabled' }`
		//     when the location feature is off (the most-likely branch in
		//     local dev unless `LOCATION_ENABLED` is set);
		//   * `200` + `{ success: true, data: string[] }` when the feature
		//     is on and the data layer succeeds.
		// Anything else (a 5xx, or a 200 with a missing `success` flag,
		// or a 200 with `data` not being an array of strings) would
		// indicate a regression in the route's response renderer.
		const response = await request.get('/api/location/cities');

		expect([200, 404]).toContain(response.status());

		const body = (await response.json()) as { success?: boolean; error?: string; data?: unknown };

		expect(body.success).toBeDefined();
		expect(typeof body.success).toBe('boolean');

		if (body.success === true) {
			expect(response.status()).toBe(200);
			expect(Array.isArray(body.data)).toBe(true);
			// Every entry, if any, must be a string. The data layer
			// returns `string[]` per `getDistinctCities` — a regression
			// here would indicate the data layer started returning
			// `{ name: string }[]` or similar.
			for (const entry of body.data as unknown[]) {
				expect(typeof entry).toBe('string');
			}
		} else {
			expect(response.status()).toBe(404);
			expect(typeof body.error).toBe('string');
		}
	});

	test('GET /api/location/countries always returns either the feature-disabled 404 or the success envelope', async ({
		request,
	}) => {
		// Same envelope contract as the cities endpoint. The two routes
		// are deliberately symmetric in shape — `getDistinctCities` and
		// `getDistinctCountries` are sibling data-layer calls — so the
		// response renderer should produce an identically-shaped
		// success / failure envelope.
		const response = await request.get('/api/location/countries');

		expect([200, 404]).toContain(response.status());

		const body = (await response.json()) as { success?: boolean; error?: string; data?: unknown };

		expect(body.success).toBeDefined();
		expect(typeof body.success).toBe('boolean');

		if (body.success === true) {
			expect(response.status()).toBe(200);
			expect(Array.isArray(body.data)).toBe(true);
			for (const entry of body.data as unknown[]) {
				expect(typeof entry).toBe('string');
			}
		} else {
			expect(response.status()).toBe(404);
			expect(typeof body.error).toBe('string');
		}
	});

	test('GET /api/location/cities responds identically with and without bogus query parameters', async ({
		request,
	}) => {
		// The route never reads the request URL, so adding any query
		// parameters must not change the response status. We compare
		// the no-arg response against a heavily-parameterised one and
		// assert the **status code** matches. Body content is
		// intentionally not asserted to be byte-identical because the
		// data layer's natural ordering may shift between calls if a
		// concurrent admin write lands between the two requests in a
		// production-like environment; the status-code invariant is the
		// load-bearing one for this contract.
		const baseline = await request.get('/api/location/cities');
		const parameterised = await request.get(
			'/api/location/cities?prefix=P&limit=10&offset=5&sort=name&order=asc&locale=en&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/location/countries responds identically with and without bogus query parameters', async ({
		request,
	}) => {
		const baseline = await request.get('/api/location/countries');
		const parameterised = await request.get(
			'/api/location/countries?prefix=F&limit=10&offset=5&sort=name&order=asc&locale=en&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});
});
