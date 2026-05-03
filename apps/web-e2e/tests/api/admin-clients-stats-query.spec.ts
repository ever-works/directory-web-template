import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only enhanced-client-statistics endpoint served
 * by `apps/web/app/api/admin/clients/stats/route.ts`.
 *
 * `GET /api/admin/clients/stats` is **admin-gated** via
 * an **inline two-step `auth()` chain** that resolves
 * the unauthenticated and authenticated-non-admin
 * branches into **distinct** status codes (401 vs 403):
 *
 *     export async function GET() {
 *       try {
 *         const session = await auth();
 *         if (!session) {
 *           return NextResponse.json(
 *             { success: false, error: 'Unauthorized' },
 *             { status: 401 }
 *           );
 *         }
 *         if (!session.user?.isAdmin) {
 *           return NextResponse.json(
 *             { success: false, error: 'Forbidden' },
 *             { status: 403 }
 *           );
 *         }
 *         const stats = await getEnhancedClientStats();
 *         return NextResponse.json({ success: true, data: stats });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Failed to fetch client stats' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The two-step gate's first step is uniquely **`if (!session)`**
 * — checking the **whole session object** rather than
 * the more common `if (!session?.user)` pattern the
 * sibling `admin/roles/stats` route uses. In practice
 * `auth()` returns `null` when no session exists, so
 * the unauthenticated branch's emission is identical
 * (401 + bare `'Unauthorized'`), but the gate's shape
 * is **not** the same:
 *
 *   - **`admin/clients/stats` (this route)**:
 *     `if (!session)` — checks the session-object
 *     handle.
 *   - **`admin/roles/stats`**: `if (!session?.user)` —
 *     checks the user property's presence on the
 *     session.
 *   - **`admin/users/stats`**: routes through the
 *     three-step `checkAdminAuth()` helper.
 *   - **`admin/items/stats`**: single-step
 *     `if (!session?.user?.isAdmin)` — collapses both
 *     unauth and authenticated-non-admin into 401.
 *
 * A regression that flips the first-step gate from
 * `if (!session)` to `if (!session?.user)` would not
 * change the unauth-branch envelope, but would change
 * the contract for the rare "session exists with no
 * user object" edge case (e.g. NextAuth session-cookie
 * tampering producing a malformed session). This spec
 * does NOT exercise that edge case (it's reachable
 * only with a fabricated session cookie that the e2e
 * runner cannot mint), but the assertions below are
 * stable across both gate shapes.
 *
 * The handler signature is the bare `GET()` (no
 * `request` parameter) — symmetric with the
 * `admin/roles/stats` and `admin/users/stats` siblings
 * — narrowing the request surface to zero. There is no
 * way for a future contributor to silently leak a
 * query-param-driven bypass without also widening the
 * handler signature.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated** (no session): the first-step
 *     `if (!session)` gate fires; the route returns
 *     401 with `{ success: false, error: 'Unauthorized' }`.
 *     This is the contract every assertion below pins,
 *     because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Authenticated non-admin user**: the second-step
 *     `if (!session.user?.isAdmin)` gate fires; the
 *     route returns 403 with
 *     `{ success: false, error: 'Forbidden' }`. Out of
 *     scope.
 *   - **Authenticated admin user**: both gates pass; the
 *     route returns 200 with
 *     `{ success: true, data: { overview, growth, distribution, ... } }`
 *     via `getEnhancedClientStats()`. Out of scope.
 *   - **Internal error**: the catch returns 500 with
 *     `{ success: false, error: 'Failed to fetch client stats' }`
 *     — a route-specific message distinct from every
 *     other admin-tree stats route's catch. Out of scope.
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of that.
 */
const ADMIN_CLIENTS_STATS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/clients/stats',

	// `?page=` / `?limit=` — pagination params the
	// sibling `admin/clients` route reads but the
	// `admin/clients/stats` route does not.
	'/api/admin/clients/stats?page=1',
	'/api/admin/clients/stats?page=2',
	'/api/admin/clients/stats?page=999',
	'/api/admin/clients/stats?limit=10',
	'/api/admin/clients/stats?limit=50',
	'/api/admin/clients/stats?limit=100',
	'/api/admin/clients/stats?page=1&limit=20',
	'/api/admin/clients/stats?page=invalid',
	'/api/admin/clients/stats?limit=invalid',
	'/api/admin/clients/stats?page=-1',
	'/api/admin/clients/stats?page=0',
	'/api/admin/clients/stats?limit=0',
	'/api/admin/clients/stats?limit=-1',

	// `?status=` — active / inactive / suspended /
	// trial enum filter (the success response includes
	// `activeClients`, `inactiveClients`,
	// `suspendedClients`, `trialClients` so a future
	// contributor might add `?status=…` for per-status
	// drill-down).
	'/api/admin/clients/stats?status=active',
	'/api/admin/clients/stats?status=inactive',
	'/api/admin/clients/stats?status=suspended',
	'/api/admin/clients/stats?status=trial',
	'/api/admin/clients/stats?status=',
	'/api/admin/clients/stats?status=invalid',
	'/api/admin/clients/stats?status=ACTIVE',

	// `?clientId=` / `?client_id=` — per-client drill-
	// down filter the sibling `admin/clients` route
	// reads via `[clientId]/route.ts` but the
	// `admin/clients/stats` route does NOT.
	'/api/admin/clients/stats?clientId=1',
	'/api/admin/clients/stats?clientId=invalid',
	'/api/admin/clients/stats?client_id=1',

	// `?from=` / `?to=` / `?since=` / `?until=` /
	// `?days=` — time-window filter keys for the
	// `growth` section's `newClientsToday`,
	// `newClientsThisWeek`, `newClientsThisMonth`
	// fields.
	'/api/admin/clients/stats?from=2024-01-01',
	'/api/admin/clients/stats?to=2026-12-31',
	'/api/admin/clients/stats?since=2024-01-01T00:00:00Z',
	'/api/admin/clients/stats?until=2026-12-31T23:59:59Z',
	'/api/admin/clients/stats?from=invalid-date',
	'/api/admin/clients/stats?days=7',
	'/api/admin/clients/stats?days=30',
	'/api/admin/clients/stats?days=90',
	'/api/admin/clients/stats?days=invalid',

	// `?include=` / `?fields=` / `?select=` /
	// `?exclude=` — content-projection keys for the
	// `overview` / `growth` / `distribution` sub-
	// objects.
	'/api/admin/clients/stats?include=overview',
	'/api/admin/clients/stats?include=growth',
	'/api/admin/clients/stats?include=distribution',
	'/api/admin/clients/stats?fields=totalClients',
	'/api/admin/clients/stats?select=activeClients',
	'/api/admin/clients/stats?exclude=trialClients',

	// `?isAdmin=` — boolean filter that would scope
	// the stats to admin-bit clients only (a future
	// contributor might mis-wire this as an admin
	// override).
	'/api/admin/clients/stats?isAdmin=true',
	'/api/admin/clients/stats?isAdmin=false',
	'/api/admin/clients/stats?isAdmin=1',
	'/api/admin/clients/stats?isAdmin=0',

	// `?sortBy=` / `?sortOrder=` — order-targeting
	// keys.
	'/api/admin/clients/stats?sortBy=name',
	'/api/admin/clients/stats?sortBy=createdAt',
	'/api/admin/clients/stats?sortOrder=asc',
	'/api/admin/clients/stats?sortOrder=desc',

	// `?search=` — free-text filter with
	// XSS-shaped / SQL-shaped values.
	'/api/admin/clients/stats?search=test',
	'/api/admin/clients/stats?search=admin',
	'/api/admin/clients/stats?search=',
	"/api/admin/clients/stats?search=%27%20OR%201%3D1",
	'/api/admin/clients/stats?search=%3Cscript%3E',
	'/api/admin/clients/stats?search=%25',
	`/api/admin/clients/stats?search=${'x'.repeat(500)}`,

	// `?userId=` / `?adminId=` / `?as=` —
	// impersonation keys.
	'/api/admin/clients/stats?userId=anything',
	'/api/admin/clients/stats?user_id=anything',
	'/api/admin/clients/stats?adminId=anything',
	'/api/admin/clients/stats?as=admin',
	'/api/admin/clients/stats?asUser=true',
	'/api/admin/clients/stats?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/clients/stats?token=anything',
	'/api/admin/clients/stats?secret=anything',
	'/api/admin/clients/stats?api_key=anything',
	'/api/admin/clients/stats?authorization=Bearer+anything',
	'/api/admin/clients/stats?session=anything',
	'/api/admin/clients/stats?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/clients/stats?bypass=1',
	'/api/admin/clients/stats?admin=1',
	'/api/admin/clients/stats?admin=true',
	'/api/admin/clients/stats?override=true',
	'/api/admin/clients/stats?force=true',

	// `?refresh=` / `?cache=` — cache-busting keys.
	'/api/admin/clients/stats?refresh=1',
	'/api/admin/clients/stats?fresh=true',
	'/api/admin/clients/stats?cache=bypass',
	'/api/admin/clients/stats?nocache=1',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/clients/stats?locale=en',
	'/api/admin/clients/stats?locale=fr',
	'/api/admin/clients/stats?lang=de',

	// Repeated keys.
	'/api/admin/clients/stats?as=admin&as=user',
	'/api/admin/clients/stats?token=foo&token=bar',
	'/api/admin/clients/stats?bypass=1&bypass=0',
	'/api/admin/clients/stats?status=active&status=inactive',
	'/api/admin/clients/stats?days=7&days=30',

	// Bogus / typo'd query keys.
	'/api/admin/clients/stats?unknown=value',
	'/api/admin/clients/stats?foo=bar&baz=qux',
	'/api/admin/clients/stats?userId=admin&token=foo&unknown=value&page=1&limit=20&status=active&isAdmin=true&clientId=1&days=30&include=overview&foo=bar'
] as const;

