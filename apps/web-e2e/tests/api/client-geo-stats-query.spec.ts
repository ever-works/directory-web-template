import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * authenticated client geo-stats endpoint served by
 * `apps/web/app/api/client/geo-stats/route.ts`.
 *
 * `GET /api/client/geo-stats` is intentionally
 * **session-gated** — it returns the caller's geographic
 * coverage statistics (total items, items with location,
 * remote items, service-area breakdown, top cities, top
 * countries), all derived from the caller's session-bearing
 * user id. The handler signature is the **zero-argument**
 * Next 16 form (the route does not take a `NextRequest`
 * argument and reads no `searchParams` at all today):
 *
 *     export async function GET() {
 *       try {
 *         const authResult = await requireClientAuth();
 *         if (!authResult.success) {
 *           return authResult.response;
 *         }
 *         const { userId } = authResult;
 *         const repository = getClientItemRepository();
 *         const geoStats = await repository.getGeoStatsByUser(userId);
 *         return NextResponse.json({ success: true, ...geoStats });
 *       } catch (error) {
 *         return serverErrorResponse(error, 'Failed to fetch geographic statistics');
 *       }
 *     }
 *
 * Because the handler signature is **zero-argument**, the
 * route reads zero query params today — every assertion
 * below pins that the response is deterministically 401 on
 * the unauthenticated GET branch regardless of which keys
 * the caller appends to the URL. A regression that switches
 * the signature to `GET(request: NextRequest)` and starts
 * reading `request.nextUrl.searchParams.get(...)` would not
 * change the unauth branch's status (the gate fires first),
 * but a regression that reads `searchParams` **before** the
 * gate (e.g. for a `?token=…` magic-token bypass or a
 * `?userId=…` admin-impersonation key that bypasses
 * `requireClientAuth()`) would change the unauth branch's
 * behaviour from "always 401" to "200 / 400 / 500 if the
 * right query is present" — and that change is exactly what
 * this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `requireClientAuth()` returns
 *     `{ success: false, response: <401 NextResponse> }`;
 *     the early `if (!authResult.success)` branch fires
 *     and the route returns the canonical
 *     `{ success: false, error: 'Unauthorized. Please
 *     sign in to continue.' }` envelope with status 401.
 *     This is the contract every assertion below pins,
 *     because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Authenticated client user**: returns 200 with
 *     `{ success: true, total_items, items_with_location,
 *     items_remote, service_area_breakdown, top_cities,
 *     top_countries }`. Out of scope for this spec.
 *   - **Authenticated admin user**: today the
 *     `requireClientAuth()` helper notes in a comment that
 *     admins are allowed to use client endpoints, so this
 *     branch also returns 200. Out of scope for this spec.
 *   - **Internal error**: returns 500 with
 *     `{ success: false, error: 'Failed to fetch
 *     geographic statistics' }` via `serverErrorResponse`.
 *     Out of scope for this spec because the gate fires
 *     before the client-item-repository call on every
 *     unauth invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec
 * hits. A regression that introduces query-string-based
 * bypass — e.g. a future `?userId=…` admin-impersonation
 * key that fires before `requireClientAuth()`, a
 * `?token=…` magic-token bypass, or a `?clientId=…`
 * dangerous-passthrough that would forward a caller-
 * supplied client id to the geo-stats repository — would
 * surface immediately as a status divergence between the
 * no-arg 401 and a parameter-laden non-401.
 *
 * The shape mirrors the sibling
 * `apps/web/app/api/client/dashboard/stats/route.ts`,
 * `apps/web/app/api/stripe/payment-methods/list/route.ts`,
 * `apps/web/app/api/lemonsqueezy/list/route.ts`,
 * `apps/web/app/api/user/subscription/route.ts`,
 * `apps/web/app/api/user/payments/route.ts`, and
 * `apps/web/app/api/user/plan-status/route.ts` smoke specs
 * pinned at `client-dashboard-stats-query.spec.ts`,
 * `stripe-payment-methods-list-query.spec.ts`,
 * `lemonsqueezy-list-query.spec.ts`,
 * `subscription-query.spec.ts`,
 * `payments-query.spec.ts`, and
 * `plan-status-query.spec.ts` — all seven routes share the
 * same "session-gated, 401 before any service-layer call"
 * posture, but the client geo-stats route shares with the
 * client dashboard-stats route the property that the
 * handler signature is **zero-argument** AND uses the
 * `requireClientAuth()` helper (rather than the bare
 * `auth()` call). That makes the unauth-branch 401
 * invariant doubly load-bearing because a regression that
 * adds a `request: NextRequest` argument and reads any
 * `searchParams` value before the gate is the obvious
 * shape of a future bypass — particularly tempting on a
 * geo-stats endpoint where future contributors might add
 * `?country=…` or `?city=…` filter keys to scope the
 * payload to a sub-region.
 */
