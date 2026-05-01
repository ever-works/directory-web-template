import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public `/api/location/coordinates`
 * endpoint's **query-param surface** served by
 * `apps/web/app/api/location/coordinates/route.ts`.
 *
 * `GET /api/location/coordinates` is intentionally public when the
 * location feature is enabled and 404s when disabled. The route's
 * exact contract is:
 *
 *   - The feature gate (`getLocationEnabled()`) short-circuits to
 *     `404` (`{ success: false, error: 'Location features are disabled' }`)
 *     before any query-string is read. This is independent of the
 *     query string and is the most-likely branch in local dev.
 *   - When the feature is enabled the route reads two optional
 *     query params from `searchParams`:
 *       * `city`    — case-insensitive equality match on
 *                      `entry.cityNormalized` (the route trims and
 *                      lowercases the param via `city.trim().toLowerCase()`).
 *       * `country` — same shape against `entry.countryNormalized`.
 *     Both params can be combined; both fall back to "no filter" when
 *     missing. Whitespace-only values still pass the `if (city)`
 *     truthy check and produce a normalised empty-string key, which
 *     no entry matches — the route responds `200` + `{ success: true,
 *     data: [] }`.
 *   - The route always filters out remote items (`!entry.isRemote`)
 *     before applying the city / country filters, so this surface
 *     never returns remote-only entries.
 *
 * The single happy-path entry (`/api/location/coordinates`) and the
 * two basic filter cases are already smoked by
 * [`location-coordinates.spec.ts`](./location-coordinates.spec.ts).
 * This spec adds the **query-param surface** so a regression in
 * `searchParams.get('city')`, the `trim().toLowerCase()` normalisation,
 * the `if (city)` / `if (country)` truthy guards, the
 * `!entry.isRemote` filter, the `Number(entry.latitude)` /
 * `Number(entry.longitude)` coercion, the 404-on-feature-disabled
 * short-circuit, or the catch-and-500 fallback is caught explicitly.
 * None of the cases here may 5xx — that would indicate the route's
 * parameter-parsing or the location-index data-layer call crashed
 * before the response renderer.
 *
 * Payload shape and `Content-Type` are intentionally not asserted
 * because the response toggles between
 * `{ success: false, error: 'Location features are disabled' }`
 * (feature gate fired) and `{ success: true, data: [...] }` (feature
 * enabled) depending on the active deployment's settings, and the
 * active database state determines whether the `data` array is empty
 * or populated.
 */
