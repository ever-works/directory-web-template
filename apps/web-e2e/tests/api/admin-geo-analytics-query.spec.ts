import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-gated geo-analytics endpoint served by
 * `apps/web/app/api/admin/geo-analytics/route.ts`.
 *
 * `GET /api/admin/geo-analytics` is intentionally
 * **admin-gated** via the shared `checkAdminAuth()` helper.
 * The handler signature is the **zero-argument** Next 16
 * form (the route does not take a `NextRequest` argument
 * and reads no `searchParams` at all today):
 *
 *     export async function GET() {
 *       try {
 *         const authError = await checkAdminAuth();
 *         if (authError) return authError;
 *         const service = getLocationIndexService();
 *         const [indexStats, allEntries, allItems] = await Promise.all([
 *           service.getIndexStats(),
 *           getAllLocationEntries(),
 *           itemRepository.findAll(),
 *         ]);
 *         …
 *         return NextResponse.json({ success: true, data: { stats, distributions, locations, heatmapData } });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Internal server error' },
 *           { status: 500 }
 *         );
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
 * `?asAdmin=true` admin-impersonation key that bypasses
 * `checkAdminAuth()`, or a future `?country=…` /
 * `?city=…` / `?topCitiesLimit=…` / `?heatmapResolution=…`
 * geo-tuning override that reads the search params
 * unconditionally) would change the unauth branch's
 * behaviour from "always 401" to "200 / 400 / 500 if the
 * right query is present" — and that change is exactly
 * what this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `checkAdminAuth()` returns a
 *     pre-built `<401 NextResponse>`; the route returns it
 *     directly. This is the contract every assertion below
 *     pins, because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Authenticated non-admin user**: `checkAdminAuth()`
 *     returns a pre-built `<403 NextResponse>` (or 401
 *     depending on the admin-guard's per-environment
 *     posture). Out of scope for this spec.
 *   - **Authenticated admin user**: returns 200 with
 *     `{ success: true, data: { stats, distributions, locations, heatmapData } }`
 *     after the location-index service / location-entries
 *     query / item-repository call complete. Out of scope
 *     for this spec because the gate fires before any of
 *     the three calls on every unauth invocation.
 *   - **Internal error**: returns 500 with
 *     `{ success: false, error: 'Internal server error' }`.
 *     Out of scope for this spec because the gate fires
 *     before any of the three calls on every unauth
 *     invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec
 * hits. A regression that introduces query-string-based
 * bypass — e.g. a future `?asAdmin=true` admin-impersonation
 * key that fires before `checkAdminAuth()`, a `?token=…`
 * magic-token bypass, or a `?userId=…` dangerous-passthrough
 * that would forward a caller-supplied user id to a future
 * "view another admin's geo-analytics" feature — would
 * surface immediately as a status divergence between the
 * no-arg 401 and a parameter-laden non-401.
 *
 * The shape mirrors the sibling
 * `admin-dashboard-stats-query.spec.ts`,
 * `client-dashboard-stats-query.spec.ts`,
 * `client-geo-stats-query.spec.ts`,
 * `client-items-coordinates-query.spec.ts`,
 * `stripe-payment-methods-list-query.spec.ts`,
 * `lemonsqueezy-list-query.spec.ts`,
 * `subscription-query.spec.ts`,
 * `payments-query.spec.ts`, and
 * `plan-status-query.spec.ts` smoke specs — all share the
 * same "session-or-admin gated, 401/403 before any
 * service-layer call" posture, but the admin geo-analytics
 * route shares with the admin dashboard stats route the
 * property that the handler signature is **zero-argument**
 * (no `NextRequest` parameter today). The deeper
 * `admin-protected-extra.spec.ts` smoke also covers this
 * route at the broad `< 500` level; this spec adds the deep
 * query-surface walk on top of that.
 */