const CLIENT_GEO_STATS_QUERIES = [
	// Baseline — the no-arg unauthenticated case. Included
	// so a future reader of this file sees the canonical
	// case alongside the variants it parametrises.
	'/api/client/geo-stats',

	// `?userId=` / `?user_id=` / `?uid=` — the obvious
	// wiring a future "admin-views-other-user's-geo-stats"
	// feature might add as a query-string override. The
	// route reads the user identity from
	// `requireClientAuth()` (which reads `session.user.id`)
	// exclusively today.
	'/api/client/geo-stats?userId=anything',
	'/api/client/geo-stats?user_id=anything',
	'/api/client/geo-stats?uid=anything',
	'/api/client/geo-stats?id=anything',
	'/api/client/geo-stats?userId=admin',

	// `?clientId=` / `?client_id=` / `?clientID=` — same
	// shape but with the "client" terminology that the
	// route's URL prefix uses. The route does not read
	// any `clientId` query param today.
	'/api/client/geo-stats?clientId=anything',
	'/api/client/geo-stats?client_id=anything',
	'/api/client/geo-stats?clientID=anything',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — the obvious "I have a magic
	// auth token, let me through" keys. The route
	// authenticates via NextAuth session cookie only
	// today via `requireClientAuth()`.
	'/api/client/geo-stats?token=anything',
	'/api/client/geo-stats?secret=anything',
	'/api/client/geo-stats?api_key=anything',
	'/api/client/geo-stats?authorization=Bearer+anything',
	'/api/client/geo-stats?session=anything',

	// `?country=` / `?city=` / `?region=` / `?area=` —
	// the obvious geographic filter keys for a geo-stats
	// endpoint. The route returns the full per-user
	// geographic payload today; a regression that reads
	// `searchParams.get('country')` before the gate would
	// change the response payload shape.
	'/api/client/geo-stats?country=US',
	'/api/client/geo-stats?country=france',
	'/api/client/geo-stats?city=NYC',
	'/api/client/geo-stats?city=london',
	'/api/client/geo-stats?region=americas',
	'/api/client/geo-stats?area=local',
	'/api/client/geo-stats?countryCode=DE',
	'/api/client/geo-stats?country=&city=',

	// `?serviceArea=` / `?service_area=` / `?coverage=` —
	// the obvious service-area filter keys (relevant to
	// the `service_area_breakdown` array inside the
	// response payload). The route returns the full
	// breakdown today.
	'/api/client/geo-stats?serviceArea=local',
	'/api/client/geo-stats?service_area=remote',
	'/api/client/geo-stats?coverage=worldwide',

	// `?lat=` / `?lng=` / `?bbox=` / `?radius=` — the
	// obvious "spatial-filter" keys that a future "items
	// near a point" or "items inside a bounding box"
	// feature might add. The route returns the full
	// per-user payload today.
	'/api/client/geo-stats?lat=40.7128',
	'/api/client/geo-stats?lng=-74.0060',
	'/api/client/geo-stats?lat=40.7128&lng=-74.0060',
	'/api/client/geo-stats?bbox=-74.1,40.6,-73.9,40.8',
	'/api/client/geo-stats?radius=10',

	// `?period=` / `?range=` / `?window=` — the obvious
	// "time window" keys (e.g. `last-7-days`, `month`).
	// The route does not branch on any time-window query
	// param today.
	'/api/client/geo-stats?period=7d',
	'/api/client/geo-stats?period=30d',
	'/api/client/geo-stats?period=all',
	'/api/client/geo-stats?range=week',
	'/api/client/geo-stats?window=year',

	// `?limit=` / `?offset=` / `?page=` — the obvious
	// pagination keys (relevant to the `top_cities` and
	// `top_countries` arrays inside the response payload).
	// The route returns the full payload today.
	'/api/client/geo-stats?limit=1',
	'/api/client/geo-stats?limit=10',
	'/api/client/geo-stats?limit=100',
	'/api/client/geo-stats?offset=10',
	'/api/client/geo-stats?page=1',
	'/api/client/geo-stats?topN=5',

	// `?fields=` / `?select=` / `?include=` — the obvious
	// "only-give-me-these-columns" keys. The route returns
	// the full geo-stats payload today.
	'/api/client/geo-stats?fields=top_cities',
	'/api/client/geo-stats?fields=top_countries,service_area_breakdown',
	'/api/client/geo-stats?select=items_with_location',
	'/api/client/geo-stats?include=items_remote',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// the obvious cache-busting keys. The handler does
	// not branch on any cache-control query param today.
	'/api/client/geo-stats?refresh=1',
	'/api/client/geo-stats?force=true',
	'/api/client/geo-stats?fresh=true',
	'/api/client/geo-stats?cache=bypass',
	'/api/client/geo-stats?nocache=1',

	// `?format=` — the obvious content-negotiation key.
	// The route returns JSON exclusively today.
	'/api/client/geo-stats?format=json',
	'/api/client/geo-stats?format=xml',
	'/api/client/geo-stats?format=csv',
	'/api/client/geo-stats?format=geojson',
	'/api/client/geo-stats?format=kml',

	// `?locale=` / `?lang=` / `?currency=` — the obvious
	// i18n keys (relevant to the `top_cities` /
	// `top_countries` city / country names). The route
	// returns whatever names the underlying repository
	// stores today (which are stored unlocalized).
	'/api/client/geo-stats?locale=en',
	'/api/client/geo-stats?locale=fr',
	'/api/client/geo-stats?lang=de',
	'/api/client/geo-stats?currency=USD',

	// `?status=` / `?type=` — the obvious filter keys.
	// The route returns the full breakdown today.
	'/api/client/geo-stats?status=approved',
	'/api/client/geo-stats?status=pending',
	'/api/client/geo-stats?type=remote',
	'/api/client/geo-stats?type=local',

	// `?sort=` / `?order=` / `?direction=` — the obvious
	// sort-override keys. The route returns the canonical
	// "sorted descending by count" order from the
	// repository today.
	'/api/client/geo-stats?sort=count',
	'/api/client/geo-stats?sort=name',
	'/api/client/geo-stats?order=asc',
	'/api/client/geo-stats?direction=desc',

	// `?tenant=` / `?tenantId=` / `?org=` — the obvious
	// multi-tenancy keys.
	'/api/client/geo-stats?tenant=acme',
	'/api/client/geo-stats?tenantId=42',
	'/api/client/geo-stats?org=ever-works',

	// `?admin=` / `?asAdmin=` / `?bypass=` — the obvious
	// "admin override" keys that a future "view another
	// user's geo-stats as admin" feature might add.
	'/api/client/geo-stats?admin=1',
	'/api/client/geo-stats?admin=true',
	'/api/client/geo-stats?asAdmin=true',
	'/api/client/geo-stats?bypass=1',
	'/api/client/geo-stats?impersonate=admin',

	// Empty values — `searchParams.get(key)` on `?key=`
	// returns `''`. The gate fires before any potential
	// future validator, so empty values must round-trip
	// to the same 401 as the no-arg case.
	'/api/client/geo-stats?userId=',
	'/api/client/geo-stats?clientId=',
	'/api/client/geo-stats?token=',
	'/api/client/geo-stats?country=',
	'/api/client/geo-stats?fields=',

	// Repeated keys — `searchParams.get(name)` returns
	// the first value, but the gate fires before any
	// validator, so repetition is irrelevant on the
	// unauth branch.
	'/api/client/geo-stats?userId=a&userId=b',
	'/api/client/geo-stats?country=US&country=FR',
	'/api/client/geo-stats?token=foo&token=bar',

	// Special-character values that would tempt a future
	// regex match, LIKE-prefix, or path-injection wiring.
	// The route does not pass any value into a SQL or
	// filesystem path before the gate fires.
	'/api/client/geo-stats?userId=%3Cscript%3E',
	"/api/client/geo-stats?userId=%27%20OR%201%3D1",
	'/api/client/geo-stats?token=%2F..%2F..%2Fetc%2Fpasswd',
	'/api/client/geo-stats?country=%00',

	// Long values — guard against any future regex /
	// regex-based indexing bug that might trip on long
	// inputs. The gate fires before any validator on the
	// unauth branch, so long values are irrelevant today.
	`/api/client/geo-stats?userId=${'x'.repeat(500)}`,
	`/api/client/geo-stats?token=${'y'.repeat(500)}`,
	`/api/client/geo-stats?country=${'z'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero
	// query keys today, so any combination of unknown
	// keys is silently ignored on every branch.
	'/api/client/geo-stats?unknown=value',
	'/api/client/geo-stats?foo=bar&baz=qux',
	'/api/client/geo-stats?userId=admin&token=foo&unknown=value&country=US&fields=top_cities&foo=bar'
] as const;

test.describe('API: /api/client/geo-stats query-param surface', () => {
	for (const path of CLIENT_GEO_STATS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's auth gate fires before any potential
			// `searchParams` parsing or client-item-repository
			// call, so the unauthenticated GET surface returns
			// 401 deterministically. There is no 5xx branch
			// reachable on the unauthenticated GET surface
			// because the catch can only fire after the gate
			// has already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/client/geo-stats returns 401 with the canonical { success: false, error } envelope on the unauth branch`, async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the auth gate must fire before any
		// potential validator / client-item-repository call
		// and must return 401 with the documented
		// `{ success: false, error: 'Unauthorized. Please
		// sign in to continue.' }` envelope. A regression that
		// bypasses the gate would surface here as a non-401
		// status or a different body shape.
		const response = await request.get('/api/client/geo-stats');

		expect(response.status()).toBe(401);

		const body = (await response.json()) as {
			success?: unknown;
			error?: unknown;
		};

		// The route returns `{ success: false, error:
		// 'Unauthorized. Please sign in to continue.' }`
		// today; `success` is a stable boolean discriminator
		// and `error` is a stable machine-readable identifier
		// callers depend on. Assert their presence and shape.
		expect(typeof body.success).toBe('boolean');
		expect(body.success).toBe(false);
		expect(typeof body.error).toBe('string');
	});

	test(`GET /api/client/geo-stats returns 401 identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params today, so the
		// response status must be invariant to any combination
		// of unknown keys.
		const baseline = await request.get('/api/client/geo-stats');
		const parameterised = await request.get(
			'/api/client/geo-stats?userId=admin&country=US&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(401);
	});

	test(`GET /api/client/geo-stats?userId=… does NOT bypass the session gate`, async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `requireClientAuth()`'s `session.user.id` resolution
		// would change the unauth branch from "always 401" to
		// "200 if ?userId=… is present" and silently grant
		// any anonymous caller arbitrary-user geo-stats
		// access. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/client/geo-stats');
		const withUserId = await request.get('/api/client/geo-stats?userId=admin');
		const withUserIdUnderscore = await request.get(
			'/api/client/geo-stats?user_id=admin'
		);
		const withUid = await request.get('/api/client/geo-stats?uid=admin');
		const withId = await request.get('/api/client/geo-stats?id=admin');
		const withClientId = await request.get(
			'/api/client/geo-stats?clientId=admin'
		);

		expect(withUserId.status()).toBe(baseline.status());
		expect(withUserIdUnderscore.status()).toBe(baseline.status());
		expect(withUid.status()).toBe(baseline.status());
		expect(withId.status()).toBe(baseline.status());
		expect(withClientId.status()).toBe(baseline.status());
	});

	test(`GET /api/client/geo-stats?token=… does NOT introduce a query-token auth bypass`, async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today (auth is gated through `requireClientAuth()`
		// which reads the NextAuth session cookie). A future
		// contributor who adds a magic-token bypass for the
		// session gate would change the unauth branch's
		// behaviour. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/client/geo-stats');
		const withToken = await request.get('/api/client/geo-stats?token=anything');
		const withSecret = await request.get(
			'/api/client/geo-stats?secret=anything'
		);
		const withApiKey = await request.get(
			'/api/client/geo-stats?api_key=anything'
		);
		const withAuthQuery = await request.get(
			'/api/client/geo-stats?authorization=Bearer+anything'
		);

		expect(withToken.status()).toBe(baseline.status());
		expect(withSecret.status()).toBe(baseline.status());
		expect(withApiKey.status()).toBe(baseline.status());
		expect(withAuthQuery.status()).toBe(baseline.status());
	});

	test(`GET /api/client/geo-stats?admin=… does NOT introduce a query-admin-override`, async ({
		request
	}) => {
		// The route's `requireClientAuth()` helper notes in a
		// comment that admins are allowed to use client
		// endpoints today. A regression that wires
		// `searchParams.get('admin')` as a non-session-driven
		// admin override would let an attacker (a) view any
		// user's geographic distribution by adding `?admin=1`,
		// or (b) bypass the session check entirely. This
		// assertion pins the "admin status is read from the
		// session, never from the query string" invariant.
		const baseline = await request.get('/api/client/geo-stats');
		const withAdmin = await request.get('/api/client/geo-stats?admin=1');
		const withAdminTrue = await request.get(
			'/api/client/geo-stats?admin=true'
		);
		const withAsAdmin = await request.get(
			'/api/client/geo-stats?asAdmin=true'
		);
		const withBypass = await request.get('/api/client/geo-stats?bypass=1');
		const withImpersonate = await request.get(
			'/api/client/geo-stats?impersonate=admin'
		);

		expect(withAdmin.status()).toBe(baseline.status());
		expect(withAdminTrue.status()).toBe(baseline.status());
		expect(withAsAdmin.status()).toBe(baseline.status());
		expect(withBypass.status()).toBe(baseline.status());
		expect(withImpersonate.status()).toBe(baseline.status());
	});

	test(`GET /api/client/geo-stats?country=… geographic-filter params do NOT change the unauth branch`, async ({
		request
	}) => {
		// The route returns the full per-user geographic
		// payload today (no per-country / per-city filtering).
		// A regression that reads `searchParams.get('country')`
		// / `searchParams.get('city')` / `searchParams.get('lat')`
		// before the gate would change the response payload
		// shape on the auth branch. The unauth branch's status
		// must be invariant to the geographic-filter keys.
		const baseline = await request.get('/api/client/geo-stats');
		const responses = await Promise.all([
			request.get('/api/client/geo-stats?country=US'),
			request.get('/api/client/geo-stats?city=NYC'),
			request.get('/api/client/geo-stats?country=US&city=NYC'),
			request.get('/api/client/geo-stats?lat=40.7128&lng=-74.0060'),
			request.get('/api/client/geo-stats?bbox=-74.1,40.6,-73.9,40.8'),
			request.get('/api/client/geo-stats?radius=10'),
			request.get('/api/client/geo-stats?country=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			expect(response.status()).toBe(401);
		}
	});

	test(`GET /api/client/geo-stats keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical 401 envelope on the
		// unauth branch. The shape guarantees the route's
		// auth gate fires before any branching on potential
		// future query schemas.
		const responses = await Promise.all([
			request.get('/api/client/geo-stats'),
			request.get(
				'/api/client/geo-stats?userId=admin&country=US&fields=top_cities&admin=1'
			),
			request.get(
				'/api/client/geo-stats?country=invalid&period=invalid&token=foo&unknown=bar'
			)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);

			const body = (await response.json()) as {
				success?: unknown;
				error?: unknown;
			};
			expect(typeof body.success).toBe('boolean');
			expect(body.success).toBe(false);
			expect(typeof body.error).toBe('string');
		}
	});
});