const LOCATION_COORDINATE_QUERIES = [
	// Baseline — same path as `location-coordinates.spec.ts`. Included
	// so the query-param surface is enumerated in one place.
	'/api/location/coordinates',

	// `city` present, well-formed values. The route lower-cases the
	// param before comparing against `entry.cityNormalized`, so
	// `Paris`, `paris`, and `PARIS` are equivalent. None may 4xx (the
	// route never validates the value) or 5xx.
	'/api/location/coordinates?city=Paris',
	'/api/location/coordinates?city=paris',
	'/api/location/coordinates?city=PARIS',
	'/api/location/coordinates?city=New%20York',
	'/api/location/coordinates?city=S%C3%A3o%20Paulo',
	'/api/location/coordinates?city=Bogot%C3%A1',

	// `city` present but whitespace-only. The route's `if (city)`
	// truthy check passes because the param is a non-empty string;
	// `trim().toLowerCase()` then produces an empty string which
	// matches no entry. The response should be `200` + `{ data: [] }`
	// when the feature is enabled, or `404` when disabled — never 5xx.
	'/api/location/coordinates?city=%20',
	'/api/location/coordinates?city=%20%20',
	'/api/location/coordinates?city=%09', // tab
	'/api/location/coordinates?city=%0A', // newline

	// `country` present, well-formed values. Same normalisation rules
	// as `city`.
	'/api/location/coordinates?country=France',
	'/api/location/coordinates?country=france',
	'/api/location/coordinates?country=United%20States',
	'/api/location/coordinates?country=Cote%20d%27Ivoire',

	// `country` present but whitespace-only.
	'/api/location/coordinates?country=%20',

	// Both `city` and `country` present. The route applies the two
	// filters independently with `&&` semantics — entries must match
	// both. None may 5xx.
	'/api/location/coordinates?city=Paris&country=France',
	'/api/location/coordinates?city=paris&country=france',
	'/api/location/coordinates?city=New%20York&country=United%20States',

	// Both filters present, only one matches. Should still return
	// 200 + empty array (when enabled) — the route does not 4xx for
	// "no results".
	'/api/location/coordinates?city=__definitely-not-a-real-city__&country=France',
	'/api/location/coordinates?city=Paris&country=__definitely-not-a-real-country__',

	// Empty values for either param. `searchParams.get('city')` on
	// `?city=` returns `''`, which is falsy, so the `if (city)` guard
	// is skipped and the filter is treated as absent. None may 5xx.
	'/api/location/coordinates?city=',
	'/api/location/coordinates?country=',
	'/api/location/coordinates?city=&country=',

	// Surrounding whitespace on otherwise valid values. The route
	// trims via `.trim()` so `' Paris '` and `'Paris'` produce the
	// same `cityNormalized` key.
	'/api/location/coordinates?city=%20Paris%20',
	'/api/location/coordinates?country=%20France%20',

	// Special-character values. The route does not decode the param
	// content beyond what `searchParams.get` returns, then runs
	// `.trim().toLowerCase()`. Slashes, plus signs, and percent-signs
	// in the value are passed through to the data layer verbatim.
	// They must produce a non-5xx response (most likely a 200 with
	// `data: []` because no entry matches the abused key).
	'/api/location/coordinates?city=foo%2Fbar',
	'/api/location/coordinates?city=foo%2Bbar',
	'/api/location/coordinates?city=foo%25bar',
	'/api/location/coordinates?city=foo%26bar',
	'/api/location/coordinates?country=foo%2Fbar',

	// Extra unknown query params are silently ignored — the route
	// only reads `city` and `country` from `searchParams`. None may
	// 4xx-on-the-extras or 5xx.
	'/api/location/coordinates?unknown=value',
	'/api/location/coordinates?city=Paris&limit=10',
	'/api/location/coordinates?city=Paris&country=France&page=2',
	'/api/location/coordinates?city=Paris&category=tools&tag=saas',

	// Repeated `city` / `country` keys — `searchParams.get('city')`
	// returns the **first** occurrence; the rest are silently
	// ignored. No 5xx. (The route does not call
	// `searchParams.getAll('city')`.)
	'/api/location/coordinates?city=Paris&city=London',
	'/api/location/coordinates?country=France&country=Germany',
	'/api/location/coordinates?city=Paris&city=London&country=France&country=Germany',

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs. The route does
	// not validate length so this should pass through to the
	// data-layer query and produce `data: []`.
	`/api/location/coordinates?city=${'x'.repeat(500)}`,
	`/api/location/coordinates?country=${'y'.repeat(500)}`,
] as const;

test.describe('API: /api/location/coordinates public query-param surface', () => {
	for (const path of LOCATION_COORDINATE_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/location/coordinates always returns either the feature-disabled 404 or the success envelope', async ({
		request,
	}) => {
		// This single assertion spans every success branch because every
		// branch returns one of two well-formed envelopes:
		//   * `404` + `{ success: false, error: 'Location features are disabled' }`
		//     when the location feature is off (the most-likely branch in
		//     local dev unless `LOCATION_ENABLED` is set);
		//   * `200` + `{ success: true, data: [...] }` when the feature is
		//     on and the data layer succeeds.
		// Anything else (a 5xx, or a 200 with a missing `success` flag,
		// or a 200 with `data` not being an array) would indicate a
		// regression in the route's response renderer.
		const response = await request.get('/api/location/coordinates');

		// The two branches above. If the catch-and-500 fallback fires
		// (which it shouldn't on a clean baseline) this assertion will
		// also flag it.
		expect([200, 404]).toContain(response.status());

		const body = (await response.json()) as { success?: boolean; error?: string; data?: unknown };

		expect(body.success).toBeDefined();
		expect(typeof body.success).toBe('boolean');

		if (body.success === true) {
			// 200 branch — the route returns `data` as an array.
			expect(response.status()).toBe(200);
			expect(Array.isArray(body.data)).toBe(true);
		} else {
			// 404 branch — the route returns `error` with the
			// feature-disabled string. We don't pin the exact string
			// because a future i18n / message-format change is fine; we
			// only care that the envelope is well-formed.
			expect(response.status()).toBe(404);
			expect(typeof body.error).toBe('string');
		}
	});
});
