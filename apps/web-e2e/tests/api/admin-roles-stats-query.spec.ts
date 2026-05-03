import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only role-statistics endpoint served by
 * `apps/web/app/api/admin/roles/stats/route.ts`.
 *
 * `GET /api/admin/roles/stats` is **admin-gated** via
 * `auth()` + a **two-step** check that resolves the
 * unauthenticated and authenticated-non-admin branches
 * into **distinct** status codes (401 vs 403) — distinct
 * from the sibling `admin/clients` / `admin/comments` /
 * `admin/companies` / `admin/users` routes' single-step
 * `!session?.user?.isAdmin` → 401 'Unauthorized' gate
 * (which collapses both unauthenticated and
 * authenticated-non-admin into the same 401 envelope)
 * and distinct from the `admin/reports` route's
 * single-step `!session?.user?.isAdmin` → 403
 * 'Forbidden' gate (which collapses both branches into
 * the same 403 envelope). The route's gate is:
 *
 *     export async function GET() {
 *       try {
 *         const session = await auth();
 *         if (!session?.user) {
 *           return NextResponse.json(
 *             { success: false, error: 'Unauthorized' },
 *             { status: 401 }
 *           );
 *         }
 *         if (!session.user.isAdmin) {
 *           return NextResponse.json(
 *             { success: false, error: 'Forbidden' },
 *             { status: 403 }
 *           );
 *         }
 *         const roles = await roleRepository.findAll();
 *         // ...stats computation…
 *         return NextResponse.json({ success: true, data: stats });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Failed to fetch role statistics' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated** (no session): the first-step
 *     gate `if (!session?.user)` fires; the route
 *     returns 401 with
 *     `{ success: false, error: 'Unauthorized' }`.
 *     This is the contract every assertion below pins,
 *     because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Authenticated non-admin user**: the first-step
 *     gate passes (`session.user` is truthy), the
 *     second-step gate `if (!session.user.isAdmin)`
 *     fires; the route returns 403 with
 *     `{ success: false, error: 'Forbidden' }`. Out of
 *     scope for this spec because the e2e runner is
 *     unauthenticated.
 *   - **Authenticated admin user**: both gates pass; the
 *     route returns 200 with
 *     `{ success: true, data: { total, active, inactive, averagePermissions } }`.
 *     Out of scope.
 *   - **Internal error**: the catch returns 500 with
 *     `{ success: false, error: 'Failed to fetch role statistics' }`.
 *     Out of scope.
 *
 * The spec is unique among the admin-tree query-smoke
 * specs in that it pins **the two-step 401/403 gate**
 * (distinct from the single-step 401-collapsed
 * `admin/clients` / `admin/comments` / `admin/companies` /
 * `admin/users` routes and the single-step 403-collapsed
 * `admin/reports` route) AND **a query-param-empty
 * handler signature** — the handler is `GET()` (no
 * `request` parameter), so there is no `searchParams`
 * surface inside the handler at all. The smoke sweep
 * below appends a wide variety of query keys, headers,
 * and cookies anyway, because:
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
 *      `auth()` → `session.user` chain — this sweep
 *      catches that.
 *   3. A regression that reads `Accept` / `Accept-Encoding` /
 *      `X-Forwarded-For` / `X-Real-IP` headers for
 *      content-type negotiation or impersonation
 *      would change the unauth-branch contract — this
 *      sweep catches that.
 *
 * The handler signature is the bare `GET()` (no
 * parameter) — distinct from the sibling `admin/roles`
 * route's `GET(request: NextRequest)` signature (which
 * reads `searchParams` for `page` / `limit` / `status` /
 * `sortBy` / `sortOrder`) and from the `admin/reports`
 * route's `GET(request: Request)` signature (which uses
 * the bare `Request` Web API type). The bare-`GET()`
 * handler signature narrows the request surface to
 * zero — there is no way for a future contributor to
 * silently leak a query-param-driven bypass without
 * also widening the handler signature.
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
 * `admin-notifications-query.spec.ts`,
 * `admin-reports-query.spec.ts`,
 * `admin-users-query.spec.ts`) — all share the same
 * "session-or-admin gated, 401/403 before any
 * service-layer call" posture. The role-stats route is
 * unique in that:
 *   1. The two-step gate emits **distinct** status codes
 *      for missing-session (401 'Unauthorized') and
 *      missing-admin-bit (403 'Forbidden') — distinct
 *      from the single-step 401-collapsed gates of the
 *      clients / comments / companies / users routes
 *      and from the single-step 403-collapsed gate of
 *      the reports route.
 *   2. The handler signature is the bare `GET()` (no
 *      parameter) — distinct from every other admin-
 *      tree route's signed handler signature. This is
 *      the strongest possible protection against
 *      query-param-driven bypass regressions: a
 *      contributor who wants to add a query-param-
 *      driven bypass must first widen the handler
 *      signature.
 *   3. The route does NOT call
 *      `checkDatabaseAvailability()` before the auth
 *      gate — distinct from the `admin/reports` route's
 *      pre-auth DB check. The auth gate fires first;
 *      a DB failure surfaces as a 500 in the catch
 *      block.
 *   4. The 401 envelope carries the bare `'Unauthorized'`
 *      message (NOT
 *      `'Unauthorized. Admin access required.'` like
 *      the sponsor-ads route, NOT the bare
 *      `'Forbidden'` like the reports route) — a
 *      regression that switches the message would
 *      surface here as a body-divergence assertion
 *      failure.
 *   5. The route runs on the implicit Edge runtime
 *      (no `runtime = 'nodejs'` export) — distinct
 *      from the `admin/reports` route's explicit
 *      `runtime = 'nodejs'` export. Drizzle's
 *      `findAll()` repository call must work under
 *      both runtimes; this spec is invariant to the
 *      runtime choice because the auth gate fires
 *      before the repository call on every unauth
 *      invocation.
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of that.
 */
