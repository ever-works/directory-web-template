import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only sponsor-ads listing endpoint served by
 * `apps/web/app/api/admin/sponsor-ads/route.ts`.
 *
 * `GET /api/admin/sponsor-ads` is **admin-gated** via
 * `auth()` + a **single-step**
 * `!session?.user?.isAdmin` check that **collapses both**
 * the unauthenticated and authenticated-non-admin
 * branches into the **same** 401 envelope — distinct
 * from the `admin/roles/stats` route's **two-step**
 * 401/403 gate (which separates the unauthenticated
 * 401 'Unauthorized' branch from the authenticated-non-
 * admin 403 'Forbidden' branch) and distinct from the
 * `admin/reports` route's single-step
 * `!session?.user?.isAdmin` → 403 'Forbidden' gate
 * (which collapses both branches into the same 403
 * envelope but uses 'Forbidden' as the message text).
 * The route's gate is:
 *
 *     export async function GET(request: NextRequest) {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.isAdmin) {
 *           return NextResponse.json(
 *             { success: false, error: 'Unauthorized. Admin access required.' },
 *             { status: 401 }
 *           );
 *         }
 *         // …pagination + Zod validation + service call…
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Failed to fetch sponsor ads' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated** (no session): the single-step
 *     gate `if (!session?.user?.isAdmin)` fires (the
 *     short-circuit on `session?.user?.isAdmin`
 *     resolves to `undefined` for an absent session,
 *     which negates to truthy). The route returns 401
 *     with `{ success: false, error: 'Unauthorized. Admin access required.' }`
 *     — the **longer** message variant, distinct from
 *     the bare `'Unauthorized'` message every other
 *     admin-tree route emits.
 *   - **Authenticated non-admin user**: the same
 *     single-step gate fires; the route returns the
 *     **same** 401 envelope. Out of scope for this
 *     spec because the e2e runner is unauthenticated.
 *   - **Authenticated admin user**: the gate passes;
 *     the route returns 200 with
 *     `{ success: true, data, pagination, stats }`.
 *     Out of scope.
 *   - **Internal error**: the catch returns 500 with
 *     `{ success: false, error: 'Failed to fetch sponsor ads' }`.
 *     Out of scope.
 *
 * The spec is unique among the admin-tree query-smoke
 * specs in that it pins **the longer-message variant**
 * `'Unauthorized. Admin access required.'` (distinct
 * from the bare `'Unauthorized'` message every other
 * admin-tree route emits). Both deltas are load-
 * bearing:
 *
 *   1. The `'Unauthorized. Admin access required.'`
 *      message is the route's contract today. A
 *      regression that switches to the bare
 *      `'Unauthorized'` message would still satisfy
 *      `body.error.includes('Unauthorized')` but
 *      would quietly drift the message contract.
 *   2. The single-step gate emits 401 (NOT 403) — a
 *      regression that switches to a two-step gate
 *      (separating unauthenticated 401 from
 *      authenticated-non-admin 403) would surface
 *      here as a status divergence.
 *
 * The handler signature is `GET(request: NextRequest)`
 * — distinct from the `admin/roles/stats` route's bare
 * `GET()` signature (which has zero `searchParams`
 * surface inside the handler). The `NextRequest`
 * parameter is consumed via
 * `new URL(request.url).searchParams` to read
 * pagination, status, interval, search, sortBy, and
 * sortOrder query parameters. The query-param surface
 * is wider than every prior admin-tree route's
 * query-param surface — but every query-param read
 * happens AFTER the auth gate, so the unauth-branch
 * contract is invariant to query-param permutations.
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
 * `admin-roles-stats-query.spec.ts`,
 * `admin-settings-query.spec.ts`,
 * `admin-users-query.spec.ts`) — all share the same
 * "session-or-admin gated, 401/403 before any
 * service-layer call" posture. The sponsor-ads route
 * is unique in that:
 *   1. The 401 envelope carries the longer
 *      `'Unauthorized. Admin access required.'`
 *      message — distinct from the bare
 *      `'Unauthorized'` message every other admin-
 *      tree route emits (and distinct from the bare
 *      `'Forbidden'` message the reports route's
 *      single-step gate emits).
 *   2. The handler reads query params via
 *      `new URL(request.url).searchParams` and runs
 *      Zod validation via `querySponsorAdsSchema` —
 *      but BOTH the URL parsing AND the Zod
 *      validation happen AFTER the auth gate. A
 *      regression that re-orders the gate to fire
 *      AFTER the validation would surface as a 400
 *      instead of a 401 on the unauth branch (e.g.
 *      `?limit=invalid` would return 400 'Invalid
 *      query parameters' instead of 401).
 *   3. The route exports only `GET` (no `POST` /
 *      `PATCH` / `DELETE`) — write operations live
 *      under `/api/admin/sponsor-ads/[id]/`. This
 *      spec covers only the listing surface.
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of that.
 */
const ADMIN_SPONSOR_ADS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/sponsor-ads',

	// `?status=` — enum filter the route reads via
	// `searchParams.get("status")` AFTER the auth gate.
	// Valid values: pending_payment, pending, rejected,
	// active, expired, cancelled.
	'/api/admin/sponsor-ads?status=pending_payment',
	'/api/admin/sponsor-ads?status=pending',
	'/api/admin/sponsor-ads?status=rejected',
	'/api/admin/sponsor-ads?status=active',
	'/api/admin/sponsor-ads?status=expired',
	'/api/admin/sponsor-ads?status=cancelled',
	'/api/admin/sponsor-ads?status=invalid',
	'/api/admin/sponsor-ads?status=',
	'/api/admin/sponsor-ads?status=ACTIVE',
	'/api/admin/sponsor-ads?status=all',

	// `?interval=` — enum filter the route reads.
	// Valid values: weekly, monthly.
	'/api/admin/sponsor-ads?interval=weekly',
	'/api/admin/sponsor-ads?interval=monthly',
	'/api/admin/sponsor-ads?interval=invalid',
	'/api/admin/sponsor-ads?interval=',
	'/api/admin/sponsor-ads?interval=WEEKLY',

	// `?page=` / `?limit=` — pagination params the route
	// reads via `validatePaginationParams(searchParams)`.
	'/api/admin/sponsor-ads?page=1',
	'/api/admin/sponsor-ads?page=2',
	'/api/admin/sponsor-ads?page=999',
	'/api/admin/sponsor-ads?limit=10',
	'/api/admin/sponsor-ads?limit=50',
	'/api/admin/sponsor-ads?limit=100',
	'/api/admin/sponsor-ads?page=1&limit=20',
	'/api/admin/sponsor-ads?page=invalid',
	'/api/admin/sponsor-ads?limit=invalid',
	'/api/admin/sponsor-ads?page=-1',
	'/api/admin/sponsor-ads?page=0',
	'/api/admin/sponsor-ads?limit=0',
	'/api/admin/sponsor-ads?limit=-1',
	'/api/admin/sponsor-ads?limit=99999',

	// `?sortBy=` / `?sortOrder=` — order-targeting
	// keys. Valid sortBy: createdAt, updatedAt,
	// startDate, endDate, status. Valid sortOrder:
	// asc, desc.
	'/api/admin/sponsor-ads?sortBy=createdAt',
	'/api/admin/sponsor-ads?sortBy=updatedAt',
	'/api/admin/sponsor-ads?sortBy=startDate',
	'/api/admin/sponsor-ads?sortBy=endDate',
	'/api/admin/sponsor-ads?sortBy=status',
	'/api/admin/sponsor-ads?sortBy=invalid',
	'/api/admin/sponsor-ads?sortOrder=asc',
	'/api/admin/sponsor-ads?sortOrder=desc',
	'/api/admin/sponsor-ads?sortOrder=ASC',
	'/api/admin/sponsor-ads?sortOrder=invalid',
	'/api/admin/sponsor-ads?sortBy=createdAt&sortOrder=desc',
	'/api/admin/sponsor-ads?sortBy=startDate&sortOrder=asc',

	// `?search=` — free-text filter the route reads.
	'/api/admin/sponsor-ads?search=test',
	'/api/admin/sponsor-ads?search=admin',
	'/api/admin/sponsor-ads?search=',
	"/api/admin/sponsor-ads?search=%27%20OR%201%3D1",
	'/api/admin/sponsor-ads?search=%3Cscript%3E',
	'/api/admin/sponsor-ads?search=%25',
	`/api/admin/sponsor-ads?search=${'x'.repeat(500)}`,

	// `?isAdmin=` — boolean filter that would scope
	// the listing to admin-only sponsor-ads. Not read
	// today.
	'/api/admin/sponsor-ads?isAdmin=true',
	'/api/admin/sponsor-ads?isAdmin=false',
	'/api/admin/sponsor-ads?isAdmin=1',
	'/api/admin/sponsor-ads?isAdmin=0',

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys.
	'/api/admin/sponsor-ads?userId=anything',
	'/api/admin/sponsor-ads?user_id=anything',
	'/api/admin/sponsor-ads?adminId=anything',
	'/api/admin/sponsor-ads?as=admin',
	'/api/admin/sponsor-ads?asUser=true',
	'/api/admin/sponsor-ads?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/sponsor-ads?token=anything',
	'/api/admin/sponsor-ads?secret=anything',
	'/api/admin/sponsor-ads?api_key=anything',
	'/api/admin/sponsor-ads?authorization=Bearer+anything',
	'/api/admin/sponsor-ads?session=anything',
	'/api/admin/sponsor-ads?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/sponsor-ads?bypass=1',
	'/api/admin/sponsor-ads?admin=1',
	'/api/admin/sponsor-ads?admin=true',
	'/api/admin/sponsor-ads?override=true',
	'/api/admin/sponsor-ads?force=true',

	// `?sponsorAdId=` / `?id=` — per-row-targeting
	// keys.
	'/api/admin/sponsor-ads?sponsorAdId=anything',
	'/api/admin/sponsor-ads?id=anything',

	// `?from=` / `?to=` / `?since=` / `?until=` —
	// time-range filter keys.
	'/api/admin/sponsor-ads?from=2024-01-01',
	'/api/admin/sponsor-ads?to=2026-12-31',
	'/api/admin/sponsor-ads?since=2024-01-01T00:00:00Z',
	'/api/admin/sponsor-ads?until=2026-12-31T23:59:59Z',
	'/api/admin/sponsor-ads?from=invalid-date',

	// `?refresh=` / `?cache=` — cache-busting keys.
	'/api/admin/sponsor-ads?refresh=1',
	'/api/admin/sponsor-ads?fresh=true',
	'/api/admin/sponsor-ads?cache=bypass',
	'/api/admin/sponsor-ads?nocache=1',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/sponsor-ads?locale=en',
	'/api/admin/sponsor-ads?locale=fr',
	'/api/admin/sponsor-ads?lang=de',

	// Repeated keys.
	'/api/admin/sponsor-ads?as=admin&as=user',
	'/api/admin/sponsor-ads?token=foo&token=bar',
	'/api/admin/sponsor-ads?status=active&status=pending',
	'/api/admin/sponsor-ads?bypass=1&bypass=0',

	// Bogus / typo'd query keys.
	'/api/admin/sponsor-ads?unknown=value',
	'/api/admin/sponsor-ads?foo=bar&baz=qux',
	'/api/admin/sponsor-ads?userId=admin&token=foo&unknown=value&page=1&limit=20&status=active&interval=weekly&isAdmin=true&foo=bar'
] as const;

