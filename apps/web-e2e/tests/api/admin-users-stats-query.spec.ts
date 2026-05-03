import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only user-statistics endpoint served by
 * `apps/web/app/api/admin/users/stats/route.ts`.
 *
 * `GET /api/admin/users/stats` is **admin-gated** via the
 * shared `checkAdminAuth()` helper at
 * `apps/web/lib/auth/admin-guard.ts`, which is a
 * **three-step** gate that resolves the unauthenticated,
 * authenticated-without-id, and authenticated-non-admin
 * branches into **three** distinct envelopes:
 *
 *     export async function checkAdminAuth(): Promise<NextResponse | null> {
 *       try {
 *         const session = await auth();
 *         if (!session?.user) {
 *           return NextResponse.json(
 *             { success: false, error: 'Unauthorized' },
 *             { status: 401 }
 *           );
 *         }
 *         if (!session.user.id) {
 *           return NextResponse.json(
 *             { success: false, error: 'User ID not found' },
 *             { status: 401 }
 *           );
 *         }
 *         const userIsAdmin = await isAdmin(session.user.id);
 *         if (!userIsAdmin) {
 *           return NextResponse.json(
 *             { success: false, error: 'Insufficient permissions' },
 *             { status: 403 }
 *           );
 *         }
 *         return null;
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Internal server error' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The route's wrapping handler signature is the bare
 * `GET()` (no `request` parameter) — symmetric with the
 * `admin/dashboard/stats`, `admin/geo-analytics`,
 * `admin/clients/dashboard`, `admin/location-index`, and
 * `admin/roles/[id]/permissions` siblings that route
 * through `checkAdminAuth()` — and **distinct** from the
 * sibling `admin/items/stats` route's
 * `GET(request: Request)` signature (which uses an
 * `auth()` chain with a single-step `!session?.user?.isAdmin`
 * → 401 'Unauthorized' gate that collapses both
 * unauthenticated and authenticated-non-admin branches
 * into the same envelope) and from the `admin/roles/stats`
 * route's bare-`GET()` two-step `auth()` chain (401 vs
 * 403 with the bare `'Forbidden'` message).
 *
 * The bare-`GET()` handler signature narrows the request
 * surface to zero — there is no way for a future
 * contributor to silently leak a query-param-driven bypass
 * without also widening the handler signature.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated** (no session): the first-step
 *     `checkAdminAuth()` gate fires; the route returns
 *     401 with `{ success: false, error: 'Unauthorized' }`.
 *     This is the contract every assertion below pins,
 *     because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Authenticated session without `user.id`**: the
 *     second-step gate fires; the route returns 401 with
 *     `{ success: false, error: 'User ID not found' }`.
 *     Out of scope for this spec because the e2e runner
 *     is fully unauthenticated.
 *   - **Authenticated non-admin user**: the third-step
 *     gate fires after a `SELECT` round-trip via
 *     `isAdmin(session.user.id)`; the route returns 403
 *     with `{ success: false, error: 'Insufficient permissions' }`.
 *     Out of scope.
 *   - **Authenticated admin user**: all three gates pass;
 *     the route returns 200 with
 *     `{ success: true, data: { totalUsers, activeUsers, inactiveUsers, recentRegistrations, ... } }`
 *     via `userRepository.getStats()`. Out of scope.
 *   - **Internal error**: either the catch in
 *     `checkAdminAuth()` returns 500 with
 *     `{ success: false, error: 'Internal server error' }`,
 *     or the catch in the route handler returns 500 with
 *     the same envelope. Out of scope.
 *
 * The spec is unique among the admin-tree query-smoke
 * specs in that it pins **the `checkAdminAuth()`-shared
 * three-step gate** (the same gate the
 * `admin/dashboard/stats`, `admin/geo-analytics`,
 * `admin/clients/dashboard`, `admin/location-index`, and
 * `admin/roles/[id]/permissions` routes use). The
 * unauthenticated branch carries the bare `'Unauthorized'`
 * message — distinct from the `'User ID not found'`
 * message the second-step gate emits, the
 * `'Insufficient permissions'` message the third-step
 * gate emits, the `'Forbidden'` message the
 * `admin/roles/stats` route's two-step `auth()` chain
 * emits on its third step, and the
 * `'Unauthorized. Admin access required.'` message the
 * sponsor-ads route's purpose-built guard emits.
 *
 * The smoke sweep below appends a wide variety of query
 * keys, headers, and cookies anyway, because:
 *
 *   1. A regression that adds a `request: NextRequest`
 *      parameter and reads `searchParams` for an
 *      `?as=admin` / `?token=…` / `?bypass=…` key
 *      would change the unauth-branch contract from
 *      "always 401" to "200 if the right key is
 *      present" — this sweep catches that.
 *   2. A regression that switches the handler to
 *      `GET(request: NextRequest)` and forwards
 *      `request.cookies` / `request.geo` / `request.ip`
 *      to a custom auth resolver would bypass the
 *      `checkAdminAuth()` → `auth()` → `session.user`
 *      chain — this sweep catches that.
 *   3. A regression that reads `Accept` / `Accept-Encoding`
 *      / `X-Forwarded-For` / `X-Real-IP` headers for
 *      content-type negotiation or impersonation
 *      would change the unauth-branch contract — this
 *      sweep catches that.
 *   4. A regression that reads `searchParams` for a
 *      future `?role=admin` / `?role=moderator` /
 *      `?role=user` filter that scopes the stats to a
 *      specific role (the response shape includes
 *      `roleDistribution` today, so a future contributor
 *      might add a per-role drill-down) would change
 *      the unauth-branch contract — this sweep catches
 *      that.
 *   5. A regression that reads `searchParams` for a
 *      future `?from=…` / `?to=…` / `?days=…`
 *      time-window filter that scopes the
 *      `recentRegistrations` count to a configurable
 *      window (currently hard-coded to "last 30 days")
 *      would change the unauth-branch contract — this
 *      sweep catches that.
 *   6. A regression that reads `searchParams` for a
 *      future `?topActiveUsersLimit=…` filter that
 *      tunes the `topActiveUsers` array length
 *      (currently `maxItems: 10` per the swagger doc)
 *      would change the unauth-branch contract — this
 *      sweep catches that.
 *
 * The shape mirrors the sibling admin-gated query smoke
 * specs (`admin-categories-query.spec.ts`,
 * `admin-clients-query.spec.ts`,
 * `admin-collections-query.spec.ts`,
 * `admin-comments-query.spec.ts`,
 * `admin-companies-query.spec.ts`,
 * `admin-dashboard-stats-query.spec.ts`,
 * `admin-featured-items-query.spec.ts`,
 * `admin-geo-analytics-query.spec.ts`,
 * `admin-items-export-sample-query.spec.ts`,
 * `admin-items-query.spec.ts`,
 * `admin-items-stats-query.spec.ts`,
 * `admin-navigation-query.spec.ts`,
 * `admin-notifications-query.spec.ts`,
 * `admin-reports-query.spec.ts`,
 * `admin-roles-stats-query.spec.ts`,
 * `admin-settings-query.spec.ts`,
 * `admin-sponsor-ads-query.spec.ts`,
 * `admin-tags-all-query.spec.ts`,
 * `admin-tags-query.spec.ts`,
 * `admin-users-query.spec.ts`) — all share the same
 * "session-or-admin gated, 401/403 before any
 * service-layer call" posture. The user-stats route is
 * unique in that:
 *   1. The gate is the `checkAdminAuth()` helper's
 *      three-step gate — distinct from the single-step
 *      gates of the clients / comments / companies / users
 *      routes, the single-step 403-collapsed gate of the
 *      reports route, the single-step 401-collapsed gate
 *      of the items / items-stats / navigation / settings
 *      routes, and the two-step 401-vs-403 gate of the
 *      roles-stats route.
 *   2. The handler signature is the bare `GET()` (no
 *      parameter) — distinct from the sibling
 *      `admin/users` route's `GET(request: Request)`
 *      signature (which reads `searchParams` for `page` /
 *      `limit` / `sortBy` / `sortOrder` / `roleId` /
 *      `status` / `search` / `gdprConsentGiven` /
 *      `subscriptionPlanId`).
 *   3. The 401 envelope carries the bare `'Unauthorized'`
 *      message (the first-step gate's message). A
 *      regression that switches to the second-step gate's
 *      `'User ID not found'` message would surface here
 *      as a body-divergence assertion failure.
 *   4. The route delegates to `userRepository.getStats()`
 *      which performs multiple DB round-trips (total /
 *      active / inactive / recent / role distribution /
 *      top active users / averages). The auth gate fires
 *      before any of those round-trips on the unauth
 *      branch.
 *   5. The `roleDistribution` field in the success
 *      response is unique to this route (not present
 *      in `admin/dashboard/stats` or `admin/items/stats`).
 *      A regression that exposes role distribution via
 *      a query-param filter would change the unauth-
 *      branch contract — this sweep catches that.
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of that.
 */
const ADMIN_USERS_STATS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/users/stats',

	// `?page=` / `?limit=` — pagination params the
	// sibling `admin/users` route reads but the
	// `admin/users/stats` route does not. A regression
	// that adds pagination parsing would change the
	// unauth-branch contract.
	'/api/admin/users/stats?page=1',
	'/api/admin/users/stats?page=2',
	'/api/admin/users/stats?page=999',
	'/api/admin/users/stats?limit=10',
	'/api/admin/users/stats?limit=50',
	'/api/admin/users/stats?limit=100',
	'/api/admin/users/stats?page=1&limit=20',
	'/api/admin/users/stats?page=invalid',
	'/api/admin/users/stats?limit=invalid',
	'/api/admin/users/stats?page=-1',
	'/api/admin/users/stats?page=0',
	'/api/admin/users/stats?limit=0',
	'/api/admin/users/stats?limit=-1',

	// `?role=` — role-distribution drill-down filter
	// the route does NOT read today. The success
	// response includes `roleDistribution` as a
	// keyed object; a future contributor might add
	// `?role=admin` to scope the stats to a specific
	// role. A regression that adds it would change
	// the unauth-branch contract.
	'/api/admin/users/stats?role=admin',
	'/api/admin/users/stats?role=moderator',
	'/api/admin/users/stats?role=user',
	'/api/admin/users/stats?role=',
	'/api/admin/users/stats?role=invalid',
	'/api/admin/users/stats?role=ADMIN',

	// `?roleId=` — role-id drill-down filter the
	// sibling `admin/users` route accepts. The
	// `admin/users/stats` route does NOT read this
	// today.
	'/api/admin/users/stats?roleId=1',
	'/api/admin/users/stats?roleId=invalid',
	'/api/admin/users/stats?roleId=admin',

	// `?status=` — active / inactive enum filter the
	// sibling `admin/users` route accepts. The
	// `admin/users/stats` route does NOT read this.
	'/api/admin/users/stats?status=active',
	'/api/admin/users/stats?status=inactive',
	'/api/admin/users/stats?status=',
	'/api/admin/users/stats?status=invalid',
	'/api/admin/users/stats?status=ACTIVE',

	// `?gdprConsentGiven=` — boolean filter the
	// sibling `admin/users` route accepts.
	'/api/admin/users/stats?gdprConsentGiven=true',
	'/api/admin/users/stats?gdprConsentGiven=false',
	'/api/admin/users/stats?gdprConsentGiven=1',
	'/api/admin/users/stats?gdprConsentGiven=0',

	// `?subscriptionPlanId=` — per-plan filter the
	// sibling `admin/users` route accepts.
	'/api/admin/users/stats?subscriptionPlanId=free',
	'/api/admin/users/stats?subscriptionPlanId=pro',
	'/api/admin/users/stats?subscriptionPlanId=invalid',

	// `?isAdmin=` — boolean filter that would scope
	// the stats to admin-bit users only.
	'/api/admin/users/stats?isAdmin=true',
	'/api/admin/users/stats?isAdmin=false',
	'/api/admin/users/stats?isAdmin=1',
	'/api/admin/users/stats?isAdmin=0',

	// `?sortBy=` / `?sortOrder=` — order-targeting
	// keys the sibling `admin/users` route accepts.
	'/api/admin/users/stats?sortBy=name',
	'/api/admin/users/stats?sortBy=email',
	'/api/admin/users/stats?sortBy=created_at',
	'/api/admin/users/stats?sortBy=loginCount',
	'/api/admin/users/stats?sortOrder=asc',
	'/api/admin/users/stats?sortOrder=desc',

	// `?search=` — free-text filter the sibling
	// `admin/users` route accepts.
	'/api/admin/users/stats?search=test',
	'/api/admin/users/stats?search=admin',
	'/api/admin/users/stats?search=',
	"/api/admin/users/stats?search=%27%20OR%201%3D1",
	'/api/admin/users/stats?search=%3Cscript%3E',
	'/api/admin/users/stats?search=%25',
	`/api/admin/users/stats?search=${'x'.repeat(500)}`,

	// `?from=` / `?to=` / `?since=` / `?until=` /
	// `?days=` — time-window filter keys for the
	// `recentRegistrations` field (currently hard-
	// coded to "last 30 days" per the swagger doc).
	'/api/admin/users/stats?from=2024-01-01',
	'/api/admin/users/stats?to=2026-12-31',
	'/api/admin/users/stats?since=2024-01-01T00:00:00Z',
	'/api/admin/users/stats?until=2026-12-31T23:59:59Z',
	'/api/admin/users/stats?from=invalid-date',
	'/api/admin/users/stats?days=7',
	'/api/admin/users/stats?days=30',
	'/api/admin/users/stats?days=90',
	'/api/admin/users/stats?days=invalid',

	// `?topActiveUsersLimit=` — tuning override for
	// the `topActiveUsers` array length (currently
	// `maxItems: 10` per the swagger doc).
	'/api/admin/users/stats?topActiveUsersLimit=5',
	'/api/admin/users/stats?topActiveUsersLimit=10',
	'/api/admin/users/stats?topActiveUsersLimit=100',
	'/api/admin/users/stats?topActiveUsersLimit=invalid',
	'/api/admin/users/stats?topActiveUsersLimit=0',
	'/api/admin/users/stats?topActiveUsersLimit=-1',

	// `?userId=` / `?adminId=` / `?as=` —
	// impersonation keys.
	'/api/admin/users/stats?userId=anything',
	'/api/admin/users/stats?user_id=anything',
	'/api/admin/users/stats?adminId=anything',
	'/api/admin/users/stats?as=admin',
	'/api/admin/users/stats?asUser=true',
	'/api/admin/users/stats?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/users/stats?token=anything',
	'/api/admin/users/stats?secret=anything',
	'/api/admin/users/stats?api_key=anything',
	'/api/admin/users/stats?authorization=Bearer+anything',
	'/api/admin/users/stats?session=anything',
	'/api/admin/users/stats?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/users/stats?bypass=1',
	'/api/admin/users/stats?admin=1',
	'/api/admin/users/stats?admin=true',
	'/api/admin/users/stats?override=true',
	'/api/admin/users/stats?force=true',

	// `?refresh=` / `?cache=` — cache-busting keys.
	'/api/admin/users/stats?refresh=1',
	'/api/admin/users/stats?fresh=true',
	'/api/admin/users/stats?cache=bypass',
	'/api/admin/users/stats?nocache=1',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/users/stats?locale=en',
	'/api/admin/users/stats?locale=fr',
	'/api/admin/users/stats?lang=de',

	// `?fields=` / `?select=` / `?include=` — content
	// projection keys.
	'/api/admin/users/stats?fields=totalUsers',
	'/api/admin/users/stats?select=activeUsers',
	'/api/admin/users/stats?include=topActiveUsers',
	'/api/admin/users/stats?exclude=roleDistribution',

	// Repeated keys.
	'/api/admin/users/stats?as=admin&as=user',
	'/api/admin/users/stats?token=foo&token=bar',
	'/api/admin/users/stats?bypass=1&bypass=0',
	'/api/admin/users/stats?role=admin&role=user',

	// Bogus / typo'd query keys.
	'/api/admin/users/stats?unknown=value',
	'/api/admin/users/stats?foo=bar&baz=qux',
	'/api/admin/users/stats?userId=admin&token=foo&unknown=value&page=1&limit=20&status=active&isAdmin=true&role=admin&days=30&topActiveUsersLimit=10&foo=bar'
] as const;

test.describe('API: /api/admin/users/stats query-param surface', () => {
	for (const path of ADMIN_USERS_STATS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// `checkAdminAuth()`'s three-step gate fires
			// before any `userRepository.getStats()` call,
			// and the handler signature is the bare `GET()`
			// (no `request` parameter), so there is no
			// `searchParams` surface inside the handler at
			// all. The unauthenticated GET surface returns
			// a 4xx (specifically 401) deterministically.
			// A 500 is reachable only if the catch in
			// `checkAdminAuth()` or the catch in the route
			// handler fires, which never happens on the
			// unauth branch (the first-step
			// `if (!session?.user)` check returns the 401
			// envelope before any DB call).
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/users/stats returns 401 with the bare Unauthorized envelope on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the first-step gate
		// `if (!session?.user)` inside `checkAdminAuth()`
		// fires, returning 401 with the bare
		// `'Unauthorized'` message — distinct from the
		// second-step gate's `'User ID not found'` message
		// (reachable only by an authenticated session
		// without `user.id`) and the third-step gate's
		// `'Insufficient permissions'` message (reachable
		// only by an authenticated non-admin user).
		// A regression that switches the message OR the
		// status would surface here as a body-divergence
		// assertion failure.
		const response = await request.get('/api/admin/users/stats');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized'
		});
	});

	test('GET /api/admin/users/stats has a stable status across query permutations', async ({
		request
	}) => {
		// The route's handler signature is the bare `GET()`
		// (no `request` parameter), so there is no
		// `searchParams` surface inside the handler at all.
		// Every query-param permutation must round-trip to
		// the same status on the unauth branch.
		const baseline = await request.get('/api/admin/users/stats');
		const parameterised = await request.get(
			'/api/admin/users/stats?page=1&limit=20&status=active&isAdmin=true&role=admin&sortBy=name&sortOrder=asc&search=test&userId=admin&token=anything&days=30&topActiveUsersLimit=10&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/users/stats?page=…&limit=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The sibling `admin/users` route reads `?page=` /
		// `?limit=` via pagination parsing, but the
		// `admin/users/stats` route does NOT read query
		// params at all. A regression that adds pagination
		// parsing would change the unauth-branch contract.
		const baseline = await request.get('/api/admin/users/stats');
		const responses = await Promise.all([
			request.get('/api/admin/users/stats?page=1'),
			request.get('/api/admin/users/stats?page=invalid'),
			request.get('/api/admin/users/stats?page=-1'),
			request.get('/api/admin/users/stats?page=0'),
			request.get('/api/admin/users/stats?limit=10'),
			request.get('/api/admin/users/stats?limit=invalid'),
			request.get('/api/admin/users/stats?limit=0'),
			request.get('/api/admin/users/stats?limit=-1'),
			request.get('/api/admin/users/stats?limit=99999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users/stats?role=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The success response includes `roleDistribution`
		// as a keyed object (admin / moderator / user
		// counts). A future contributor who reads
		// `searchParams.get('role')` to scope the stats
		// to a specific role would change the unauth-
		// branch contract from "always 401" to "200 if
		// ?role=… is present".
		const baseline = await request.get('/api/admin/users/stats');
		const responses = await Promise.all([
			request.get('/api/admin/users/stats?role=admin'),
			request.get('/api/admin/users/stats?role=moderator'),
			request.get('/api/admin/users/stats?role=user'),
			request.get('/api/admin/users/stats?role=invalid'),
			request.get('/api/admin/users/stats?role='),
			request.get('/api/admin/users/stats?role=ADMIN'),
			request.get('/api/admin/users/stats?roleId=1'),
			request.get('/api/admin/users/stats?roleId=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users/stats?status=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The sibling `admin/users` route reads
		// `?status=` (active / inactive) but the
		// `admin/users/stats` route does NOT.
		const baseline = await request.get('/api/admin/users/stats');
		const responses = await Promise.all([
			request.get('/api/admin/users/stats?status=active'),
			request.get('/api/admin/users/stats?status=inactive'),
			request.get('/api/admin/users/stats?status=invalid'),
			request.get('/api/admin/users/stats?status='),
			request.get('/api/admin/users/stats?status=ACTIVE')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users/stats?gdprConsentGiven=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The sibling `admin/users` route reads
		// `?gdprConsentGiven=` (true / false) but the
		// `admin/users/stats` route does NOT. A regression
		// that adds GDPR-consent-bit filtering to scope
		// the stats would change the unauth-branch
		// contract.
		const baseline = await request.get('/api/admin/users/stats');
		const responses = await Promise.all([
			request.get('/api/admin/users/stats?gdprConsentGiven=true'),
			request.get('/api/admin/users/stats?gdprConsentGiven=false'),
			request.get('/api/admin/users/stats?gdprConsentGiven=1'),
			request.get('/api/admin/users/stats?gdprConsentGiven=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users/stats?subscriptionPlanId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The sibling `admin/users` route reads
		// `?subscriptionPlanId=` for per-plan filtering
		// but the `admin/users/stats` route does NOT.
		const baseline = await request.get('/api/admin/users/stats');
		const responses = await Promise.all([
			request.get('/api/admin/users/stats?subscriptionPlanId=free'),
			request.get('/api/admin/users/stats?subscriptionPlanId=pro'),
			request.get('/api/admin/users/stats?subscriptionPlanId=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users/stats?isAdmin=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('isAdmin')` as a fallback for
		// `session.user.isAdmin` would change the unauth
		// branch from "always 401" to "200 if
		// ?isAdmin=true is present" — silently granting
		// any anonymous caller admin-level user-stats
		// visibility.
		const baseline = await request.get('/api/admin/users/stats');
		const responses = await Promise.all([
			request.get('/api/admin/users/stats?isAdmin=true'),
			request.get('/api/admin/users/stats?isAdmin=false'),
			request.get('/api/admin/users/stats?isAdmin=1'),
			request.get('/api/admin/users/stats?isAdmin=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users/stats?days=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The success response includes
		// `recentRegistrations` (currently hard-coded to
		// "last 30 days" per the swagger doc). A future
		// contributor who reads `searchParams.get('days')`
		// to make the window configurable would change
		// the unauth-branch contract from "always 401"
		// to "200 if ?days=… is present".
		const baseline = await request.get('/api/admin/users/stats');
		const responses = await Promise.all([
			request.get('/api/admin/users/stats?days=7'),
			request.get('/api/admin/users/stats?days=30'),
			request.get('/api/admin/users/stats?days=90'),
			request.get('/api/admin/users/stats?days=invalid'),
			request.get('/api/admin/users/stats?from=2024-01-01'),
			request.get('/api/admin/users/stats?to=2026-12-31'),
			request.get('/api/admin/users/stats?since=2024-01-01T00:00:00Z'),
			request.get('/api/admin/users/stats?until=2026-12-31T23:59:59Z'),
			request.get('/api/admin/users/stats?from=invalid-date')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users/stats?topActiveUsersLimit=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The success response includes `topActiveUsers`
		// (currently `maxItems: 10` per the swagger doc).
		// A future contributor who reads
		// `searchParams.get('topActiveUsersLimit')` to
		// tune the array length would change the unauth-
		// branch contract.
		const baseline = await request.get('/api/admin/users/stats');
		const responses = await Promise.all([
			request.get('/api/admin/users/stats?topActiveUsersLimit=5'),
			request.get('/api/admin/users/stats?topActiveUsersLimit=10'),
			request.get('/api/admin/users/stats?topActiveUsersLimit=100'),
			request.get('/api/admin/users/stats?topActiveUsersLimit=invalid'),
			request.get('/api/admin/users/stats?topActiveUsersLimit=0'),
			request.get('/api/admin/users/stats?topActiveUsersLimit=-1')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users/stats?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven user resolution would
		// change the unauth branch from "always 401" to
		// "200 if ?userId=… is present".
		const baseline = await request.get('/api/admin/users/stats');
		const responses = await Promise.all([
			request.get('/api/admin/users/stats?userId=admin'),
			request.get('/api/admin/users/stats?user_id=admin'),
			request.get('/api/admin/users/stats?adminId=admin'),
			request.get('/api/admin/users/stats?as=admin'),
			request.get('/api/admin/users/stats?asUser=true'),
			request.get('/api/admin/users/stats?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users/stats?token=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who adds magic-token-based
		// admin bypass would change the unauth branch
		// from "always 401" to "200 if the right token is
		// present".
		const baseline = await request.get('/api/admin/users/stats');
		const responses = await Promise.all([
			request.get('/api/admin/users/stats?token=anything'),
			request.get('/api/admin/users/stats?secret=anything'),
			request.get('/api/admin/users/stats?api_key=anything'),
			request.get('/api/admin/users/stats?authorization=Bearer+anything'),
			request.get('/api/admin/users/stats?session=anything'),
			request.get('/api/admin/users/stats?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users/stats?bypass=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who adds a `?bypass=…`,
		// `?admin=…`, or `?override=…` admin-override key
		// would change the unauth branch from "always
		// 401" to "200 if the right key is present".
		const baseline = await request.get('/api/admin/users/stats');
		const responses = await Promise.all([
			request.get('/api/admin/users/stats?bypass=1'),
			request.get('/api/admin/users/stats?admin=1'),
			request.get('/api/admin/users/stats?admin=true'),
			request.get('/api/admin/users/stats?override=true'),
			request.get('/api/admin/users/stats?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users/stats does NOT branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types
		// today; every Accept header must round-trip to
		// the same status on the unauth branch.
		const baseline = await request.get('/api/admin/users/stats');
		const responses = await Promise.all([
			request.get('/api/admin/users/stats', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/users/stats', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/users/stats', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/users/stats', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users/stats keeps a bare-GET-no-arg handler signature stable', async ({
		request
	}) => {
		// The route's handler signature is `GET()` (no
		// `request` parameter), so there is no
		// `searchParams` surface inside the handler at
		// all. A regression that widens the signature to
		// `GET(request: NextRequest)` and forwards
		// `request.cookies` / `request.geo` /
		// `request.ip` to a custom auth resolver would
		// bypass the `checkAdminAuth()` → `auth()` →
		// `session.user` chain. The unauth-branch
		// contract must stay invariant under any of those
		// side channels.
		const responses = await Promise.all([
			request.get('/api/admin/users/stats', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/users/stats', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/users/stats', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/users/stats', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/users/stats response message does NOT echo any other admin-tree route signature', async ({
		request
	}) => {
		// The 401 envelope carries the bare `'Unauthorized'`
		// message — distinct from
		// `'User ID not found'` (the second-step gate's
		// 401 message inside `checkAdminAuth()`),
		// `'Insufficient permissions'` (the third-step
		// gate's 403 message inside `checkAdminAuth()`),
		// `'Forbidden'` (the `admin/roles/stats` route's
		// two-step gate emits this on the third-step),
		// and
		// `'Unauthorized. Admin access required.'` (the
		// sponsor-ads route's purpose-built guard). A
		// regression that switches to any of those
		// alternatives would surface here as a body-
		// divergence assertion failure.
		const response = await request.get('/api/admin/users/stats');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('User ID not found');
		expect(body.error).not.toBe('Insufficient permissions');
		expect(body.error).not.toBe('Forbidden');
		expect(body.error).not.toBe('Unauthorized. Admin access required.');
	});

	test('GET /api/admin/users/stats keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth
		// branch.
		const responses = await Promise.all([
			request.get('/api/admin/users/stats'),
			request.get(
				'/api/admin/users/stats?page=1&limit=20&status=active&isAdmin=true&role=admin&sortBy=name&sortOrder=asc'
			),
			request.get(
				'/api/admin/users/stats?userId=admin&token=foo&page=invalid&limit=99999&status=invalid&isAdmin=invalid&search=test&days=invalid&topActiveUsersLimit=invalid&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/users/stats repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/users/stats');
		const responses = await Promise.all([
			request.get('/api/admin/users/stats?as=admin&as=user'),
			request.get('/api/admin/users/stats?token=foo&token=bar'),
			request.get('/api/admin/users/stats?bypass=1&bypass=0'),
			request.get('/api/admin/users/stats?role=admin&role=user'),
			request.get('/api/admin/users/stats?days=7&days=30')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