test.describe('API: /api/admin/clients/stats query-param surface', () => {
	for (const path of ADMIN_CLIENTS_STATS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's two-step gate fires before any
			// `getEnhancedClientStats()` call, and the
			// handler signature is the bare `GET()` (no
			// `request` parameter), so there is no
			// `searchParams` surface inside the handler at
			// all. The unauthenticated GET surface returns
			// a 4xx (specifically 401) deterministically.
			// A 500 is reachable only if the catch fires
			// after the gate has let the call through (e.g.
			// the `getEnhancedClientStats()` call throws),
			// which never happens on the unauth branch.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/clients/stats returns 401 with the bare Unauthorized envelope on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the first-step gate
		// `if (!session)` fires (uniquely this route's
		// gate checks the **whole session object**
		// rather than `?.user`), returning 401 with the
		// bare `'Unauthorized'` message — distinct from
		// the second-step gate's `'Forbidden'` message
		// (reachable only by an authenticated non-admin)
		// and from the catch's
		// `'Failed to fetch client stats'` message (a
		// route-specific catch envelope distinct from
		// every other admin-tree stats route's catch).
		const response = await request.get('/api/admin/clients/stats');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized'
		});
	});

	test('GET /api/admin/clients/stats has a stable status across query permutations', async ({
		request
	}) => {
		// The route's handler signature is the bare `GET()`
		// (no `request` parameter), so there is no
		// `searchParams` surface inside the handler at all.
		// Every query-param permutation must round-trip to
		// the same status on the unauth branch.
		const baseline = await request.get('/api/admin/clients/stats');
		const parameterised = await request.get(
			'/api/admin/clients/stats?page=1&limit=20&status=active&isAdmin=true&clientId=1&sortBy=name&sortOrder=asc&search=test&userId=admin&token=anything&days=30&include=overview&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/clients/stats?page=…&limit=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The sibling `admin/clients` route reads `?page=` /
		// `?limit=` for pagination, but the
		// `admin/clients/stats` route does NOT read query
		// params at all.
		const baseline = await request.get('/api/admin/clients/stats');
		const responses = await Promise.all([
			request.get('/api/admin/clients/stats?page=1'),
			request.get('/api/admin/clients/stats?page=invalid'),
			request.get('/api/admin/clients/stats?page=-1'),
			request.get('/api/admin/clients/stats?page=0'),
			request.get('/api/admin/clients/stats?limit=10'),
			request.get('/api/admin/clients/stats?limit=invalid'),
			request.get('/api/admin/clients/stats?limit=0'),
			request.get('/api/admin/clients/stats?limit=-1'),
			request.get('/api/admin/clients/stats?limit=99999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/stats?status=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The success response includes per-status
		// counts (`activeClients` / `inactiveClients` /
		// `suspendedClients` / `trialClients`). A future
		// contributor who reads `searchParams.get('status')`
		// to scope the stats to a specific status would
		// change the unauth-branch contract.
		const baseline = await request.get('/api/admin/clients/stats');
		const responses = await Promise.all([
			request.get('/api/admin/clients/stats?status=active'),
			request.get('/api/admin/clients/stats?status=inactive'),
			request.get('/api/admin/clients/stats?status=suspended'),
			request.get('/api/admin/clients/stats?status=trial'),
			request.get('/api/admin/clients/stats?status=invalid'),
			request.get('/api/admin/clients/stats?status='),
			request.get('/api/admin/clients/stats?status=ACTIVE')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/stats?clientId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The sibling `admin/clients/[clientId]` route
		// reads `clientId` from the path; a future
		// contributor who reads `searchParams.get('clientId')`
		// to scope the stats to a single client would
		// change the unauth-branch contract.
		const baseline = await request.get('/api/admin/clients/stats');
		const responses = await Promise.all([
			request.get('/api/admin/clients/stats?clientId=1'),
			request.get('/api/admin/clients/stats?clientId=invalid'),
			request.get('/api/admin/clients/stats?client_id=1')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/stats?days=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The success response includes `growth` with
		// `newClientsToday` / `newClientsThisWeek` /
		// `newClientsThisMonth`. A future contributor who
		// reads `searchParams.get('days')` to make the
		// growth window configurable would change the
		// unauth-branch contract.
		const baseline = await request.get('/api/admin/clients/stats');
		const responses = await Promise.all([
			request.get('/api/admin/clients/stats?days=7'),
			request.get('/api/admin/clients/stats?days=30'),
			request.get('/api/admin/clients/stats?days=90'),
			request.get('/api/admin/clients/stats?days=invalid'),
			request.get('/api/admin/clients/stats?from=2024-01-01'),
			request.get('/api/admin/clients/stats?to=2026-12-31'),
			request.get('/api/admin/clients/stats?since=2024-01-01T00:00:00Z'),
			request.get('/api/admin/clients/stats?until=2026-12-31T23:59:59Z'),
			request.get('/api/admin/clients/stats?from=invalid-date')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/stats?include=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The success response is a structured object
		// with `overview` / `growth` / `distribution`
		// sub-objects. A future contributor who reads
		// `searchParams.get('include')` to scope the
		// response to a subset would change the unauth-
		// branch contract.
		const baseline = await request.get('/api/admin/clients/stats');
		const responses = await Promise.all([
			request.get('/api/admin/clients/stats?include=overview'),
			request.get('/api/admin/clients/stats?include=growth'),
			request.get('/api/admin/clients/stats?include=distribution'),
			request.get('/api/admin/clients/stats?fields=totalClients'),
			request.get('/api/admin/clients/stats?select=activeClients'),
			request.get('/api/admin/clients/stats?exclude=trialClients')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/stats?isAdmin=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('isAdmin')` as a fallback for
		// `session.user.isAdmin` would change the unauth
		// branch from "always 401" to "200 if
		// ?isAdmin=true is present" — silently granting
		// any anonymous caller admin-level client-stats
		// visibility.
		const baseline = await request.get('/api/admin/clients/stats');
		const responses = await Promise.all([
			request.get('/api/admin/clients/stats?isAdmin=true'),
			request.get('/api/admin/clients/stats?isAdmin=false'),
			request.get('/api/admin/clients/stats?isAdmin=1'),
			request.get('/api/admin/clients/stats?isAdmin=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/stats?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven user resolution would
		// change the unauth branch from "always 401" to
		// "200 if ?userId=… is present".
		const baseline = await request.get('/api/admin/clients/stats');
		const responses = await Promise.all([
			request.get('/api/admin/clients/stats?userId=admin'),
			request.get('/api/admin/clients/stats?user_id=admin'),
			request.get('/api/admin/clients/stats?adminId=admin'),
			request.get('/api/admin/clients/stats?as=admin'),
			request.get('/api/admin/clients/stats?asUser=true'),
			request.get('/api/admin/clients/stats?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/stats?token=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who adds magic-token-based
		// admin bypass would change the unauth branch
		// from "always 401" to "200 if the right token is
		// present".
		const baseline = await request.get('/api/admin/clients/stats');
		const responses = await Promise.all([
			request.get('/api/admin/clients/stats?token=anything'),
			request.get('/api/admin/clients/stats?secret=anything'),
			request.get('/api/admin/clients/stats?api_key=anything'),
			request.get('/api/admin/clients/stats?authorization=Bearer+anything'),
			request.get('/api/admin/clients/stats?session=anything'),
			request.get('/api/admin/clients/stats?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/stats?bypass=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/stats');
		const responses = await Promise.all([
			request.get('/api/admin/clients/stats?bypass=1'),
			request.get('/api/admin/clients/stats?admin=1'),
			request.get('/api/admin/clients/stats?admin=true'),
			request.get('/api/admin/clients/stats?override=true'),
			request.get('/api/admin/clients/stats?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/stats does NOT branch on Accept header', async ({ request }) => {
		const baseline = await request.get('/api/admin/clients/stats');
		const responses = await Promise.all([
			request.get('/api/admin/clients/stats', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/clients/stats', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/clients/stats', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/clients/stats', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/stats keeps a bare-GET-no-arg handler signature stable', async ({
		request
	}) => {
		// The route's handler signature is `GET()` (no
		// `request` parameter), so there is no
		// `searchParams` surface inside the handler at
		// all. A regression that widens the signature to
		// `GET(request: NextRequest)` and forwards
		// `request.cookies` / `request.geo` /
		// `request.ip` to a custom auth resolver would
		// bypass the `auth()` → `session` chain.
		const responses = await Promise.all([
			request.get('/api/admin/clients/stats', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/clients/stats', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/clients/stats', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/clients/stats', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/clients/stats response message does NOT echo any other admin-tree route signature', async ({
		request
	}) => {
		// The 401 envelope carries the bare `'Unauthorized'`
		// message — distinct from
		// `'Forbidden'` (the second-step gate's 403
		// message), `'Failed to fetch client stats'` (the
		// catch-block's route-specific message),
		// `'User ID not found'` (the
		// `checkAdminAuth()`-routed siblings' second-step
		// message), `'Insufficient permissions'` (the
		// `checkAdminAuth()`-routed siblings' third-step
		// message), and
		// `'Unauthorized. Admin access required.'` (the
		// sponsor-ads route's purpose-built guard).
		const response = await request.get('/api/admin/clients/stats');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Forbidden');
		expect(body.error).not.toBe('Failed to fetch client stats');
		expect(body.error).not.toBe('User ID not found');
		expect(body.error).not.toBe('Insufficient permissions');
		expect(body.error).not.toBe('Unauthorized. Admin access required.');
	});

	test('GET /api/admin/clients/stats keeps the response status stable across param permutations', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get('/api/admin/clients/stats'),
			request.get(
				'/api/admin/clients/stats?page=1&limit=20&status=active&isAdmin=true&clientId=1&sortBy=name&sortOrder=asc'
			),
			request.get(
				'/api/admin/clients/stats?userId=admin&token=foo&page=invalid&limit=99999&status=invalid&isAdmin=invalid&search=test&days=invalid&include=invalid&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/clients/stats repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/stats');
		const responses = await Promise.all([
			request.get('/api/admin/clients/stats?as=admin&as=user'),
			request.get('/api/admin/clients/stats?token=foo&token=bar'),
			request.get('/api/admin/clients/stats?bypass=1&bypass=0'),
			request.get('/api/admin/clients/stats?status=active&status=inactive'),
			request.get('/api/admin/clients/stats?days=7&days=30')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
