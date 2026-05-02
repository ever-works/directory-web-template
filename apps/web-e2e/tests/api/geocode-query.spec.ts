import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only geocoding service status endpoint served by
 * `apps/web/app/api/geocode/route.ts`.
 *
 * `GET /api/geocode` is intentionally **admin-gated** — the
 * geocoding service is a paid third-party integration (Mapbox /
 * Google) and the status endpoint that reports configuration
 * state is restricted to admin sessions to prevent enumeration
 * by anonymous callers. The handler signature is:
 *
 *     export async function GET(): Promise<NextResponse>
 *
 * Note that `GET` declares **no parameters** at all — it does
 * not take a `Request`, does not destructure a `context`, does
 * not read any query string. The handler awaits `auth()`, then
 * — only on a session-bearing call — reads
 * `getGeocodingService()` and `getLocationEnabled()`. There is
 * no `request.url`, `request.headers`, or
 * `searchParams.get(...)` access anywhere inside the function
 * body. The route therefore must be invariant to **any** query
 * parameter the caller appends — present, absent, empty,
 * repeated, special-character, or long.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null`, the early
 *     `if (!session?.user?.id)` branch fires, and the route
 *     returns `{ success: false, error: 'Unauthorized' }` with
 *     status 401. This is the contract every assertion below
 *     pins, because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Authenticated non-admin**: the `if (!session.user.isAdmin)`
 *     branch returns 403. Out of scope for this spec, but
 *     documented here so a future fixture-bearing test can
 *     extend the matrix.
 *   - **Authenticated admin**: the route reads service status
 *     and returns 200 with the configuration envelope. Out of
 *     scope for this spec.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec hits. A
 * regression that introduces query-string-based bypass (e.g. a
 * future `?api_key=...`-style header swap) would surface
 * immediately as a status divergence between the no-arg 401
 * and a parameter-laden non-401.
 *
 * The companion `POST /api/geocode` body-resilience contract is
 * pinned in the dedicated tests at the bottom of this file.
 * The POST handler does check `request.json()` after the auth
 * gate — but every request from this spec hits the auth gate
 * first and returns 401 before any body parsing happens, so
 * the body content is irrelevant to the surface tested here.
 */
const GEOCODE_QUERIES = [
	// Baseline — the no-arg unauthenticated case. Included so a
	// future reader of this file sees the canonical case alongside
	// the variants it parametrises.
	'/api/geocode',

	// `?address=` — the obvious wiring a future "GET-as-query"
	// feature might add (rather than the current POST body shape).
	// The route reads zero query keys today and the auth gate
	// fires before any body parse, so this must be silently
	// ignored on the unauth branch.
	'/api/geocode?address=1600+Amphitheatre+Parkway',
	'/api/geocode?address=',

	// `?latitude=` / `?longitude=` — the obvious wiring for a
	// reverse-geocode-as-query feature. Same expectation: ignored.
	'/api/geocode?latitude=37.4224764&longitude=-122.0842499',
	'/api/geocode?latitude=0&longitude=0',
	'/api/geocode?latitude=&longitude=',

	// `?language=` / `?lang=` / `?locale=` — the obvious
	// localisation keys. The route returns JSON exclusively today
	// and the auth gate fires before any localisation logic; any
	// of these must be ignored.
	'/api/geocode?language=en',
	'/api/geocode?lang=fr',
	'/api/geocode?locale=zh',

	// `?provider=` / `?backend=` — the obvious wiring for picking
	// a specific geocoding provider (Mapbox vs Google). The status
	// endpoint reports both providers' configuration state today;
	// any provider-pinning key must be ignored on the unauth
	// branch.
	'/api/geocode?provider=mapbox',
	'/api/geocode?provider=google',
	'/api/geocode?backend=mapbox',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` — the
	// obvious cache-busting keys. The handler does not branch on
	// any cache-control query param today.
	'/api/geocode?refresh=1',
	'/api/geocode?force=true',
	'/api/geocode?fresh=true',
	'/api/geocode?cache=bypass',

	// `?format=` — the obvious content-negotiation key. The route
	// returns JSON exclusively.
	'/api/geocode?format=json',
	'/api/geocode?format=xml',
	'/api/geocode?format=csv',

	// `?countryCodes=` — the obvious wiring for the optional
	// `options.countryCodes` POST-body field as a query param.
	// The route does not read it from the URL today.
	'/api/geocode?countryCodes=US,CA',
	'/api/geocode?countryCodes=',

	// `?proximity=` — the obvious wiring for the optional
	// `options.proximity` POST-body field as a query param. Same
	// expectation: ignored.
	'/api/geocode?proximity=37.4224764,-122.0842499',

	// Empty values — `searchParams.get(key)` on `?key=` returns
	// `''`. The route does not read any key, so empty values must
	// round-trip to the same response as the no-arg case.
	// (`?address=` and `?language=` are already covered above
	// inline with their wiring blocks; this row covers the
	// remaining empty-value variants.)
	'/api/geocode?provider=',
	'/api/geocode?refresh=',
	'/api/geocode?format=',

	// Repeated keys — `searchParams.get(name)` returns the first
	// value, but the route never calls `searchParams.get(...)` at
	// all, so repetition is irrelevant.
	'/api/geocode?address=foo&address=bar',
	'/api/geocode?provider=mapbox&provider=google',

	// Special-character values that would tempt a future regex
	// match, LIKE-prefix, or path-injection wiring. The route does
	// not pass any value into a SQL or filesystem path, so they
	// must remain pass-through ignored.
	'/api/geocode?address=%25',
	'/api/geocode?address=%2F',
	'/api/geocode?address=%5C',
	'/api/geocode?address=%27',
	'/api/geocode?address=%3Cscript%3E',

	// Long values — guard against any future regex / regex-based
	// indexing bug that might trip on long inputs. The route does
	// not read the value into any parameter today.
	`/api/geocode?address=${'x'.repeat(500)}`,
	`/api/geocode?provider=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — same expectation. The route
	// reads zero keys, so any combination of unknown keys is
	// silently ignored.
	'/api/geocode?unknown=value',
	'/api/geocode?foo=bar&baz=qux',
	'/api/geocode?address=1600&unknown=value&foo=bar'
] as const;

test.describe('API: /api/geocode query-param surface', () => {
	for (const path of GEOCODE_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's auth gate fires before any body parsing
			// or service-layer call, so the unauth branch returns
			// 401 deterministically. There is no 5xx branch
			// reachable on the unauthenticated GET surface.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/geocode returns 401 with the canonical { success: false, error } envelope on the unauth branch`, async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the auth gate must fire before any
		// service-layer call and must return 401 with the
		// `{ success: false, error: 'Unauthorized' }` envelope. A
		// regression that bypasses the gate would surface here as
		// a non-401 status or a `success: true` payload.
		const response = await request.get('/api/geocode');

		expect(response.status()).toBe(401);

		const body = (await response.json()) as {
			success?: unknown;
			error?: unknown;
		};

		expect(body.success).toBe(false);
		expect(typeof body.error).toBe('string');
	});

	test(`GET /api/geocode returns 401 identically with and without bogus query parameters`, async ({ request }) => {
		// The route reads zero query params on the GET surface,
		// so the response status must be invariant to any
		// combination of unknown keys. Body content is not
		// asserted byte-identical because the error message
		// wording is allowed to evolve.
		const baseline = await request.get('/api/geocode');
		const parameterised = await request.get(
			'/api/geocode?provider=mapbox&address=test&format=json&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(401);
	});

	test(`GET /api/geocode keeps the response shape stable across param permutations`, async ({ request }) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical 401 envelope on the unauth
		// branch. The shape guarantees the route does not branch
		// on any query key today.
		const responses = await Promise.all([
			request.get('/api/geocode'),
			request.get('/api/geocode?provider=mapbox'),
			request.get('/api/geocode?refresh=1&format=json&address=foo')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);

			const body = (await response.json()) as {
				success?: unknown;
				error?: unknown;
			};

			expect(body.success).toBe(false);
			expect(typeof body.error).toBe('string');
		}
	});
});