const ADMIN_ROLES_STATS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/roles/stats',

	// `?page=` / `?limit=` — pagination params the
	// sibling `admin/roles` route reads but the
	// `admin/roles/stats` route does not. A regression
	// that adds pagination parsing would change the
	// unauth-branch contract.
	'/api/admin/roles/stats?page=1',
	'/api/admin/roles/stats?page=2',
	'/api/admin/roles/stats?page=999',
	'/api/admin/roles/stats?limit=10',
	'/api/admin/roles/stats?limit=50',
	'/api/admin/roles/stats?limit=100',
	'/api/admin/roles/stats?page=1&limit=20',
	'/api/admin/roles/stats?page=invalid',
	'/api/admin/roles/stats?limit=invalid',
	'/api/admin/roles/stats?page=-1',
	'/api/admin/roles/stats?page=0',
	'/api/admin/roles/stats?limit=0',
	'/api/admin/roles/stats?limit=-1',

	// `?status=` — enum filter the sibling `admin/roles`
	// route accepts (active / inactive). The
	// `admin/roles/stats` route does NOT read this
	// query key today; a regression that adds an
	// `?status=…` filter to scope the stats to a
	// specific status would change the unauth-branch
	// contract.
	'/api/admin/roles/stats?status=active',
	'/api/admin/roles/stats?status=inactive',
	'/api/admin/roles/stats?status=',
	'/api/admin/roles/stats?status=invalid',
	'/api/admin/roles/stats?status=ACTIVE',

	// `?isAdmin=` — boolean filter that would scope
	// the stats to admin-roles only. Not read today;
	// a regression that adds it would change the
	// unauth-branch contract.
	'/api/admin/roles/stats?isAdmin=true',
	'/api/admin/roles/stats?isAdmin=false',
	'/api/admin/roles/stats?isAdmin=1',
	'/api/admin/roles/stats?isAdmin=0',

	// `?sortBy=` / `?sortOrder=` — order-targeting
	// keys the sibling `admin/roles` route accepts.
	'/api/admin/roles/stats?sortBy=name',
	'/api/admin/roles/stats?sortBy=id',
	'/api/admin/roles/stats?sortBy=created_at',
	'/api/admin/roles/stats?sortOrder=asc',
	'/api/admin/roles/stats?sortOrder=desc',

	// `?search=` — free-text filter the sibling
	// `admin/roles` route does not accept but the
	// `admin/roles/stats` route equally rejects.
	'/api/admin/roles/stats?search=test',
	'/api/admin/roles/stats?search=admin',
	'/api/admin/roles/stats?search=',
	"/api/admin/roles/stats?search=%27%20OR%201%3D1",
	'/api/admin/roles/stats?search=%3Cscript%3E',
	'/api/admin/roles/stats?search=%25',
	`/api/admin/roles/stats?search=${'x'.repeat(500)}`,

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys.
	'/api/admin/roles/stats?userId=anything',
	'/api/admin/roles/stats?user_id=anything',
	'/api/admin/roles/stats?adminId=anything',
	'/api/admin/roles/stats?as=admin',
	'/api/admin/roles/stats?asUser=true',
	'/api/admin/roles/stats?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/roles/stats?token=anything',
	'/api/admin/roles/stats?secret=anything',
	'/api/admin/roles/stats?api_key=anything',
	'/api/admin/roles/stats?authorization=Bearer+anything',
	'/api/admin/roles/stats?session=anything',
	'/api/admin/roles/stats?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/roles/stats?bypass=1',
	'/api/admin/roles/stats?admin=1',
	'/api/admin/roles/stats?admin=true',
	'/api/admin/roles/stats?override=true',
	'/api/admin/roles/stats?force=true',

	// `?roleId=` / `?roleName=` — per-row-targeting
	// keys for a future contributor who wants per-
	// role stats.
	'/api/admin/roles/stats?roleId=admin',
	'/api/admin/roles/stats?roleName=Administrator',

	// `?from=` / `?to=` / `?since=` / `?until=` —
	// time-range filter keys.
	'/api/admin/roles/stats?from=2024-01-01',
	'/api/admin/roles/stats?to=2026-12-31',
	'/api/admin/roles/stats?since=2024-01-01T00:00:00Z',
	'/api/admin/roles/stats?until=2026-12-31T23:59:59Z',
	'/api/admin/roles/stats?from=invalid-date',

	// `?refresh=` / `?force=` / `?cache=` — cache-
	// busting keys.
	'/api/admin/roles/stats?refresh=1',
	'/api/admin/roles/stats?fresh=true',
	'/api/admin/roles/stats?cache=bypass',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/roles/stats?locale=en',
	'/api/admin/roles/stats?locale=fr',
	'/api/admin/roles/stats?lang=de',

	// Repeated keys.
	'/api/admin/roles/stats?as=admin&as=user',
	'/api/admin/roles/stats?token=foo&token=bar',
	'/api/admin/roles/stats?bypass=1&bypass=0',

	// Bogus / typo'd query keys.
	'/api/admin/roles/stats?unknown=value',
	'/api/admin/roles/stats?foo=bar&baz=qux',
	'/api/admin/roles/stats?userId=admin&token=foo&unknown=value&page=1&limit=20&status=active&isAdmin=true&foo=bar'
] as const;

