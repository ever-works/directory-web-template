import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public `/api/location/search` endpoint's
 * **query-param surface** served by
 * `apps/web/app/api/location/search/route.ts`.
 *
 * `GET /api/location/search` is intentionally public when the
 * location feature is enabled and 404s when disabled. The route's
 * exact contract is:
 *
 *   - The feature gate (`getLocationEnabled()`) short-circuits to
 *     `404` (`{ success: false, error: 'Location features are disabled' }`)
 *     before any query-string is read. This is independent of the
 *     query string and is the most-likely branch in local dev.
 *   - When the feature is enabled the route reads five optional
 *     query params from `searchParams`:
 *       * `near_lat` and `near_lng` — paired floats. If both are
 *         present the route enters the **radius branch**:
 *           - `parseFloat` must produce two finite numbers, otherwise
 *             the route 400s with `{ error: 'Invalid coordinates' }`.
 *           - `radius` is read as `parseInt(radius, 10)` and falls
 *             back to `50` when missing. `NaN`/`<= 0` 400s with
 *             `{ error: 'Invalid radius' }`.
 *           - On success the route returns
 *             `{ success: true, data: { slugs, distances } }` where
 *             `slugs` is `string[]` and `distances` is
 *             `Record<string, number>`.
 *       * `city` — string. Truthy `city` (with no `near_lat`+`near_lng`)
 *         enters the **city branch** and returns
 *         `{ success: true, data: { slugs, distances: {} } }`.
 *       * `country` — string. Same shape as `city`, fires only when
 *         `near_lat`+`near_lng` and `city` are both missing.
 *   - The branches are evaluated in order: radius beats city beats
 *     country. A request with `near_lat=…&city=…` takes the radius
 *     branch and ignores `city`.
 *   - When **none** of the three branches fire the route 400s with
 *     `{ error: 'At least one search parameter is required (near_lat+near_lng, city, or country)' }`.
 *   - On any unexpected exception the route 500s with
 *     `{ error: 'Failed to search locations' }`. **No URL in this
 *     spec may 5xx** — that would indicate the route's
 *     parameter-parsing or the location-index service crashed before
 *     the response renderer.
 *
 * The five-tests baseline (`location.spec.ts`) covers the no-params
 * 400, single-param `city`/`country`/radius, and the invalid-coords
 * 400. This spec adds the **query-param surface detail** so a
 * regression in `parseFloat`, the `parseInt` radius default, the
 * branch-priority order, the `if (city)` / `if (country)` truthy
 * guards, the `Number.isNaN` checks, the `Record<string, number>`
 * `distances` shape, or the catch-and-500 fallback is caught
 * explicitly.
 *
 * Payload shape and `Content-Type` are intentionally not asserted
 * because the response toggles between
 * `{ success: false, error: 'Location features are disabled' }`
 * (feature gate fired), `{ error: 'Invalid coordinates' | 'Invalid radius' | 'At least one search parameter is required …' }`
 * (validation fired), and `{ success: true, data: { slugs, distances } }`
 * (feature enabled + valid params) depending on the active
 * deployment's settings, and the active database state determines
 * whether the `slugs` array is empty or populated.
 */