const ADMIN_GEO_ANALYTICS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/geo-analytics',

	// `?userId=` / `?adminId=` / `?as=` — admin-impersonation
	// keys a future contributor might add. The route reads
	// the admin identity from `checkAdminAuth()` exclusively
	// today.
	'/api/admin/geo-analytics?userId=anything',
	'/api/admin/geo-analytics?user_id=anything',
	'/api/admin/geo-analytics?adminId=anything',
	'/api/admin/geo-analytics?as=admin',
	'/api/admin/geo-analytics?asAdmin=true',
	'/api/admin/geo-analytics?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/geo-analytics?token=anything',
	'/api/admin/geo-analytics?secret=anything',
	'/api/admin/geo-analytics?api_key=anything',
	'/api/admin/geo-analytics?authorization=Bearer+anything',
	'/api/admin/geo-analytics?session=anything',
	'/api/admin/geo-analytics?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-override
	// keys.
	'/api/admin/geo-analytics?bypass=1',
	'/api/admin/geo-analytics?admin=1',
	'/api/admin/geo-analytics?admin=true',
	'/api/admin/geo-analytics?override=true',
	'/api/admin/geo-analytics?force=true',

	// `?country=` / `?city=` / `?serviceArea=` — geo-filter
	// keys a future contributor might wire into the
	// distributions aggregation. The route returns the full
	// distribution shape today (no caller-supplied
	// filtering).
	'/api/admin/geo-analytics?country=US',
	'/api/admin/geo-analytics?country=GB',
	'/api/admin/geo-analytics?country=ALL',
	'/api/admin/geo-analytics?country=',
	'/api/admin/geo-analytics?city=London',
	'/api/admin/geo-analytics?city=Berlin',
	'/api/admin/geo-analytics?city=',
	'/api/admin/geo-analytics?serviceArea=remote',
	'/api/admin/geo-analytics?serviceArea=onsite',
	'/api/admin/geo-analytics?serviceArea=',

	// `?topCitiesLimit=` / `?topCountriesLimit=` — the
	// obvious distribution-tuning override keys for a
	// future contributor. The route hard-codes
	// `byCity.slice(0, 20)` today.
	'/api/admin/geo-analytics?topCitiesLimit=50',
	'/api/admin/geo-analytics?topCitiesLimit=0',
	'/api/admin/geo-analytics?topCitiesLimit=-1',
	'/api/admin/geo-analytics?topCitiesLimit=999999',
	'/api/admin/geo-analytics?topCountriesLimit=10',
	'/api/admin/geo-analytics?topCountriesLimit=0',

	// `?heatmapResolution=` / `?heatmapBuckets=` /
	// `?gridSize=` — heatmap-density override keys. The
	// route returns one point per non-remote entry today
	// (no aggregation / bucketing).
	'/api/admin/geo-analytics?heatmapResolution=high',
	'/api/admin/geo-analytics?heatmapResolution=low',
	'/api/admin/geo-analytics?heatmapBuckets=100',
	'/api/admin/geo-analytics?gridSize=1',
	'/api/admin/geo-analytics?gridSize=10',

	// `?includeRemote=` / `?excludeRemote=` /
	// `?onlyRemote=` — remote-filter keys for the
	// `is_remote` axis. The route hard-codes the canonical
	// remote-filter (drops `(0,0) AND isRemote` from the
	// `locations` array, drops every `isRemote` entry from
	// the `heatmapData` array) today.
	'/api/admin/geo-analytics?includeRemote=true',
	'/api/admin/geo-analytics?includeRemote=false',
	'/api/admin/geo-analytics?excludeRemote=true',
	'/api/admin/geo-analytics?onlyRemote=true',

	// `?from=` / `?to=` / `?since=` / `?until=` — the
	// obvious time-range filter keys for a geo-analytics
	// endpoint.
	'/api/admin/geo-analytics?from=2024-01-01',
	'/api/admin/geo-analytics?to=2026-12-31',
	'/api/admin/geo-analytics?since=2024-01-01T00:00:00Z',
	'/api/admin/geo-analytics?until=2026-12-31T23:59:59Z',
	'/api/admin/geo-analytics?from=invalid-date',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys. The route returns the full envelope
	// (`stats`, `distributions`, `locations`, `heatmapData`)
	// today.
	'/api/admin/geo-analytics?fields=stats',
	'/api/admin/geo-analytics?fields=stats,distributions',
	'/api/admin/geo-analytics?select=locations',
	'/api/admin/geo-analytics?include=heatmapData',
	'/api/admin/geo-analytics?exclude=heatmapData',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// cache-busting keys. The route disables caching via
	// `dynamic = 'force-dynamic'` / `revalidate = 0` /
	// `fetchCache = 'force-no-store'` already, so any
	// cache-busting query key is a no-op on the route's
	// caching behaviour.
	'/api/admin/geo-analytics?refresh=1',
	'/api/admin/geo-analytics?fresh=true',
	'/api/admin/geo-analytics?cache=bypass',
	'/api/admin/geo-analytics?nocache=1',

	// `?format=` — content-negotiation key. The route
	// returns JSON exclusively today.
	'/api/admin/geo-analytics?format=json',
	'/api/admin/geo-analytics?format=geojson',
	'/api/admin/geo-analytics?format=csv',
	'/api/admin/geo-analytics?format=xml',

	// `?locale=` / `?lang=` — i18n keys (relevant to the
	// `byCountry[].name` / `byCity[].name` distribution
	// fields, which are locale-sensitive on tenants with
	// translated location names).
	'/api/admin/geo-analytics?locale=en',
	'/api/admin/geo-analytics?locale=fr',
	'/api/admin/geo-analytics?lang=de',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-tenancy
	// keys.
	'/api/admin/geo-analytics?tenant=acme',
	'/api/admin/geo-analytics?tenantId=42',
	'/api/admin/geo-analytics?org=ever-works',

	// `?bbox=` / `?bounds=` / `?viewport=` — bounding-box
	// keys for a future geographic-viewport filter. The
	// route does not constrain `locations` / `heatmapData`
	// to a viewport today.
	'/api/admin/geo-analytics?bbox=-180,-90,180,90',
	'/api/admin/geo-analytics?bbox=-1,-1,1,1',
	'/api/admin/geo-analytics?bounds=anywhere',
	'/api/admin/geo-analytics?viewport=invalid',

	// Empty values — `searchParams.get(key)` on `?key=`
	// returns `''`. The gate fires before any potential
	// future validator, so empty values must round-trip to
	// the same 401 as the no-arg case.
	'/api/admin/geo-analytics?userId=',
	'/api/admin/geo-analytics?token=',
	'/api/admin/geo-analytics?topCitiesLimit=',
	'/api/admin/geo-analytics?from=',
	'/api/admin/geo-analytics?fields=',

	// Repeated keys — `searchParams.get(name)` returns the
	// first value, but the gate fires before any validator,
	// so repetition is irrelevant on the unauth branch.
	'/api/admin/geo-analytics?userId=a&userId=b',
	'/api/admin/geo-analytics?token=foo&token=bar',
	'/api/admin/geo-analytics?country=US&country=GB',

	// Special-character / injection-style values that would
	// tempt a future regex match, LIKE-prefix, or path-
	// injection wiring. The gate fires before any value is
	// passed into a SQL or filesystem path.
	'/api/admin/geo-analytics?userId=%3Cscript%3E',
	"/api/admin/geo-analytics?country=%27%20OR%201%3D1",
	'/api/admin/geo-analytics?token=%2F..%2F..%2Fetc%2Fpasswd',
	'/api/admin/geo-analytics?topCitiesLimit=NaN',
	'/api/admin/geo-analytics?topCitiesLimit=Infinity',

	// Long values — guard against any future regex / regex-
	// based indexing bug that might trip on long inputs.
	`/api/admin/geo-analytics?userId=${'x'.repeat(500)}`,
	`/api/admin/geo-analytics?token=${'y'.repeat(500)}`,
	`/api/admin/geo-analytics?country=${'z'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero
	// query keys today, so any combination of unknown keys
	// is silently ignored on every branch.
	'/api/admin/geo-analytics?unknown=value',
	'/api/admin/geo-analytics?foo=bar&baz=qux',
	'/api/admin/geo-analytics?userId=admin&token=foo&unknown=value&country=US&fields=stats&foo=bar'
] as const;

test.describe('API: /api/admin/geo-analytics query-param surface', () => {
	for (const path of ADMIN_GEO_ANALYTICS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's admin gate fires before any potential
			// `searchParams` parsing, location-index service
			// call, location-entries query, or item-repository
			// call, so the unauthenticated GET surface returns
			// a 4xx (typically 401) deterministically. There is
			// no 5xx branch reachable on the unauthenticated
			// GET surface because the catch can only fire after
			// the gate has already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/geo-analytics returns a 4xx on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the admin gate must fire before any
		// potential validator / location-index / item-
		// repository call. The status must be a 4xx (typically
		// 401, possibly 403 depending on the admin-guard's
		// per-environment posture). Either way the response
		// must NOT echo any sensitive data — every consuming
		// client depends on the early-return.
		const response = await request.get('/api/admin/geo-analytics');

		expect(response.status()).toBeGreaterThanOrEqual(400);
		expect(response.status()).toBeLessThan(500);

		// The response body is JSON-parseable on every
		// reachable branch. The exact envelope shape varies by
		// the admin guard's implementation (some return
		// `{ success: false, error: ... }`, some return
		// `{ error: ... }`), but the status discriminator is
		// what callers depend on.
		const body = await response.json();
		expect(typeof body).toBe('object');
		expect(body).not.toBeNull();
	});

	test('GET /api/admin/geo-analytics has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads zero query params today, so the
		// response status must be invariant to any combination
		// of unknown keys. A regression that reads any query
		// param before the gate would surface here as a status
		// divergence between the no-arg baseline and the
		// parameterised variant.
		const baseline = await request.get('/api/admin/geo-analytics');
		const parameterised = await request.get(
			'/api/admin/geo-analytics?userId=admin&token=anything&country=US&unknown=value&topCitiesLimit=50&from=2024-01-01'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/geo-analytics?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `checkAdminAuth()`'s session-driven admin resolution
		// would change the unauth branch from "always 401" to
		// "200 if ?userId=… is present" and silently grant
		// any anonymous caller arbitrary-user geo-analytics
		// access. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/admin/geo-analytics');
		const responses = await Promise.all([
			request.get('/api/admin/geo-analytics?userId=admin'),
			request.get('/api/admin/geo-analytics?user_id=admin'),
			request.get('/api/admin/geo-analytics?adminId=admin'),
			request.get('/api/admin/geo-analytics?as=admin'),
			request.get('/api/admin/geo-analytics?asAdmin=true'),
			request.get('/api/admin/geo-analytics?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/geo-analytics?token=… does NOT introduce a query-token auth bypass', async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today (auth is gated through `checkAdminAuth()`
		// which reads the NextAuth session cookie and the
		// admin role bit on the session user). A future
		// contributor who adds a magic-token bypass for the
		// admin gate would change the unauth branch's
		// behaviour. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/admin/geo-analytics');
		const responses = await Promise.all([
			request.get('/api/admin/geo-analytics?token=anything'),
			request.get('/api/admin/geo-analytics?secret=anything'),
			request.get('/api/admin/geo-analytics?api_key=anything'),
			request.get('/api/admin/geo-analytics?authorization=Bearer+anything'),
			request.get('/api/admin/geo-analytics?session=anything'),
			request.get('/api/admin/geo-analytics?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/geo-analytics?bypass=… does NOT introduce a query-admin-override', async ({
		request
	}) => {
		// The route's admin guard does not branch on any
		// query-string admin override today. A regression
		// that wires `searchParams.get('bypass')` /
		// `searchParams.get('admin')` / `searchParams.get('override')`
		// as a non-session-driven admin bypass would let an
		// attacker elevate to admin from any anonymous
		// session. This assertion pins the "admin status is
		// read from the session, never from the query string"
		// invariant.
		const baseline = await request.get('/api/admin/geo-analytics');
		const responses = await Promise.all([
			request.get('/api/admin/geo-analytics?bypass=1'),
			request.get('/api/admin/geo-analytics?admin=1'),
			request.get('/api/admin/geo-analytics?admin=true'),
			request.get('/api/admin/geo-analytics?override=true'),
			request.get('/api/admin/geo-analytics?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/geo-analytics?country=… geo-filter params do NOT change the unauth branch', async ({
		request
	}) => {
		// The route hard-codes the full distribution shape
		// today (no caller-supplied `country` / `city` /
		// `serviceArea` filtering of the `byCountry` /
		// `byCity` / `byServiceArea` distributions). A
		// regression that reads the search params before the
		// gate would change the response payload shape on the
		// auth branch. The unauth branch's status must be
		// invariant to the geo-filter keys.
		const baseline = await request.get('/api/admin/geo-analytics');
		const responses = await Promise.all([
			request.get('/api/admin/geo-analytics?country=US'),
			request.get('/api/admin/geo-analytics?country=GB'),
			request.get('/api/admin/geo-analytics?country=ALL'),
			request.get('/api/admin/geo-analytics?city=London'),
			request.get('/api/admin/geo-analytics?city=Berlin'),
			request.get('/api/admin/geo-analytics?serviceArea=remote'),
			request.get('/api/admin/geo-analytics?serviceArea=onsite')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/geo-analytics?topCitiesLimit=… distribution-tuning params do NOT change the unauth branch', async ({
		request
	}) => {
		// The route hard-codes `byCity.slice(0, 20)` today
		// (top-20 cities by item count). A regression that
		// reads `searchParams.get('topCitiesLimit')` /
		// `searchParams.get('topCountriesLimit')` before the
		// gate would change the response payload shape. The
		// unauth branch's status must be invariant to the
		// distribution-tuning keys.
		const baseline = await request.get('/api/admin/geo-analytics');
		const responses = await Promise.all([
			request.get('/api/admin/geo-analytics?topCitiesLimit=50'),
			request.get('/api/admin/geo-analytics?topCitiesLimit=100'),
			request.get('/api/admin/geo-analytics?topCitiesLimit=0'),
			request.get('/api/admin/geo-analytics?topCitiesLimit=-1'),
			request.get('/api/admin/geo-analytics?topCitiesLimit=NaN'),
			request.get('/api/admin/geo-analytics?topCitiesLimit=Infinity'),
			request.get('/api/admin/geo-analytics?topCountriesLimit=10'),
			request.get('/api/admin/geo-analytics?topCountriesLimit=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/geo-analytics?heatmapResolution=… heatmap-density params do NOT change the unauth branch', async ({
		request
	}) => {
		// The route returns one point per non-remote entry
		// today (no aggregation / bucketing). A future
		// contributor who reads
		// `searchParams.get('heatmapResolution')` /
		// `searchParams.get('heatmapBuckets')` /
		// `searchParams.get('gridSize')` before the gate
		// would change the `heatmapData` array shape. The
		// unauth branch's status must be invariant to the
		// heatmap-density keys.
		const baseline = await request.get('/api/admin/geo-analytics');
		const responses = await Promise.all([
			request.get('/api/admin/geo-analytics?heatmapResolution=high'),
			request.get('/api/admin/geo-analytics?heatmapResolution=low'),
			request.get('/api/admin/geo-analytics?heatmapBuckets=100'),
			request.get('/api/admin/geo-analytics?gridSize=1'),
			request.get('/api/admin/geo-analytics?gridSize=10')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/geo-analytics?includeRemote=… remote-filter params do NOT change the unauth branch', async ({
		request
	}) => {
		// The route hard-codes the canonical remote-filter
		// today (drops `(0,0) AND isRemote` from `locations`,
		// drops every `isRemote` entry from `heatmapData`). A
		// regression that reads
		// `searchParams.get('includeRemote')` /
		// `searchParams.get('excludeRemote')` /
		// `searchParams.get('onlyRemote')` before the gate
		// would change the `locations` and `heatmapData`
		// array shapes. The unauth branch's status must be
		// invariant to the remote-filter keys.
		const baseline = await request.get('/api/admin/geo-analytics');
		const responses = await Promise.all([
			request.get('/api/admin/geo-analytics?includeRemote=true'),
			request.get('/api/admin/geo-analytics?includeRemote=false'),
			request.get('/api/admin/geo-analytics?excludeRemote=true'),
			request.get('/api/admin/geo-analytics?onlyRemote=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/geo-analytics?from=…&to=… time-range params do NOT change the unauth branch', async ({
		request
	}) => {
		// The route returns the full canonical distribution
		// today (no caller-supplied time-range filtering). A
		// regression that reads
		// `searchParams.get('from')` /
		// `searchParams.get('to')` before the gate would
		// change the response payload shape. The unauth
		// branch's status must be invariant to the time-range
		// keys.
		const baseline = await request.get('/api/admin/geo-analytics');
		const responses = await Promise.all([
			request.get('/api/admin/geo-analytics?from=2024-01-01'),
			request.get('/api/admin/geo-analytics?to=2026-12-31'),
			request.get('/api/admin/geo-analytics?since=2024-01-01T00:00:00Z'),
			request.get('/api/admin/geo-analytics?until=2026-12-31T23:59:59Z'),
			request.get('/api/admin/geo-analytics?from=invalid-date')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/geo-analytics?bbox=… viewport-filter params do NOT change the unauth branch', async ({
		request
	}) => {
		// The route does not constrain `locations` /
		// `heatmapData` to a viewport bounding box today. A
		// regression that reads `searchParams.get('bbox')` /
		// `searchParams.get('bounds')` /
		// `searchParams.get('viewport')` before the gate
		// would change the response payload shape. The
		// unauth branch's status must be invariant to the
		// viewport-filter keys.
		const baseline = await request.get('/api/admin/geo-analytics');
		const responses = await Promise.all([
			request.get('/api/admin/geo-analytics?bbox=-180,-90,180,90'),
			request.get('/api/admin/geo-analytics?bbox=-1,-1,1,1'),
			request.get('/api/admin/geo-analytics?bounds=anywhere'),
			request.get('/api/admin/geo-analytics?viewport=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/geo-analytics?format=… does NOT introduce a content-negotiation bypass', async ({
		request
	}) => {
		// The route returns JSON exclusively today. A future
		// `?format=geojson` / `?format=csv` extension would
		// be a natural fit for a geo-analytics data-export
		// flow, but it must not bypass the auth gate. The
		// unauth branch's status must be invariant to the
		// format key.
		const baseline = await request.get('/api/admin/geo-analytics');
		const responses = await Promise.all([
			request.get('/api/admin/geo-analytics?format=json'),
			request.get('/api/admin/geo-analytics?format=geojson'),
			request.get('/api/admin/geo-analytics?format=csv'),
			request.get('/api/admin/geo-analytics?format=xml')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/geo-analytics keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth branch.
		// The shape guarantees the route's admin gate fires
		// before any branching on potential future query
		// schemas.
		const responses = await Promise.all([
			request.get('/api/admin/geo-analytics'),
			request.get(
				'/api/admin/geo-analytics?userId=admin&token=foo&country=US&topCitiesLimit=50&format=geojson'
			),
			request.get(
				'/api/admin/geo-analytics?from=2024-01-01&to=2026-12-31&heatmapResolution=high&bbox=-180,-90,180,90&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/geo-analytics does NOT branch on Accept header', async ({
		request
	}) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to the same
		// status.
		const baseline = await request.get('/api/admin/geo-analytics');
		const responses = await Promise.all([
			request.get('/api/admin/geo-analytics', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/admin/geo-analytics', {
				headers: { Accept: 'application/geo+json' }
			}),
			request.get('/api/admin/geo-analytics', {
				headers: { Accept: 'text/csv' }
			}),
			request.get('/api/admin/geo-analytics', {
				headers: { Accept: 'application/xml' }
			}),
			request.get('/api/admin/geo-analytics', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