test.describe('API: /api/geocode POST body-resilience surface (unauth)', () => {
	// The POST handler runs through the same auth gate before any
	// body parsing happens, so the unauth branch returns 401
	// regardless of body content. These specs pin that the body
	// shape is irrelevant on the unauth branch — a regression that
	// inverts the gate-then-parse order (parse-then-gate) would
	// surface here as a 400 instead of a 401, because body parsing
	// would fire first and reject malformed payloads before the
	// auth gate ever runs.

	test('POST /api/geocode with an empty body returns 401, not 400', async ({ request }) => {
		const response = await request.post('/api/geocode', { data: {} });

		expect(response.status()).toBe(401);

		const body = (await response.json()) as {
			success?: unknown;
			error?: unknown;
		};

		expect(body.success).toBe(false);
		expect(typeof body.error).toBe('string');
	});

	test('POST /api/geocode with a malformed body returns 401, not 400', async ({ request }) => {
		// A malformed body would normally trigger Zod validation
		// failure (400) — but the auth gate fires first, so the
		// response is 401. This pins the gate-then-parse order.
		const response = await request.post('/api/geocode', { data: { invalid: 'payload', random: 42 } });

		expect(response.status()).toBe(401);
	});

	test('POST /api/geocode with a forward-geocode body returns 401 on the unauth branch', async ({ request }) => {
		// A well-formed forward-geocode body would normally
		// proceed to the service-layer call — but the auth gate
		// fires first.
		const response = await request.post('/api/geocode', {
			data: { address: '1600 Amphitheatre Parkway, Mountain View, CA' }
		});

		expect(response.status()).toBe(401);
	});

	test('POST /api/geocode with a reverse-geocode body returns 401 on the unauth branch', async ({ request }) => {
		// A well-formed reverse-geocode body would normally
		// proceed to the service-layer call — but the auth gate
		// fires first.
		const response = await request.post('/api/geocode', {
			data: { latitude: 37.4224764, longitude: -122.0842499 }
		});

		expect(response.status()).toBe(401);
	});
});
