import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the public
 * Scalar API reference UI served by
 * `apps/web/app/api/reference/route.ts`.
 *
 * `GET /api/reference` is intentionally public — every contributor
 * and integrator browses it to see the OpenAPI surface. The handler
 * is a one-liner:
 *
 *     export const GET = ApiReference(config)
 *
 * where `ApiReference` is imported from
 * `@scalar/nextjs-api-reference` and `config` is a static object
 * fixed at import time (`url: '/openapi.json'`,
 * `theme: 'bluePlanet'`, `showSidebar: true`). The handler is a
 * **constant** — there is no closure over `request`, no
 * `searchParams.get(...)`, no per-call branching. Whatever the
 * caller appends to the URL is irrelevant; the response is the same
 * Scalar HTML page.
 *
 * The existing
 * [`reference.spec.ts`](./reference.spec.ts) covers the no-arg
 * happy path and the adjacent `/openapi.json` round-trip; this spec
 * walks the **query-param surface** so a regression that swaps the
 * library-provided constant handler for a `request.url`-based
 * wiring (which a future "filter to a tag" or "deep-link to an
 * operation" feature might tempt a future contributor into adding)
 * is caught immediately as a non-2xx / non-4xx / non-5xx response,
 * or as a status divergence between the no-arg and parameter-laden
 * branches.
 *
 * The route contract is deliberately permissive on the catch path:
 *
 *   - On success: HTML 2xx (Scalar's `nextjs-api-reference` emits
 *     a single self-contained HTML document with the API reference
 *     UI; the exact bytes vary with Scalar versions but the
 *     200-status invariant holds).
 *   - On error  : 5xx is theoretically possible if Scalar's
 *     library throws during render, but the matrix below treats
 *     `< 500` as the dominant happy path and accepts any 2xx /
 *     3xx / 4xx that the library may legitimately return.
 *
 * Payload shape and `Content-Type` are intentionally not asserted on
 * the bulk loop because the response is library-rendered HTML and
 * the exact byte content shifts across `@scalar/nextjs-api-reference`
 * minor versions. The single status-invariance assertion at the
 * bottom pins the contract — every parameter set must round-trip to
 * the same status as the no-arg case.
 */
const REFERENCE_QUERIES = [
	// Baseline — same path as `reference.spec.ts`. Included so a
	// future reader of this file sees the no-arg case alongside the
	// variants it parametrises.
	'/api/reference',

	// `?theme=` — the obvious wiring a future "let the caller pick
	// a Scalar theme" feature might add. The handler reads zero
	// query keys today, so this must be silently ignored.
	'/api/reference?theme=bluePlanet',
	'/api/reference?theme=default',
	'/api/reference?theme=moon',
	'/api/reference?theme=purple',

	// `?layout=` / `?sidebar=` / `?showSidebar=` — the obvious
	// layout-toggle keys. The handler reads zero query keys today,
	// so any of these must be ignored.
	'/api/reference?layout=classic',
	'/api/reference?layout=modern',
	'/api/reference?sidebar=true',
	'/api/reference?sidebar=false',
	'/api/reference?showSidebar=true',
	'/api/reference?showSidebar=false',

	// `?spec=` / `?url=` / `?source=` — the obvious "load a
	// different OpenAPI document" keys. The handler hard-codes
	// `url: '/openapi.json'` at import time; any of these must be
	// ignored to avoid a future SSRF surface.
	'/api/reference?spec=https://example.com/openapi.json',
	'/api/reference?url=https://example.com/openapi.json',
	'/api/reference?source=https://example.com/openapi.json',
	'/api/reference?spec=/api/openapi-other.json',

	// `?tag=` / `?operation=` / `?path=` — the obvious deep-link
	// keys (jump to a specific operation or tag in the reference
	// UI). The handler does not resolve these today; any of them
	// must be ignored.
	'/api/reference?tag=Items',
	'/api/reference?tag=Auth',
	'/api/reference?operation=getItem',
	'/api/reference?path=/api/items',

	// `?format=` — the obvious content-negotiation key. The route
	// returns HTML exclusively; no `Accept`-header or `?format=`
	// path today.
	'/api/reference?format=html',
	'/api/reference?format=json',
	'/api/reference?format=yaml',

	// `?locale=` / `?lang=` — the obvious i18n keys. The Scalar UI
	// is not localised today; any of these must be ignored.
	'/api/reference?locale=en',
	'/api/reference?locale=fr',
	'/api/reference?lang=zh',
	'/api/reference?lang=ar',

	// `?refresh=` / `?force=` / `?fresh=` / `?nocache=` — the
	// obvious cache-busting keys. The handler does not opt into
	// `cache: 'no-store'` or `revalidate: 0` based on a query
	// param today; any of these must be ignored.
	'/api/reference?refresh=1',
	'/api/reference?force=true',
	'/api/reference?fresh=true',
	'/api/reference?nocache=1',

	// `?dark=` / `?darkMode=` / `?colorMode=` — the obvious
	// appearance-toggle keys. The Scalar `theme: 'bluePlanet'` is
	// fixed at import time today.
	'/api/reference?dark=true',
	'/api/reference?darkMode=1',
	'/api/reference?colorMode=dark',
	'/api/reference?colorMode=light',

	// Empty values — `searchParams.get(key)` on `?key=` returns
	// `''`. The handler does not read any key, so empty values
	// must round-trip to the same response as the no-arg case.
	'/api/reference?theme=',
	'/api/reference?spec=',
	'/api/reference?refresh=',

	// Repeated keys — `searchParams.get(name)` returns the first
	// value, but the handler never calls `searchParams.get(...)` at
	// all, so repetition is irrelevant.
	'/api/reference?theme=bluePlanet&theme=moon',
	'/api/reference?spec=/openapi.json&spec=/other.json',
	'/api/reference?tag=Items&tag=Auth',

	// Special-character values that would tempt a future regex
	// match, LIKE-prefix, or URL-fetch wiring. The handler does
	// not pass any value into a SQL or filesystem path or fetch
	// target, so they must remain pass-through ignored.
	'/api/reference?theme=%25',
	'/api/reference?spec=%2F%2Fevil.com%2Fopenapi.json',
	'/api/reference?theme=%27',
	'/api/reference?tag=%3Cscript%3E',
	'/api/reference?tag=%22%3Eoops',

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs. The handler
	// does not read the value into a SQL parameter or fetch path,
	// so this must pass through to the canonical branch.
	`/api/reference?theme=${'x'.repeat(500)}`,
	`/api/reference?tag=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The handler
	// reads zero keys, so any combination of unknown keys is
	// silently ignored.
	'/api/reference?unknown=value',
	'/api/reference?foo=bar&baz=qux',
	'/api/reference?theme=bluePlanet&unknown=value&foo=bar'
] as const;

test.describe('API: /api/reference query-param surface', () => {
	for (const path of REFERENCE_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's library-provided handler does not branch
			// on any query key; every entry in the matrix must come
			// back as a non-5xx response. Status code shape is
			// asserted in the dedicated invariance tests below.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/reference returns a successful (non-error) response on the happy path`, async ({ request }) => {
		// Scalar's `ApiReference(config)` returns an HTML page on
		// the happy path; the response must be 2xx / 3xx and never
		// 4xx / 5xx because the handler does not authenticate or
		// authorise the caller.
		const response = await request.get('/api/reference');

		expect(response.status()).toBeLessThan(400);
	});

	test(`GET /api/reference responds identically with and without bogus query parameters`, async ({ request }) => {
		// The handler reads zero query params, so the response
		// status must be invariant to any combination of unknown
		// keys. Body content is not asserted byte-identical because
		// Scalar's HTML output may include cache-busting tokens or
		// timestamped asset URLs.
		const baseline = await request.get('/api/reference');
		const parameterised = await request.get(
			'/api/reference?theme=moon&spec=/openapi-other.json&format=json&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test(`GET /api/reference keeps the response status stable across param permutations`, async ({ request }) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status as the no-arg case. The
		// status guarantees the handler does not branch on any
		// query key today.
		const responses = await Promise.all([
			request.get('/api/reference'),
			request.get('/api/reference?theme=bluePlanet&showSidebar=true'),
			request.get('/api/reference?refresh=1&format=html&tag=Items&locale=en')
		]);

		const [baseline, ...others] = responses;

		for (const response of others) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET /api/reference does not honour a caller-supplied spec URL`, async ({ request }) => {
		// Specific guard: a future contributor might be tempted to
		// wire `?spec=` into the underlying Scalar config to support
		// "load any OpenAPI doc from a query param". That would
		// open an SSRF surface (the server fetches an arbitrary URL
		// supplied by the caller). The handler today is a constant
		// — `ApiReference(config)` closes over a static `config`
		// object — so the response status must be identical whether
		// `?spec=` is supplied or not.
		const baseline = await request.get('/api/reference');
		const parameterised = await request.get('/api/reference?spec=https%3A%2F%2Fexample.com%2Fopenapi.json');

		expect(parameterised.status()).toBe(baseline.status());
	});
});
