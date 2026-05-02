import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-gated dashboard-stats endpoint served by
 * `apps/web/app/api/admin/dashboard/stats/route.ts`.
 *
 * `GET /api/admin/dashboard/stats` is intentionally
 * **admin-gated** via the shared `checkAdminAuth()` helper.
 * The handler signature is the **zero-argument** Next 16
 * form (the route does not take a `NextRequest` argument
 * and reads no `searchParams` at all today):
 *
 *     export async function GET() {
 *       try {
 *         const authError = await checkAdminAuth();
 *         if (authError) {
 *           return authError;
 *         }
 *         const stats = await adminStatsRepository.getAllStats();
 *         const analytics = await analyticsRepository.getBatchAnalytics({
 *           userGrowthMonths: 12,
 *           activityTrendDays: 14,
 *           topItemsLimit: 10,
 *           recentActivityLimit: 20
 *         });
 *         …
 *         return NextResponse.json({ success: true, data: adminStats });
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
 * `checkAdminAuth()`, or a future `?userGrowthMonths=…` /
 * `?activityTrendDays=…` / `?topItemsLimit=…` /
 * `?recentActivityLimit=…` analytics-tuning override that
 * reads the search params unconditionally) would change the
 * unauth branch's behaviour from "always 401" to "200 / 400 /
 * 500 if the right query is present" — and that change is
 * exactly what this spec catches.
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
 *     `{ success: true, data: <AdminStats> }` after the
 *     stats / analytics repository calls complete. Out of
 *     scope for this spec because the gate fires before
 *     either repository call on every unauth invocation.
 *   - **Internal error**: returns 500 with
 *     `{ success: false, error: 'Internal server error' }`.
 *     Out of scope for this spec because the gate fires
 *     before the repository calls on every unauth
 *     invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec
 * hits. A regression that introduces query-string-based
 * bypass — e.g. a future `?asAdmin=true` admin-impersonation
 * key that fires before `checkAdminAuth()`, a `?token=…`
 * magic-token bypass, or a `?userId=…` dangerous-passthrough
 * that would forward a caller-supplied user id to a future
 * "view another admin's dashboard" feature — would surface
 * immediately as a status divergence between the no-arg 401
 * and a parameter-laden non-401.
 *
 * The shape mirrors the sibling
 * `client-dashboard-stats-query.spec.ts`,
 * `client-geo-stats-query.spec.ts`,
 * `client-items-coordinates-query.spec.ts`,
 * `stripe-payment-methods-list-query.spec.ts`,
 * `lemonsqueezy-list-query.spec.ts`,
 * `subscription-query.spec.ts`,
 * `payments-query.spec.ts`, and
 * `plan-status-query.spec.ts` smoke specs — all share the
 * same "session-or-admin gated, 401/403 before any
 * service-layer call" posture, but the admin dashboard
 * stats route shares with the client dashboard stats route
 * the property that the handler signature is **zero-argument**
 * (no `NextRequest` parameter today). The deeper
 * `protected.spec.ts` smoke also covers this route at the
 * broad `< 500` level; this spec adds the deep query-surface
 * walk on top of that.
 */
const ADMIN_DASHBOARD_STATS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/dashboard/stats',

	// `?userId=` / `?adminId=` / `?as=` — admin-impersonation
	// keys a future contributor might add. The route reads
	// the admin identity from `checkAdminAuth()` exclusively
	// today.
	'/api/admin/dashboard/stats?userId=anything',
	'/api/admin/dashboard/stats?user_id=anything',
	'/api/admin/dashboard/stats?adminId=anything',
	'/api/admin/dashboard/stats?as=admin',
	'/api/admin/dashboard/stats?asAdmin=true',
	'/api/admin/dashboard/stats?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/dashboard/stats?token=anything',
	'/api/admin/dashboard/stats?secret=anything',
	'/api/admin/dashboard/stats?api_key=anything',
	'/api/admin/dashboard/stats?authorization=Bearer+anything',
	'/api/admin/dashboard/stats?session=anything',
	'/api/admin/dashboard/stats?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-override
	// keys.
	'/api/admin/dashboard/stats?bypass=1',
	'/api/admin/dashboard/stats?admin=1',
	'/api/admin/dashboard/stats?admin=true',
	'/api/admin/dashboard/stats?override=true',
	'/api/admin/dashboard/stats?force=true',

	// `?userGrowthMonths=` / `?activityTrendDays=` /
	// `?topItemsLimit=` / `?recentActivityLimit=` — the
	// obvious analytics-tuning override keys that a future
	// contributor might wire through to
	// `analyticsRepository.getBatchAnalytics({...})`. The
	// route hard-codes `12` / `14` / `10` / `20` today; a
	// regression that reads the search params unconditionally
	// would not bypass the auth gate but would change the
	// 200-branch payload shape.
	'/api/admin/dashboard/stats?userGrowthMonths=24',
	'/api/admin/dashboard/stats?userGrowthMonths=0',
	'/api/admin/dashboard/stats?userGrowthMonths=-1',
	'/api/admin/dashboard/stats?userGrowthMonths=999999',
	'/api/admin/dashboard/stats?activityTrendDays=30',
	'/api/admin/dashboard/stats?activityTrendDays=0',
	'/api/admin/dashboard/stats?topItemsLimit=100',
	'/api/admin/dashboard/stats?topItemsLimit=0',
	'/api/admin/dashboard/stats?recentActivityLimit=200',
	'/api/admin/dashboard/stats?recentActivityLimit=0',
	'/api/admin/dashboard/stats?userGrowthMonths=12&activityTrendDays=14&topItemsLimit=10&recentActivityLimit=20',

	// `?from=` / `?to=` / `?since=` / `?until=` — the
	// obvious time-range filter keys for an analytics
	// endpoint.
	'/api/admin/dashboard/stats?from=2024-01-01',
	'/api/admin/dashboard/stats?to=2026-12-31',
	'/api/admin/dashboard/stats?since=2024-01-01T00:00:00Z',
	'/api/admin/dashboard/stats?until=2026-12-31T23:59:59Z',
	'/api/admin/dashboard/stats?from=invalid-date',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys. The route returns the full
	// `AdminStats` shape today.
	'/api/admin/dashboard/stats?fields=totalUsers',
	'/api/admin/dashboard/stats?fields=totalUsers,registeredUsers',
	'/api/admin/dashboard/stats?select=newUsersToday',
	'/api/admin/dashboard/stats?include=topItemsData',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// cache-busting keys. The route disables caching via
	// `dynamic = 'force-dynamic'` / `revalidate = 0` /
	// `fetchCache = 'force-no-store'` already, so any
	// cache-busting query key is a no-op on the route's
	// caching behaviour.
	'/api/admin/dashboard/stats?refresh=1',
	'/api/admin/dashboard/stats?force=true',
	'/api/admin/dashboard/stats?fresh=true',
	'/api/admin/dashboard/stats?cache=bypass',
	'/api/admin/dashboard/stats?nocache=1',

	// `?format=` — content-negotiation key. The route
	// returns JSON exclusively today.
	'/api/admin/dashboard/stats?format=json',
	'/api/admin/dashboard/stats?format=xml',
	'/api/admin/dashboard/stats?format=csv',

	// `?locale=` / `?lang=` — i18n keys (relevant to the
	// `topItemsData[].name` / `recentActivity[].user` /
	// `recentActivity[].item` fields, which are locale-
	// sensitive on tenants with translated item names).
	'/api/admin/dashboard/stats?locale=en',
	'/api/admin/dashboard/stats?locale=fr',
	'/api/admin/dashboard/stats?lang=de',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-tenancy
	// keys.
	'/api/admin/dashboard/stats?tenant=acme',
	'/api/admin/dashboard/stats?tenantId=42',
	'/api/admin/dashboard/stats?org=ever-works',

	// Empty values — `searchParams.get(key)` on `?key=`
	// returns `''`. The gate fires before any potential
	// future validator, so empty values must round-trip to
	// the same 401 as the no-arg case.
	'/api/admin/dashboard/stats?userId=',
	'/api/admin/dashboard/stats?token=',
	'/api/admin/dashboard/stats?userGrowthMonths=',
	'/api/admin/dashboard/stats?from=',
	'/api/admin/dashboard/stats?fields=',

	// Repeated keys — `searchParams.get(name)` returns the
	// first value, but the gate fires before any validator,
	// so repetition is irrelevant on the unauth branch.
	'/api/admin/dashboard/stats?userId=a&userId=b',
	'/api/admin/dashboard/stats?token=foo&token=bar',
	'/api/admin/dashboard/stats?userGrowthMonths=12&userGrowthMonths=24',

	// Special-character / injection-style values that would
	// tempt a future regex match, LIKE-prefix, or path-
	// injection wiring. The gate fires before any value is
	// passed into a SQL or filesystem path.
	'/api/admin/dashboard/stats?userId=%3Cscript%3E',
	"/api/admin/dashboard/stats?userId=%27%20OR%201%3D1",
	'/api/admin/dashboard/stats?token=%2F..%2F..%2Fetc%2Fpasswd',
	'/api/admin/dashboard/stats?userGrowthMonths=NaN',
	'/api/admin/dashboard/stats?userGrowthMonths=Infinity',

	// Long values — guard against any future regex / regex-
	// based indexing bug that might trip on long inputs.
	`/api/admin/dashboard/stats?userId=${'x'.repeat(500)}`,
	`/api/admin/dashboard/stats?token=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero
	// query keys today, so any combination of unknown keys
	// is silently ignored on every branch.
	'/api/admin/dashboard/stats?unknown=value',
	'/api/admin/dashboard/stats?foo=bar&baz=qux',
	'/api/admin/dashboard/stats?userId=admin&token=foo&unknown=value&userGrowthMonths=24&fields=totalUsers&foo=bar'
] as const;

test.describe('API: /api/admin/dashboard/stats query-param surface', () => {
	for (const path of ADMIN_DASHBOARD_STATS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's admin gate fires before any potential
			// `searchParams` parsing, stats-repository call, or
			// analytics-repository call, so the unauthenticated
			// GET surface returns a 4xx (typically 401)
			// deterministically. There is no 5xx branch
			// reachable on the unauthenticated GET surface
			// because the catch can only fire after the gate has
			// already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/dashboard/stats returns a 4xx with a stable success-discriminator on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the admin gate must fire before any
		// potential validator / stats-repository / analytics-
		// repository call. The status must be a 4xx (typically
		// 401, possibly 403 depending on the admin-guard's
		// per-environment posture). Either way the response
		// must NOT echo any sensitive data — every consuming
		// client depends on the early-return.
		const response = await request.get('/api/admin/dashboard/stats');

		expect(response.status()).toBeGreaterThanOrEqual(400);
		expect(response.status()).toBeLessThan(500);

		// The response body is JSON-parseable on every reachable
		// branch. The exact envelope shape varies by the admin
		// guard's implementation (some return `{ success: false,
		// error: ... }`, some return `{ error: ... }`), but the
		// status discriminator is what callers depend on.
		const body = await response.json();
		expect(typeof body).toBe('object');
		expect(body).not.toBeNull();
	});

	test('GET /api/admin/dashboard/stats has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads zero query params today, so the
		// response status must be invariant to any combination
		// of unknown keys. A regression that reads any query
		// param before the gate would surface here as a status
		// divergence between the no-arg baseline and the
		// parameterised variant.
		const baseline = await request.get('/api/admin/dashboard/stats');
		const parameterised = await request.get(
			'/api/admin/dashboard/stats?userId=admin&token=anything&userGrowthMonths=24&unknown=value&fields=totalUsers&from=2024-01-01'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/dashboard/stats?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `checkAdminAuth()`'s session-driven admin resolution
		// would change the unauth branch from "always 401" to
		// "200 if ?userId=… is present" and silently grant
		// any anonymous caller arbitrary-user dashboard
		// access. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/admin/dashboard/stats');
		const responses = await Promise.all([
			request.get('/api/admin/dashboard/stats?userId=admin'),
			request.get('/api/admin/dashboard/stats?user_id=admin'),
			request.get('/api/admin/dashboard/stats?adminId=admin'),
			request.get('/api/admin/dashboard/stats?as=admin'),
			request.get('/api/admin/dashboard/stats?asAdmin=true'),
			request.get('/api/admin/dashboard/stats?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/dashboard/stats?token=… does NOT introduce a query-token auth bypass', async ({
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
		const baseline = await request.get('/api/admin/dashboard/stats');
		const responses = await Promise.all([
			request.get('/api/admin/dashboard/stats?token=anything'),
			request.get('/api/admin/dashboard/stats?secret=anything'),
			request.get('/api/admin/dashboard/stats?api_key=anything'),
			request.get('/api/admin/dashboard/stats?authorization=Bearer+anything'),
			request.get('/api/admin/dashboard/stats?session=anything'),
			request.get('/api/admin/dashboard/stats?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/dashboard/stats?bypass=… does NOT introduce a query-admin-override', async ({
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
		const baseline = await request.get('/api/admin/dashboard/stats');
		const responses = await Promise.all([
			request.get('/api/admin/dashboard/stats?bypass=1'),
			request.get('/api/admin/dashboard/stats?admin=1'),
			request.get('/api/admin/dashboard/stats?admin=true'),
			request.get('/api/admin/dashboard/stats?override=true'),
			request.get('/api/admin/dashboard/stats?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/dashboard/stats?userGrowthMonths=… analytics-tuning params do NOT change the unauth branch', async ({
		request
	}) => {
		// The route hard-codes `userGrowthMonths: 12`,
		// `activityTrendDays: 14`, `topItemsLimit: 10`, and
		// `recentActivityLimit: 20` in its
		// `analyticsRepository.getBatchAnalytics({...})` call
		// today. A regression that reads the search params
		// before the gate would change the response payload
		// shape on the auth branch. The unauth branch's
		// status must be invariant to the analytics-tuning
		// keys.
		const baseline = await request.get('/api/admin/dashboard/stats');
		const responses = await Promise.all([
			request.get('/api/admin/dashboard/stats?userGrowthMonths=24'),
			request.get('/api/admin/dashboard/stats?activityTrendDays=30'),
			request.get('/api/admin/dashboard/stats?topItemsLimit=100'),
			request.get('/api/admin/dashboard/stats?recentActivityLimit=200'),
			request.get('/api/admin/dashboard/stats?userGrowthMonths=NaN'),
			request.get('/api/admin/dashboard/stats?userGrowthMonths=Infinity'),
			request.get('/api/admin/dashboard/stats?userGrowthMonths=-1'),
			request.get('/api/admin/dashboard/stats?userGrowthMonths=999999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/dashboard/stats?from=…&to=… time-range params do NOT change the unauth branch', async ({
		request
	}) => {
		// The route returns canonical 12-month / 14-day /
		// top-10 / recent-20 windows today (no caller-
		// supplied time-range filtering). A regression that
		// reads `searchParams.get('from')` /
		// `searchParams.get('to')` before the gate would
		// change the response payload shape. The unauth
		// branch's status must be invariant to the time-
		// range keys.
		const baseline = await request.get('/api/admin/dashboard/stats');
		const responses = await Promise.all([
			request.get('/api/admin/dashboard/stats?from=2024-01-01'),
			request.get('/api/admin/dashboard/stats?to=2026-12-31'),
			request.get('/api/admin/dashboard/stats?since=2024-01-01T00:00:00Z'),
			request.get('/api/admin/dashboard/stats?until=2026-12-31T23:59:59Z'),
			request.get('/api/admin/dashboard/stats?from=invalid-date')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/dashboard/stats?format=… does NOT introduce a content-negotiation bypass', async ({
		request
	}) => {
		// The route returns JSON exclusively today. A future
		// `?format=csv` / `?format=xml` extension would be a
		// natural fit for an admin dashboard data-export
		// flow, but it must not bypass the auth gate. The
		// unauth branch's status must be invariant to the
		// format key.
		const baseline = await request.get('/api/admin/dashboard/stats');
		const responses = await Promise.all([
			request.get('/api/admin/dashboard/stats?format=json'),
			request.get('/api/admin/dashboard/stats?format=xml'),
			request.get('/api/admin/dashboard/stats?format=csv')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/dashboard/stats keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth branch.
		// The shape guarantees the route's admin gate fires
		// before any branching on potential future query
		// schemas.
		const responses = await Promise.all([
			request.get('/api/admin/dashboard/stats'),
			request.get(
				'/api/admin/dashboard/stats?userId=admin&token=foo&userGrowthMonths=24&format=csv'
			),
			request.get(
				'/api/admin/dashboard/stats?from=2024-01-01&to=2026-12-31&topItemsLimit=100&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/dashboard/stats does NOT branch on Accept header', async ({
		request
	}) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to the same
		// status.
		const baseline = await request.get('/api/admin/dashboard/stats');
		const responses = await Promise.all([
			request.get('/api/admin/dashboard/stats', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/admin/dashboard/stats', {
				headers: { Accept: 'application/xml' }
			}),
			request.get('/api/admin/dashboard/stats', {
				headers: { Accept: 'text/csv' }
			}),
			request.get('/api/admin/dashboard/stats', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