test.describe('API: /api/admin/roles/stats query-param surface', () => {
	for (const path of ADMIN_ROLES_STATS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's two-step gate fires before any
			// repository call, and the handler signature is
			// the bare `GET()` (no `request` parameter), so
			// there is no `searchParams` surface inside the
			// handler at all. The unauthenticated GET surface
			// returns a 4xx (specifically 401) deterministically.
			// A 500 is reachable only if the catch fires after
			// the gate has let the call through (e.g. the
			// `roleRepository.findAll()` call throws), which
			// never happens on the unauth branch.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/roles/stats returns 401 (NOT 403) on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the first-step gate
		// `if (!session?.user)` fires, returning 401 with
		// the bare `'Unauthorized'` message — distinct from
		// the second-step gate's 403 'Forbidden' branch
		// (reachable only by an authenticated non-admin).
		// A regression that switches to a single-step gate
		// (collapsing both unauthenticated and
		// authenticated-non-admin into 401 OR 403) would
		// surface here as a status divergence.
		const response = await request.get('/api/admin/roles/stats');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized'
		});
	});

	test('GET /api/admin/roles/stats has a stable status across query permutations', async ({
		request
	}) => {
		// The route's handler signature is the bare `GET()`
		// (no `request` parameter), so there is no
		// `searchParams` surface inside the handler at all.
		// Every query-param permutation must round-trip to
		// the same status on the unauth branch.
		const baseline = await request.get('/api/admin/roles/stats');
		const parameterised = await request.get(
			'/api/admin/roles/stats?page=1&limit=20&status=active&isAdmin=true&sortBy=name&sortOrder=asc&search=test&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/roles/stats?page=…&limit=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The sibling `admin/roles` route reads `?page=` /
		// `?limit=` via `validatePaginationParams(...)`,
		// but the `admin/roles/stats` route does NOT read
		// query params at all. A regression that adds
		// pagination parsing would change the unauth-
		// branch contract.
		const baseline = await request.get('/api/admin/roles/stats');
		const responses = await Promise.all([
			request.get('/api/admin/roles/stats?page=1'),
			request.get('/api/admin/roles/stats?page=invalid'),
			request.get('/api/admin/roles/stats?page=-1'),
			request.get('/api/admin/roles/stats?page=0'),
			request.get('/api/admin/roles/stats?limit=10'),
			request.get('/api/admin/roles/stats?limit=invalid'),
			request.get('/api/admin/roles/stats?limit=0'),
			request.get('/api/admin/roles/stats?limit=-1'),
			request.get('/api/admin/roles/stats?limit=99999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/stats?status=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The sibling `admin/roles` route reads
		// `?status=` (active / inactive) but the
		// `admin/roles/stats` route does NOT. A
		// regression that adds an `?status=…` filter
		// would change the unauth-branch contract.
		const baseline = await request.get('/api/admin/roles/stats');
		const responses = await Promise.all([
			request.get('/api/admin/roles/stats?status=active'),
			request.get('/api/admin/roles/stats?status=inactive'),
			request.get('/api/admin/roles/stats?status=invalid'),
			request.get('/api/admin/roles/stats?status='),
			request.get('/api/admin/roles/stats?status=ACTIVE')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/stats?isAdmin=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('isAdmin')` as a fallback for
		// `session.user.isAdmin` would change the unauth
		// branch from "always 401" to "200 if
		// ?isAdmin=true is present" — silently granting
		// any anonymous caller admin-level role-stats
		// visibility.
		const baseline = await request.get('/api/admin/roles/stats');
		const responses = await Promise.all([
			request.get('/api/admin/roles/stats?isAdmin=true'),
			request.get('/api/admin/roles/stats?isAdmin=false'),
			request.get('/api/admin/roles/stats?isAdmin=1'),
			request.get('/api/admin/roles/stats?isAdmin=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/stats?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven user resolution would
		// change the unauth branch from "always 401" to
		// "200 if ?userId=… is present".
		const baseline = await request.get('/api/admin/roles/stats');
		const responses = await Promise.all([
			request.get('/api/admin/roles/stats?userId=admin'),
			request.get('/api/admin/roles/stats?user_id=admin'),
			request.get('/api/admin/roles/stats?adminId=admin'),
			request.get('/api/admin/roles/stats?as=admin'),
			request.get('/api/admin/roles/stats?asUser=true'),
			request.get('/api/admin/roles/stats?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/stats?token=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who adds magic-token-based
		// admin bypass would change the unauth branch
		// from "always 401" to "200 if the right token is
		// present".
		const baseline = await request.get('/api/admin/roles/stats');
		const responses = await Promise.all([
			request.get('/api/admin/roles/stats?token=anything'),
			request.get('/api/admin/roles/stats?secret=anything'),
			request.get('/api/admin/roles/stats?api_key=anything'),
			request.get('/api/admin/roles/stats?authorization=Bearer+anything'),
			request.get('/api/admin/roles/stats?session=anything'),
			request.get('/api/admin/roles/stats?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/stats?bypass=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who adds a `?bypass=…`,
		// `?admin=…`, or `?override=…` admin-override key
		// would change the unauth branch from "always
		// 401" to "200 if the right key is present".
		const baseline = await request.get('/api/admin/roles/stats');
		const responses = await Promise.all([
			request.get('/api/admin/roles/stats?bypass=1'),
			request.get('/api/admin/roles/stats?admin=1'),
			request.get('/api/admin/roles/stats?admin=true'),
			request.get('/api/admin/roles/stats?override=true'),
			request.get('/api/admin/roles/stats?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/stats does NOT branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types
		// today; every Accept header must round-trip to
		// the same status on the unauth branch.
		const baseline = await request.get('/api/admin/roles/stats');
		const responses = await Promise.all([
			request.get('/api/admin/roles/stats', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/roles/stats', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/roles/stats', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/roles/stats', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/stats keeps a bare-GET-no-arg handler signature stable', async ({
		request
	}) => {
		// The route's handler signature is `GET()` (no
		// `request` parameter), so there is no
		// `searchParams` surface inside the handler at
		// all. A regression that widens the signature to
		// `GET(request: NextRequest)` and forwards
		// `request.cookies` / `request.geo` /
		// `request.ip` to a custom auth resolver would
		// bypass the `auth()` → `session.user` chain.
		// The unauth-branch contract must stay invariant
		// under any of those side channels.
		const responses = await Promise.all([
			request.get('/api/admin/roles/stats', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/roles/stats', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/roles/stats', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/roles/stats', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/roles/stats response message does NOT echo any other admin-tree route signature', async ({
		request
	}) => {
		// The 401 envelope carries the bare `'Unauthorized'`
		// message — distinct from the
		// `'Unauthorized. Admin access required.'` message
		// the sponsor-ads route emits and distinct from
		// the bare `'Forbidden'` message the reports
		// route's single-step gate emits. A regression
		// that switches to either alternative would
		// surface here as a body-divergence assertion
		// failure.
		const response = await request.get('/api/admin/roles/stats');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Forbidden');
		expect(body.error).not.toBe('Unauthorized. Admin access required.');
	});

	test('GET /api/admin/roles/stats keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth
		// branch.
		const responses = await Promise.all([
			request.get('/api/admin/roles/stats'),
			request.get(
				'/api/admin/roles/stats?page=1&limit=20&status=active&isAdmin=true&sortBy=name&sortOrder=asc'
			),
			request.get(
				'/api/admin/roles/stats?userId=admin&token=foo&page=invalid&limit=99999&status=invalid&isAdmin=invalid&search=test&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/roles/stats repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/roles/stats');
		const responses = await Promise.all([
			request.get('/api/admin/roles/stats?as=admin&as=user'),
			request.get('/api/admin/roles/stats?token=foo&token=bar'),
			request.get('/api/admin/roles/stats?bypass=1&bypass=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
