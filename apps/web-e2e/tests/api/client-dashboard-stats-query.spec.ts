import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * authenticated client dashboard-stats endpoint served by
 * `apps/web/app/api/client/dashboard/stats/route.ts`.
 *
 * `GET /api/client/dashboard/stats` is intentionally
 * **session-gated** — it returns the caller's submission
 * counts, engagement metrics, charts data, and top-
 * performing items, all derived from the caller's session-
 * bearing user id. The handler signature is the
 * **zero-argument** Next 16 form (the route does not take
 * a `NextRequest` argument and reads no `searchParams`
 * at all today):
 *
 *     export async function GET() {
 *       try {
 *         const authResult = await requireClientAuth();
 *         if (!authResult.success) {
 *           return authResult.response;
 *         }
 *         const { userId } = authResult;
 *         const dashboardRepository = getClientDashboardRepository();
 *         const stats = await dashboardRepository.getStats(userId);
 *         return NextResponse.json({ success: true, ...stats });
 *       } catch (error) {
 *         return serverErrorResponse(error, 'Failed to fetch dashboard statistics');
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
 *     `{ success: true, totalSubmissions, totalViews,
 *     totalVotesReceived, totalCommentsReceived,
 *     viewsAvailable, recentActivity, ..., topItems }`.
 *     Out of scope for this spec.
 *   - **Authenticated admin user**: today the route
 *     comment notes admins are allowed to use client
 *     endpoints for testing purposes, so this branch
 *     also returns 200. Out of scope for this spec.
 *   - **Internal error**: returns 500 with
 *     `{ success: false, error: 'Failed to fetch
 *     dashboard statistics' }` via `serverErrorResponse`.
 *     Out of scope for this spec because the gate fires
 *     before the dashboard-repository call on every
 *     unauth invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec
 * hits. A regression that introduces query-string-based
 * bypass — e.g. a future `?userId=…` admin-impersonation
 * key that fires before `requireClientAuth()`, a
 * `?token=…` magic-token bypass, or a `?clientId=…`
 * dangerous-passthrough that would forward a caller-
 * supplied client id to the dashboard repository — would
 * surface immediately as a status divergence between the
 * no-arg 401 and a parameter-laden non-401.
 *
 * The shape mirrors the sibling
 * `apps/web/app/api/stripe/payment-methods/list/route.ts`,
 * `apps/web/app/api/lemonsqueezy/list/route.ts`,
 * `apps/web/app/api/user/subscription/route.ts`,
 * `apps/web/app/api/user/payments/route.ts`, and
 * `apps/web/app/api/user/plan-status/route.ts` smoke specs
 * pinned at `stripe-payment-methods-list-query.spec.ts`,
 * `lemonsqueezy-list-query.spec.ts`,
 * `subscription-query.spec.ts`,
 * `payments-query.spec.ts`, and
 * `plan-status-query.spec.ts` — all six routes share the
 * same "session-gated, 401 before any service-layer call"
 * posture, but the client dashboard-stats route is the
 * **only** one of the six whose handler signature is
 * **zero-argument** AND which uses the
 * `requireClientAuth()` helper (rather than the bare
 * `auth()` call). That makes the unauth-branch 401
 * invariant doubly load-bearing because a regression that
 * adds a `request: NextRequest` argument and reads any
 * `searchParams` value before the gate is the obvious
 * shape of a future bypass.
 */
const CLIENT_DASHBOARD_STATS_QUERIES = [
	// Baseline — the no-arg unauthenticated case. Included
	// so a future reader of this file sees the canonical
	// case alongside the variants it parametrises.
	'/api/client/dashboard/stats',

	// `?userId=` / `?user_id=` / `?uid=` — the obvious
	// wiring a future "admin-views-other-user's-dashboard"
	// feature might add as a query-string override. The
	// route reads the user identity from
	// `requireClientAuth()` (which reads `session.user.id`)
	// exclusively today.
	'/api/client/dashboard/stats?userId=anything',
	'/api/client/dashboard/stats?user_id=anything',
	'/api/client/dashboard/stats?uid=anything',
	'/api/client/dashboard/stats?id=anything',
	'/api/client/dashboard/stats?userId=admin',

	// `?clientId=` / `?client_id=` / `?clientID=` — same
	// shape but with the "client" terminology that the
	// route's URL prefix uses. The route does not read
	// any `clientId` query param today.
	'/api/client/dashboard/stats?clientId=anything',
	'/api/client/dashboard/stats?client_id=anything',
	'/api/client/dashboard/stats?clientID=anything',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — the obvious "I have a magic
	// auth token, let me through" keys. The route
	// authenticates via NextAuth session cookie only
	// today via `requireClientAuth()`.
	'/api/client/dashboard/stats?token=anything',
	'/api/client/dashboard/stats?secret=anything',
	'/api/client/dashboard/stats?api_key=anything',
	'/api/client/dashboard/stats?authorization=Bearer+anything',
	'/api/client/dashboard/stats?session=anything',

	// `?from=` / `?to=` / `?startDate=` / `?endDate=` —
	// the obvious date-range filter keys for stats. The
	// route returns the full all-time payload today; a
	// regression that reads `searchParams.get('from')`
	// before the gate would change the response payload
	// shape.
	'/api/client/dashboard/stats?from=2026-01-01',
	'/api/client/dashboard/stats?to=2026-12-31',
	'/api/client/dashboard/stats?startDate=2026-01-01',
	'/api/client/dashboard/stats?endDate=2026-12-31',
	'/api/client/dashboard/stats?from=invalid',
	'/api/client/dashboard/stats?from=&to=',

	// `?period=` / `?range=` / `?window=` — the obvious
	// "time window" keys (e.g. `last-7-days`, `month`).
	// The route does not branch on any time-window query
	// param today.
	'/api/client/dashboard/stats?period=7d',
	'/api/client/dashboard/stats?period=30d',
	'/api/client/dashboard/stats?period=all',
	'/api/client/dashboard/stats?range=week',
	'/api/client/dashboard/stats?window=year',

	// `?limit=` / `?offset=` / `?page=` — the obvious
	// pagination keys (relevant to the `topItems` array
	// inside the response payload). The route returns
	// the full payload today.
	'/api/client/dashboard/stats?limit=1',
	'/api/client/dashboard/stats?limit=10',
	'/api/client/dashboard/stats?limit=100',
	'/api/client/dashboard/stats?offset=10',
	'/api/client/dashboard/stats?page=1',

	// `?fields=` / `?select=` / `?include=` — the obvious
	// "only-give-me-these-columns" keys. The route returns
	// the full stats payload today.
	'/api/client/dashboard/stats?fields=totalSubmissions',
	'/api/client/dashboard/stats?fields=topItems,statusBreakdown',
	'/api/client/dashboard/stats?select=engagementChartData',
	'/api/client/dashboard/stats?include=submissionTimeline',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// the obvious cache-busting keys. The handler does
	// not branch on any cache-control query param today.
	'/api/client/dashboard/stats?refresh=1',
	'/api/client/dashboard/stats?force=true',
	'/api/client/dashboard/stats?fresh=true',
	'/api/client/dashboard/stats?cache=bypass',
	'/api/client/dashboard/stats?nocache=1',

	// `?format=` — the obvious content-negotiation key.
	// The route returns JSON exclusively today.
	'/api/client/dashboard/stats?format=json',
	'/api/client/dashboard/stats?format=xml',
	'/api/client/dashboard/stats?format=csv',
	'/api/client/dashboard/stats?format=pdf',

	// `?locale=` / `?lang=` / `?currency=` — the obvious
	// i18n keys. The route returns numeric counts and
	// language-agnostic chart data today.
	'/api/client/dashboard/stats?locale=en',
	'/api/client/dashboard/stats?locale=fr',
	'/api/client/dashboard/stats?lang=de',
	'/api/client/dashboard/stats?currency=USD',

	// `?status=` / `?type=` — the obvious filter keys
	// (relevant to the `statusBreakdown` array). The route
	// returns the full breakdown today.
	'/api/client/dashboard/stats?status=approved',
	'/api/client/dashboard/stats?status=pending',
	'/api/client/dashboard/stats?status=rejected',
	'/api/client/dashboard/stats?type=submissions',
	'/api/client/dashboard/stats?type=engagement',

	// `?sort=` / `?order=` / `?direction=` — the obvious
	// sort-override keys. The route returns the canonical
	// chronological-or-name order from the repository
	// today.
	'/api/client/dashboard/stats?sort=submissions',
	'/api/client/dashboard/stats?order=asc',
	'/api/client/dashboard/stats?direction=desc',

	// `?tenant=` / `?tenantId=` / `?org=` — the obvious
	// multi-tenancy keys.
	'/api/client/dashboard/stats?tenant=acme',
	'/api/client/dashboard/stats?tenantId=42',
	'/api/client/dashboard/stats?org=ever-works',

	// `?admin=` / `?asAdmin=` / `?bypass=` — the obvious
	// "admin override" keys that a future "view another
	// user's dashboard as admin" feature might add.
	'/api/client/dashboard/stats?admin=1',
	'/api/client/dashboard/stats?admin=true',
	'/api/client/dashboard/stats?asAdmin=true',
	'/api/client/dashboard/stats?bypass=1',
	'/api/client/dashboard/stats?impersonate=admin',

	// Empty values — `searchParams.get(key)` on `?key=`
	// returns `''`. The gate fires before any potential
	// future validator, so empty values must round-trip
	// to the same 401 as the no-arg case.
	'/api/client/dashboard/stats?userId=',
	'/api/client/dashboard/stats?clientId=',
	'/api/client/dashboard/stats?token=',
	'/api/client/dashboard/stats?period=',
	'/api/client/dashboard/stats?fields=',

	// Repeated keys — `searchParams.get(name)` returns
	// the first value, but the gate fires before any
	// validator, so repetition is irrelevant on the
	// unauth branch.
	'/api/client/dashboard/stats?userId=a&userId=b',
	'/api/client/dashboard/stats?period=7d&period=30d',
	'/api/client/dashboard/stats?token=foo&token=bar',

	// Special-character values that would tempt a future
	// regex match, LIKE-prefix, or path-injection wiring.
	// The route does not pass any value into a SQL or
	// filesystem path before the gate fires.
	'/api/client/dashboard/stats?userId=%3Cscript%3E',
	"/api/client/dashboard/stats?userId=%27%20OR%201%3D1",
	'/api/client/dashboard/stats?token=%2F..%2F..%2Fetc%2Fpasswd',
	'/api/client/dashboard/stats?period=%00',

	// Long values — guard against any future regex /
	// regex-based indexing bug that might trip on long
	// inputs. The gate fires before any validator on the
	// unauth branch, so long values are irrelevant today.
	`/api/client/dashboard/stats?userId=${'x'.repeat(500)}`,
	`/api/client/dashboard/stats?token=${'y'.repeat(500)}`,
	`/api/client/dashboard/stats?fields=${'z'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero
	// query keys today, so any combination of unknown
	// keys is silently ignored on every branch.
	'/api/client/dashboard/stats?unknown=value',
	'/api/client/dashboard/stats?foo=bar&baz=qux',
	'/api/client/dashboard/stats?userId=admin&token=foo&unknown=value&period=7d&fields=topItems&foo=bar'
] as const;

test.describe('API: /api/client/dashboard/stats query-param surface', () => {
	for (const path of CLIENT_DASHBOARD_STATS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's auth gate fires before any potential
			// `searchParams` parsing or dashboard-repository
			// call, so the unauthenticated GET surface returns
			// 401 deterministically. There is no 5xx branch
			// reachable on the unauthenticated GET surface
			// because the catch can only fire after the gate
			// has already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET /api/client/dashboard/stats returns 401 with the canonical { success: false, error } envelope on the unauth branch`, async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the auth gate must fire before any
		// potential validator / dashboard-repository call and
		// must return 401 with the documented `{ success:
		// false, error: 'Unauthorized. Please sign in to
		// continue.' }` envelope. A regression that bypasses
		// the gate would surface here as a non-401 status or
		// a different body shape.
		const response = await request.get('/api/client/dashboard/stats');

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

	test(`GET /api/client/dashboard/stats returns 401 identically with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params today, so the
		// response status must be invariant to any combination
		// of unknown keys.
		const baseline = await request.get('/api/client/dashboard/stats');
		const parameterised = await request.get(
			'/api/client/dashboard/stats?userId=admin&period=7d&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(401);
	});

	test(`GET /api/client/dashboard/stats?userId=… does NOT bypass the session gate`, async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `requireClientAuth()`'s `session.user.id` resolution
		// would change the unauth branch from "always 401" to
		// "200 if ?userId=… is present" and silently grant
		// any anonymous caller arbitrary-user dashboard
		// access. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/client/dashboard/stats');
		const withUserId = await request.get('/api/client/dashboard/stats?userId=admin');
		const withUserIdUnderscore = await request.get(
			'/api/client/dashboard/stats?user_id=admin'
		);
		const withUid = await request.get('/api/client/dashboard/stats?uid=admin');
		const withId = await request.get('/api/client/dashboard/stats?id=admin');
		const withClientId = await request.get(
			'/api/client/dashboard/stats?clientId=admin'
		);

		expect(withUserId.status()).toBe(baseline.status());
		expect(withUserIdUnderscore.status()).toBe(baseline.status());
		expect(withUid.status()).toBe(baseline.status());
		expect(withId.status()).toBe(baseline.status());
		expect(withClientId.status()).toBe(baseline.status());
	});

	test(`GET /api/client/dashboard/stats?token=… does NOT introduce a query-token auth bypass`, async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today (auth is gated through `requireClientAuth()`
		// which reads the NextAuth session cookie). A future
		// contributor who adds a magic-token bypass for the
		// session gate would change the unauth branch's
		// behaviour. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/client/dashboard/stats');
		const withToken = await request.get('/api/client/dashboard/stats?token=anything');
		const withSecret = await request.get(
			'/api/client/dashboard/stats?secret=anything'
		);
		const withApiKey = await request.get(
			'/api/client/dashboard/stats?api_key=anything'
		);
		const withAuthQuery = await request.get(
			'/api/client/dashboard/stats?authorization=Bearer+anything'
		);

		expect(withToken.status()).toBe(baseline.status());
		expect(withSecret.status()).toBe(baseline.status());
		expect(withApiKey.status()).toBe(baseline.status());
		expect(withAuthQuery.status()).toBe(baseline.status());
	});

	test(`GET /api/client/dashboard/stats?admin=… does NOT introduce a query-admin-override`, async ({
		request
	}) => {
		// The route's `requireClientAuth()` helper notes in a
		// comment that admins are allowed to use client
		// endpoints today. A regression that wires
		// `searchParams.get('admin')` as a non-session-driven
		// admin override would let an attacker (a) view any
		// user's dashboard stats by adding `?admin=1`, or
		// (b) bypass the session check entirely. This
		// assertion pins the "admin status is read from the
		// session, never from the query string" invariant.
		const baseline = await request.get('/api/client/dashboard/stats');
		const withAdmin = await request.get('/api/client/dashboard/stats?admin=1');
		const withAdminTrue = await request.get(
			'/api/client/dashboard/stats?admin=true'
		);
		const withAsAdmin = await request.get(
			'/api/client/dashboard/stats?asAdmin=true'
		);
		const withBypass = await request.get('/api/client/dashboard/stats?bypass=1');
		const withImpersonate = await request.get(
			'/api/client/dashboard/stats?impersonate=admin'
		);

		expect(withAdmin.status()).toBe(baseline.status());
		expect(withAdminTrue.status()).toBe(baseline.status());
		expect(withAsAdmin.status()).toBe(baseline.status());
		expect(withBypass.status()).toBe(baseline.status());
		expect(withImpersonate.status()).toBe(baseline.status());
	});

	test(`GET /api/client/dashboard/stats?from=… date-range params do NOT change the unauth branch`, async ({
		request
	}) => {
		// The route returns the full all-time stats payload
		// today (no date-range filtering). A regression that
		// reads `searchParams.get('from')` /
		// `searchParams.get('to')` before the gate would
		// change the response payload shape on the auth
		// branch. The unauth branch's status must be
		// invariant to the date-range keys.
		const baseline = await request.get('/api/client/dashboard/stats');
		const responses = await Promise.all([
			request.get('/api/client/dashboard/stats?from=2026-01-01'),
			request.get('/api/client/dashboard/stats?to=2026-12-31'),
			request.get(
				'/api/client/dashboard/stats?from=2026-01-01&to=2026-12-31'
			),
			request.get('/api/client/dashboard/stats?period=7d'),
			request.get('/api/client/dashboard/stats?period=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			expect(response.status()).toBe(401);
		}
	});

	test(`GET /api/client/dashboard/stats keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical 401 envelope on the
		// unauth branch. The shape guarantees the route's
		// auth gate fires before any branching on potential
		// future query schemas.
		const responses = await Promise.all([
			request.get('/api/client/dashboard/stats'),
			request.get(
				'/api/client/dashboard/stats?userId=admin&period=7d&fields=topItems&admin=1'
			),
			request.get(
				'/api/client/dashboard/stats?from=invalid&period=invalid&token=foo&unknown=bar'
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