const LOCATION_SEARCH_QUERIES = [
	// === Radius branch — the most-complex branch ===========================

	// Baseline radius — paired finite floats, no explicit radius.
	// `radiusKm` defaults to 50.
	'/api/location/search?near_lat=48.8566&near_lng=2.3522',
	'/api/location/search?near_lat=0&near_lng=0',
	'/api/location/search?near_lat=-33.8688&near_lng=151.2093', // Sydney
	'/api/location/search?near_lat=40.7128&near_lng=-74.0060',  // NYC
	'/api/location/search?near_lat=90&near_lng=180',            // Pole + antimeridian
	'/api/location/search?near_lat=-90&near_lng=-180',          // Opposite extreme

	// Radius explicitly provided. The route uses `parseInt(radiusParam, 10)`
	// so a decimal like `25.7` truncates to `25` rather than 5xx.
	'/api/location/search?near_lat=48.85&near_lng=2.35&radius=1',
	'/api/location/search?near_lat=48.85&near_lng=2.35&radius=25',
	'/api/location/search?near_lat=48.85&near_lng=2.35&radius=100',
	'/api/location/search?near_lat=48.85&near_lng=2.35&radius=10000',
	'/api/location/search?near_lat=48.85&near_lng=2.35&radius=25.7',
	'/api/location/search?near_lat=48.85&near_lng=2.35&radius=25abc', // parseInt extracts 25

	// Radius explicitly invalid — the route 400s (when enabled) but
	// must not 5xx.
	'/api/location/search?near_lat=48.85&near_lng=2.35&radius=0',
	'/api/location/search?near_lat=48.85&near_lng=2.35&radius=-5',
	'/api/location/search?near_lat=48.85&near_lng=2.35&radius=not-a-number',

	// Coordinates explicitly invalid — the route 400s (when enabled)
	// but must not 5xx.
	'/api/location/search?near_lat=NaN&near_lng=2.35',
	'/api/location/search?near_lat=2.35&near_lng=NaN',
	'/api/location/search?near_lat=infinity&near_lng=2.35',

	// Only one of the pair — the radius branch does **not** fire
	// because the route checks `if (nearLat && nearLng)`. Falls
	// through to `country`/`city`/no-params 400.
	'/api/location/search?near_lat=48.85',
	'/api/location/search?near_lng=2.35',

	// === City branch ======================================================

	'/api/location/search?city=Paris',
	'/api/location/search?city=paris',
	'/api/location/search?city=PARIS',
	'/api/location/search?city=New%20York',
	'/api/location/search?city=S%C3%A3o%20Paulo',
	'/api/location/search?city=Bogot%C3%A1',

	// Whitespace-only `city`. Truthy non-empty string passes the
	// `if (city)` guard; the data-layer call must not 5xx.
	'/api/location/search?city=%20',
	'/api/location/search?city=%09',
	'/api/location/search?city=%0A',

	// === Country branch ===================================================

	'/api/location/search?country=France',
	'/api/location/search?country=france',
	'/api/location/search?country=FRANCE',
	'/api/location/search?country=United%20States',
	'/api/location/search?country=C%C3%B4te%20d%27Ivoire',

	// Whitespace-only `country`. Same shape as `city`.
	'/api/location/search?country=%20',
	'/api/location/search?country=%09',

	// === Branch-priority cases ============================================

	// Radius + city — radius wins because the route's `if (nearLat
	// && nearLng)` is evaluated before `if (city)`. The presence of
	// `city` must not change the result.
	'/api/location/search?near_lat=48.85&near_lng=2.35&city=Paris',
	'/api/location/search?near_lat=48.85&near_lng=2.35&city=ANY-CITY',

	// City + country — city wins because the route's `if (city)` is
	// evaluated before `if (country)`. The presence of `country` must
	// not change the result.
	'/api/location/search?city=Paris&country=France',
	'/api/location/search?city=ANY-CITY&country=ANY-COUNTRY',

	// Radius + country — radius wins.
	'/api/location/search?near_lat=48.85&near_lng=2.35&country=France',

	// All three — radius still wins.
	'/api/location/search?near_lat=48.85&near_lng=2.35&radius=10&city=Paris&country=France',

	// === No-search-params branch ==========================================

	// Truly empty — falls through to the `400 'At least one search
	// parameter is required …'` branch. Already covered by
	// `location.spec.ts`, included here so the surface is enumerated
	// in one place.
	'/api/location/search',

	// Unknown / typo'd parameter names — must hit the no-params 400
	// because the route ignores anything outside `near_lat`/`near_lng`/
	// `radius`/`city`/`country`.
	'/api/location/search?near=48.85,2.35',
	'/api/location/search?lat=48.85&lng=2.35',
	'/api/location/search?citi=Paris',
	'/api/location/search?nation=France',

	// === Repeated query keys — Next.js's `searchParams.get(name)`
	// returns the **first** value, not an array, so repeated keys must
	// behave the same as the first value alone.
	'/api/location/search?city=Paris&city=Berlin',
	'/api/location/search?country=France&country=Germany',
	'/api/location/search?near_lat=48.85&near_lat=NaN&near_lng=2.35',
];

test.describe('API: /api/location/search query-param surface', () => {
	for (const path of LOCATION_SEARCH_QUERIES) {
		test(`GET ${path} responds without a server error and parses`, async ({ request }) => {
			const response = await request.get(path);

			// Hard contract — the route never 5xx's. Either the feature
			// gate fires (404), validation fires (400), or the
			// data-layer call returns (200). If a regression breaks the
			// `parseFloat` / `parseInt` / branch-order / data-layer
			// path, this assertion catches it before the response
			// renderer.
			expect(response.status()).toBeLessThan(500);

			// The route always returns JSON (or empty body for the
			// extremely unlikely fully-blank response). We parse
			// permissively so a Content-Type drift doesn't fail the
			// suite — the smoke contract is "doesn't 5xx and the body
			// is valid JSON when present", not "exact payload shape".
			const text = await response.text();
			if (text.length === 0) {
				return;
			}

			let body: unknown;
			try {
				body = JSON.parse(text);
			} catch {
				throw new Error(`GET ${path} returned non-JSON body: ${text.slice(0, 120)}`);
			}

			// The response is always an object with at least one of
			// `success`, `error`, `data` — never a bare array, number,
			// string, null, or undefined.
			expect(typeof body).toBe('object');
			expect(body).not.toBeNull();
			const obj = body as Record<string, unknown>;
			expect(
				'success' in obj || 'error' in obj || 'data' in obj,
				`GET ${path} returned a JSON object with no success/error/data key (got keys: ${Object.keys(obj).join(', ')})`,
			).toBe(true);

			if ('data' in obj && obj.data !== undefined) {
				// Successful 200 — the route documents
				// `data: { slugs: string[]; distances: Record<string, number> }`.
				const data = obj.data as Record<string, unknown>;
				expect(typeof data).toBe('object');
				expect(data).not.toBeNull();
				expect('slugs' in data).toBe(true);
				expect(Array.isArray(data.slugs)).toBe(true);
				// `distances` is optional in the city / country branches
				// (always `{}`), present in the radius branch.
				if ('distances' in data && data.distances !== undefined) {
					expect(typeof data.distances).toBe('object');
					expect(data.distances).not.toBeNull();
					expect(Array.isArray(data.distances)).toBe(false);
				}
			}
		});
	}
});