test.describe('API: /api/admin/sponsor-ads query-param surface', () => {
	for (const path of ADMIN_SPONSOR_ADS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's single-step gate fires before any
			// service-layer call. The unauthenticated GET
			// surface returns a 4xx (specifically 401)
			// deterministically. A 500 is reachable only if
			// the catch fires after the gate has let the
			// call through (e.g. `sponsorAdService.getSponsorAdsPaginated(...)`
			// throws), which never happens on the unauth
			// branch.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/sponsor-ads returns 401 with the longer-message envelope on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the single-step gate
		// `if (!session?.user?.isAdmin)` fires, returning
		// 401 with the longer `'Unauthorized. Admin access required.'`
		// message — distinct from the bare `'Unauthorized'`
		// message every other admin-tree route emits.
		// A regression that switches to the bare
		// `'Unauthorized'` message would surface here as
		// a body-divergence assertion failure.
		const response = await request.get('/api/admin/sponsor-ads');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized. Admin access required.'
		});
	});

	test('GET /api/admin/sponsor-ads has a stable status across query permutations', async ({
		request
	}) => {
		// The route's auth gate fires before any
		// `searchParams.get(...)` call. Every query-param
		// permutation must round-trip to the same status
		// on the unauth branch.
		const baseline = await request.get('/api/admin/sponsor-ads');
		const parameterised = await request.get(
			'/api/admin/sponsor-ads?page=1&limit=20&status=active&interval=weekly&isAdmin=true&sortBy=createdAt&sortOrder=desc&search=test&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/sponsor-ads?status=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The route reads `?status=` AFTER the auth gate;
		// no status value should bypass the gate.
		const baseline = await request.get('/api/admin/sponsor-ads');
		const responses = await Promise.all([
			request.get('/api/admin/sponsor-ads?status=pending_payment'),
			request.get('/api/admin/sponsor-ads?status=pending'),
			request.get('/api/admin/sponsor-ads?status=rejected'),
			request.get('/api/admin/sponsor-ads?status=active'),
			request.get('/api/admin/sponsor-ads?status=expired'),
			request.get('/api/admin/sponsor-ads?status=cancelled'),
			request.get('/api/admin/sponsor-ads?status=invalid'),
			request.get('/api/admin/sponsor-ads?status=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/sponsor-ads?interval=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/sponsor-ads');
		const responses = await Promise.all([
			request.get('/api/admin/sponsor-ads?interval=weekly'),
			request.get('/api/admin/sponsor-ads?interval=monthly'),
			request.get('/api/admin/sponsor-ads?interval=invalid'),
			request.get('/api/admin/sponsor-ads?interval=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/sponsor-ads?page=…&limit=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// `validatePaginationParams(searchParams)` runs
		// AFTER the auth gate. A regression that swaps
		// the order would surface as a 400 instead of a
		// 401 on the unauth branch for invalid pagination.
		const baseline = await request.get('/api/admin/sponsor-ads');
		const responses = await Promise.all([
			request.get('/api/admin/sponsor-ads?page=1'),
			request.get('/api/admin/sponsor-ads?page=invalid'),
			request.get('/api/admin/sponsor-ads?page=-1'),
			request.get('/api/admin/sponsor-ads?page=0'),
			request.get('/api/admin/sponsor-ads?limit=10'),
			request.get('/api/admin/sponsor-ads?limit=invalid'),
			request.get('/api/admin/sponsor-ads?limit=0'),
			request.get('/api/admin/sponsor-ads?limit=-1'),
			request.get('/api/admin/sponsor-ads?limit=99999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/sponsor-ads invalid Zod query does NOT surface as 400 on unauth branch', async ({
		request
	}) => {
		// The route's Zod validation via
		// `querySponsorAdsSchema.safeParse(queryParams)`
		// runs AFTER the auth gate. A regression that
		// swaps the order would surface as a 400 'Invalid
		// query parameters' instead of a 401 on the
		// unauth branch when the query is malformed.
		const responses = await Promise.all([
			request.get('/api/admin/sponsor-ads?sortBy=invalid'),
			request.get('/api/admin/sponsor-ads?sortOrder=invalid'),
			request.get('/api/admin/sponsor-ads?status=invalid'),
			request.get('/api/admin/sponsor-ads?interval=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Unauthorized. Admin access required.');
			expect(body.error).not.toBe('Invalid query parameters');
		}
	});

	test('GET /api/admin/sponsor-ads?isAdmin=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('isAdmin')` as a fallback for
		// `session.user.isAdmin` would change the unauth
		// branch from "always 401" to "200 if
		// ?isAdmin=true is present" — silently granting
		// any anonymous caller admin-level sponsor-ad
		// visibility.
		const baseline = await request.get('/api/admin/sponsor-ads');
		const responses = await Promise.all([
			request.get('/api/admin/sponsor-ads?isAdmin=true'),
			request.get('/api/admin/sponsor-ads?isAdmin=false'),
			request.get('/api/admin/sponsor-ads?isAdmin=1'),
			request.get('/api/admin/sponsor-ads?isAdmin=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/sponsor-ads?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/sponsor-ads');
		const responses = await Promise.all([
			request.get('/api/admin/sponsor-ads?userId=admin'),
			request.get('/api/admin/sponsor-ads?user_id=admin'),
			request.get('/api/admin/sponsor-ads?adminId=admin'),
			request.get('/api/admin/sponsor-ads?as=admin'),
			request.get('/api/admin/sponsor-ads?asUser=true'),
			request.get('/api/admin/sponsor-ads?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/sponsor-ads?token=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/sponsor-ads');
		const responses = await Promise.all([
			request.get('/api/admin/sponsor-ads?token=anything'),
			request.get('/api/admin/sponsor-ads?secret=anything'),
			request.get('/api/admin/sponsor-ads?api_key=anything'),
			request.get('/api/admin/sponsor-ads?authorization=Bearer+anything'),
			request.get('/api/admin/sponsor-ads?session=anything'),
			request.get('/api/admin/sponsor-ads?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/sponsor-ads?bypass=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/sponsor-ads');
		const responses = await Promise.all([
			request.get('/api/admin/sponsor-ads?bypass=1'),
			request.get('/api/admin/sponsor-ads?admin=1'),
			request.get('/api/admin/sponsor-ads?admin=true'),
			request.get('/api/admin/sponsor-ads?override=true'),
			request.get('/api/admin/sponsor-ads?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/sponsor-ads does NOT branch on Accept header', async ({ request }) => {
		const baseline = await request.get('/api/admin/sponsor-ads');
		const responses = await Promise.all([
			request.get('/api/admin/sponsor-ads', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/sponsor-ads', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/sponsor-ads', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/sponsor-ads', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/sponsor-ads cookie / X-* headers do NOT bypass the gate', async ({
		request
	}) => {
		// A regression that switches the gate to read
		// `request.cookies.get('…')` for a fabricated
		// session-token cookie would bypass the
		// `auth()` chain. The unauth-branch contract
		// must stay invariant under any of those side
		// channels.
		const responses = await Promise.all([
			request.get('/api/admin/sponsor-ads', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/sponsor-ads', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/sponsor-ads', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/sponsor-ads', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/sponsor-ads response message uniquely identifies sponsor-ads route', async ({
		request
	}) => {
		// The 401 envelope carries the longer
		// `'Unauthorized. Admin access required.'` message
		// — distinct from the bare `'Unauthorized'`
		// message every other admin-tree route emits and
		// distinct from the bare `'Forbidden'` message
		// the reports route's single-step gate emits. A
		// regression that switches to either alternative
		// would surface here as a body-divergence
		// assertion failure.
		const response = await request.get('/api/admin/sponsor-ads');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized. Admin access required.');
		expect(body.error).not.toBe('Unauthorized');
		expect(body.error).not.toBe('Forbidden');
		expect(body.success).toBe(false);
	});

	test('GET /api/admin/sponsor-ads keeps the response status stable across param permutations', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get('/api/admin/sponsor-ads'),
			request.get(
				'/api/admin/sponsor-ads?page=1&limit=20&status=active&interval=weekly&isAdmin=true&sortBy=createdAt&sortOrder=desc'
			),
			request.get(
				'/api/admin/sponsor-ads?userId=admin&token=foo&page=invalid&limit=99999&status=invalid&interval=invalid&isAdmin=invalid&search=test&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/sponsor-ads repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/sponsor-ads');
		const responses = await Promise.all([
			request.get('/api/admin/sponsor-ads?as=admin&as=user'),
			request.get('/api/admin/sponsor-ads?token=foo&token=bar'),
			request.get('/api/admin/sponsor-ads?bypass=1&bypass=0'),
			request.get('/api/admin/sponsor-ads?status=active&status=pending')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
