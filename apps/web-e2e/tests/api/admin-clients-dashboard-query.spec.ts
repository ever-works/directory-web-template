import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only clients-dashboard endpoint served by
 * `apps/web/app/api/admin/clients/dashboard/route.ts`.
 *
 * `GET /api/admin/clients/dashboard` is the **first**
 * admin-tree route the smoke layer covers that documents
 * the **`checkAdminAuth()` three-step guard** (from
 * `@/lib/auth/admin-guard.ts`) — distinct from every
 * other admin-tree route's inline gate posture. The
 * helper folds three branches into one helper call:
 *
 *     export async function checkAdminAuth(): Promise<NextResponse | null> {
 *       const session = await auth();
 *       if (!session?.user) {
 *         return NextResponse.json(
 *           { success: false, error: 'Unauthorized' },
 *           { status: 401 }
 *         );
 *       }
 *       if (!session.user.id) {
 *         return NextResponse.json(
 *           { success: false, error: 'User ID not found' },
 *           { status: 401 }
 *         );
 *       }
 *       const userIsAdmin = await isAdmin(session.user.id);
 *       if (!userIsAdmin) {
 *         return NextResponse.json(
 *           { success: false, error: 'Insufficient permissions' },
 *           { status: 403 }
 *         );
 *       }
 *       return null;
 *     }
 *
 * The helper emits THREE distinct envelopes depending
 * on which branch fires:
 *
 *   - **No session at all**: 401
 *     `{ success: false, error: 'Unauthorized' }`. This
 *     is the contract every assertion below pins,
 *     because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Session exists but user.id missing** (rare
 *     edge case, e.g. NextAuth session-cookie tampering
 *     that produces a malformed user object): 401
 *     `{ success: false, error: 'User ID not found' }`.
 *     Out of scope for this spec.
 *   - **Authenticated user, not admin** (the user
 *     exists in the database but does NOT have the
 *     admin role per the `isAdmin(userId)` query): 403
 *     `{ success: false, error: 'Insufficient permissions' }`.
 *     Out of scope for this spec.
 *
 * The guard's three-step posture is **distinct** from
 * the inline gate every other admin-tree route the
 * smoke layer covers uses:
 *
 *   - `admin/notifications` → two-step inline gate
 *     (`session?.user?.id` then `session.user.isAdmin`)
 *     emitting bare `'Unauthorized'` / `'Forbidden'`.
 *   - `admin/reports` → single-step inline gate
 *     (`!session?.user?.isAdmin`) emitting bare
 *     `'Forbidden'`.
 *   - `admin/categories` / `admin/comments` /
 *     `admin/companies` / `admin/users` → single-step
 *     inline gate (`!session?.user?.isAdmin`) emitting
 *     `'Unauthorized. Admin access required.'`.
 *   - `admin/featured-items` → session-only gate
 *     (`!session?.user?.id`) emitting bare
 *     `'Unauthorized'`.
 *   - `admin/clients/dashboard` → THREE-step guard via
 *     `checkAdminAuth()` emitting three distinct
 *     envelopes.
 *
 * The handler:
 *
 *     export async function GET(request: NextRequest) {
 *       try {
 *         const authError = await checkAdminAuth();
 *         if (authError) {
 *           return authError;
 *         }
 *         const { searchParams } = new URL(request.url);
 *         // …per-param parsing for page / limit / search /
 *         //   status / plan / accountType / provider /
 *         //   createdAfter / createdBefore / updatedAfter /
 *         //   updatedBefore…
 *         const data = await getAdminDashboardData({...});
 *         return NextResponse.json(data);
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Failed to fetch dashboard data' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The route reads ELEVEN documented post-gate query
 * params (`page`, `limit`, `search`, `status`, `plan`,
 * `accountType`, `provider`, `createdAfter`,
 * `createdBefore`, `updatedAfter`, `updatedBefore`) —
 * the largest documented post-gate query surface of
 * any admin-tree route the smoke layer covers,
 * exceeding the reports route's six query params and
 * the items / featured-items routes' three. The four
 * date-bound parameters (`createdAfter`,
 * `createdBefore`, `updatedAfter`, `updatedBefore`)
 * use a per-bound `parseDateBound(value, bound)`
 * helper that supports both YYYY-MM-DD and ISO 8601
 * formats, converting the YYYY-MM-DD form to a
 * UTC-anchored Date with `00:00:00.000` for `start`
 * bounds and `23:59:59.999` for `end` bounds. Out of
 * scope for the unauth-branch contract this spec
 * pins.
 *
 * The shape mirrors the sibling admin-gated query-
 * smoke specs (`admin-categories-query.spec.ts`,
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
 * `admin-tags-query.spec.ts`,
 * `admin-tags-all-query.spec.ts`,
 * `admin-users-query.spec.ts` smoke specs).
 */
const ADMIN_CLIENTS_DASHBOARD_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/clients/dashboard',

	// `?page=` / `?limit=` — pagination params validated
	// via `Number.isFinite()` + `Math.floor()` +
	// `Math.min(Math.max(1, ...), 100)` clamps after the
	// gate.
	'/api/admin/clients/dashboard?page=1',
	'/api/admin/clients/dashboard?page=2',
	'/api/admin/clients/dashboard?limit=10',
	'/api/admin/clients/dashboard?limit=50',
	'/api/admin/clients/dashboard?limit=100',
	'/api/admin/clients/dashboard?page=invalid',
	'/api/admin/clients/dashboard?limit=invalid',
	'/api/admin/clients/dashboard?page=-1',
	'/api/admin/clients/dashboard?page=0',
	'/api/admin/clients/dashboard?limit=999',

	// `?search=` — free-text filter.
	'/api/admin/clients/dashboard?search=john',
	'/api/admin/clients/dashboard?search=john%40example.com',
	'/api/admin/clients/dashboard?search=',
	"/api/admin/clients/dashboard?search=%27%20OR%201%3D1",
	'/api/admin/clients/dashboard?search=%3Cscript%3E',
	`/api/admin/clients/dashboard?search=${'x'.repeat(500)}`,

	// `?status=` — status filter (active / inactive /
	// suspended / trial).
	'/api/admin/clients/dashboard?status=active',
	'/api/admin/clients/dashboard?status=inactive',
	'/api/admin/clients/dashboard?status=suspended',
	'/api/admin/clients/dashboard?status=trial',
	'/api/admin/clients/dashboard?status=invalid',
	'/api/admin/clients/dashboard?status=',

	// `?plan=` — plan filter.
	'/api/admin/clients/dashboard?plan=basic',
	'/api/admin/clients/dashboard?plan=pro',
	'/api/admin/clients/dashboard?plan=enterprise',
	'/api/admin/clients/dashboard?plan=invalid',

	// `?accountType=` / `?provider=` — additional
	// filter keys.
	'/api/admin/clients/dashboard?accountType=user',
	'/api/admin/clients/dashboard?accountType=organization',
	'/api/admin/clients/dashboard?provider=google',
	'/api/admin/clients/dashboard?provider=github',
	'/api/admin/clients/dashboard?provider=credentials',

	// `?createdAfter=` / `?createdBefore=` — date-bound
	// filters in YYYY-MM-DD form (the per-bound
	// `parseDateBound` helper converts them to UTC-
	// anchored Dates with 00:00:00.000 / 23:59:59.999).
	'/api/admin/clients/dashboard?createdAfter=2024-01-01',
	'/api/admin/clients/dashboard?createdBefore=2026-12-31',
	'/api/admin/clients/dashboard?createdAfter=2024-01-01&createdBefore=2024-12-31',

	// `?createdAfter=` / `?createdBefore=` — date-bound
	// filters in ISO 8601 form.
	'/api/admin/clients/dashboard?createdAfter=2024-01-01T00:00:00Z',
	'/api/admin/clients/dashboard?createdBefore=2026-12-31T23:59:59Z',

	// `?createdAfter=` / `?createdBefore=` — invalid
	// date strings (fall through to undefined via
	// `Number.isNaN(d.getTime())` check).
	'/api/admin/clients/dashboard?createdAfter=invalid-date',
	'/api/admin/clients/dashboard?createdBefore=not-a-date',

	// `?updatedAfter=` / `?updatedBefore=` — second
	// date-bound pair.
	'/api/admin/clients/dashboard?updatedAfter=2024-01-01',
	'/api/admin/clients/dashboard?updatedBefore=2026-12-31',

	// Combinations of the documented filters.
	'/api/admin/clients/dashboard?page=1&limit=20&status=active&plan=pro&search=john',

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys.
	'/api/admin/clients/dashboard?userId=anything',
	'/api/admin/clients/dashboard?user_id=anything',
	'/api/admin/clients/dashboard?adminId=anything',
	'/api/admin/clients/dashboard?as=admin',
	'/api/admin/clients/dashboard?asUser=true',
	'/api/admin/clients/dashboard?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/clients/dashboard?token=anything',
	'/api/admin/clients/dashboard?secret=anything',
	'/api/admin/clients/dashboard?api_key=anything',
	'/api/admin/clients/dashboard?authorization=Bearer+anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/clients/dashboard?bypass=1',
	'/api/admin/clients/dashboard?admin=1',
	'/api/admin/clients/dashboard?override=true',
	'/api/admin/clients/dashboard?force=true',

	// `?clientId=` / `?targetId=` / `?id=` — per-row
	// targeting keys for a future contributor.
	'/api/admin/clients/dashboard?clientId=user_123',
	'/api/admin/clients/dashboard?targetId=user_123',
	'/api/admin/clients/dashboard?id=user_123',

	// Repeated keys.
	'/api/admin/clients/dashboard?status=active&status=inactive',
	'/api/admin/clients/dashboard?plan=basic&plan=pro',

	// Bogus / typo'd query keys.
	'/api/admin/clients/dashboard?unknown=value',
	'/api/admin/clients/dashboard?foo=bar&baz=qux',
	'/api/admin/clients/dashboard?userId=admin&token=foo&unknown=value&page=1&limit=20&status=active&foo=bar'
] as const;

test.describe('API: /api/admin/clients/dashboard query-param surface', () => {
	for (const path of ADMIN_CLIENTS_DASHBOARD_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's `checkAdminAuth()` three-step guard
			// fires before any `searchParams` parsing or
			// repository call. The unauthenticated GET surface
			// returns a 4xx (specifically 401)
			// deterministically.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/clients/dashboard returns a 401 with the canonical { success, error } envelope on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the FIRST step of
		// `checkAdminAuth()` (`!session?.user`) returns
		// 401 with the canonical
		// `{ success: false, error: 'Unauthorized' }`
		// envelope. A regression that reorders the
		// three steps would surface here as a status /
		// envelope divergence.
		const response = await request.get('/api/admin/clients/dashboard');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized'
		});
	});

	test('GET /api/admin/clients/dashboard has a stable status across query permutations', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/dashboard');
		const parameterised = await request.get(
			'/api/admin/clients/dashboard?page=1&limit=20&status=active&plan=pro&search=john&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/clients/dashboard?page=…&limit=… does NOT bypass the admin guard', async ({
		request
	}) => {
		// The pagination params are clamped via
		// `Math.min(Math.max(1, Math.floor(...)), 100)`
		// after the gate. A regression that runs the
		// clamping before the gate would not change the
		// unauth-branch contract today (the inline clamps
		// never throw), but a regression that switches to
		// a strict validator would change it.
		const baseline = await request.get('/api/admin/clients/dashboard');
		const responses = await Promise.all([
			request.get('/api/admin/clients/dashboard?page=1'),
			request.get('/api/admin/clients/dashboard?page=invalid'),
			request.get('/api/admin/clients/dashboard?page=-1'),
			request.get('/api/admin/clients/dashboard?page=0'),
			request.get('/api/admin/clients/dashboard?limit=10'),
			request.get('/api/admin/clients/dashboard?limit=999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/dashboard?status=… does NOT bypass the admin guard', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/dashboard');
		const responses = await Promise.all([
			request.get('/api/admin/clients/dashboard?status=active'),
			request.get('/api/admin/clients/dashboard?status=inactive'),
			request.get('/api/admin/clients/dashboard?status=suspended'),
			request.get('/api/admin/clients/dashboard?status=trial'),
			request.get('/api/admin/clients/dashboard?status=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/dashboard?createdAfter=… does NOT bypass the admin guard', async ({
		request
	}) => {
		// The `createdAfter` / `createdBefore` /
		// `updatedAfter` / `updatedBefore` params are
		// parsed via the `parseDateBound(value, bound)`
		// helper after the gate. The unauth branch's
		// status must be invariant to the date payload.
		const baseline = await request.get('/api/admin/clients/dashboard');
		const responses = await Promise.all([
			request.get('/api/admin/clients/dashboard?createdAfter=2024-01-01'),
			request.get('/api/admin/clients/dashboard?createdBefore=2026-12-31'),
			request.get('/api/admin/clients/dashboard?createdAfter=2024-01-01T00:00:00Z'),
			request.get('/api/admin/clients/dashboard?createdAfter=invalid-date'),
			request.get('/api/admin/clients/dashboard?updatedAfter=2024-01-01'),
			request.get('/api/admin/clients/dashboard?updatedBefore=2026-12-31')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/dashboard?userId=… does NOT bypass the admin guard', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()` would change the unauth branch from
		// "always 401" to "200 if ?userId=… is present".
		const baseline = await request.get('/api/admin/clients/dashboard');
		const responses = await Promise.all([
			request.get('/api/admin/clients/dashboard?userId=admin'),
			request.get('/api/admin/clients/dashboard?user_id=admin'),
			request.get('/api/admin/clients/dashboard?adminId=admin'),
			request.get('/api/admin/clients/dashboard?as=admin'),
			request.get('/api/admin/clients/dashboard?asUser=true'),
			request.get('/api/admin/clients/dashboard?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/dashboard?token=… does NOT bypass the admin guard', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/dashboard');
		const responses = await Promise.all([
			request.get('/api/admin/clients/dashboard?token=anything'),
			request.get('/api/admin/clients/dashboard?secret=anything'),
			request.get('/api/admin/clients/dashboard?api_key=anything'),
			request.get('/api/admin/clients/dashboard?authorization=Bearer+anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/dashboard?bypass=… does NOT bypass the admin guard', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/dashboard');
		const responses = await Promise.all([
			request.get('/api/admin/clients/dashboard?bypass=1'),
			request.get('/api/admin/clients/dashboard?admin=1'),
			request.get('/api/admin/clients/dashboard?override=true'),
			request.get('/api/admin/clients/dashboard?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/dashboard?clientId=… does NOT introduce a per-row-targeting bypass', async ({
		request
	}) => {
		// The route does not target a single client today.
		// A future contributor who adds `?clientId=…` /
		// `?targetId=…` / `?id=…` per-row targeting must
		// not bypass the admin guard.
		const baseline = await request.get('/api/admin/clients/dashboard');
		const responses = await Promise.all([
			request.get('/api/admin/clients/dashboard?clientId=user_123'),
			request.get('/api/admin/clients/dashboard?targetId=user_123'),
			request.get('/api/admin/clients/dashboard?id=user_123')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/dashboard?search=… does NOT introduce a SQL-injection bypass', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/dashboard');
		const responses = await Promise.all([
			request.get("/api/admin/clients/dashboard?search=%27%20OR%201%3D1"),
			request.get('/api/admin/clients/dashboard?search=%3Cscript%3E'),
			request.get('/api/admin/clients/dashboard?search=%25'),
			request.get(`/api/admin/clients/dashboard?search=${'x'.repeat(500)}`),
			request.get(`/api/admin/clients/dashboard?search=${'x'.repeat(1000)}`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/dashboard does NOT branch on Accept header', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/dashboard');
		const responses = await Promise.all([
			request.get('/api/admin/clients/dashboard', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/clients/dashboard', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/clients/dashboard', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/dashboard repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/dashboard');
		const responses = await Promise.all([
			request.get('/api/admin/clients/dashboard?status=active&status=inactive'),
			request.get('/api/admin/clients/dashboard?plan=basic&plan=pro')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/dashboard keeps the response stable under cookie / IP side channels', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get('/api/admin/clients/dashboard', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/clients/dashboard', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/clients/dashboard', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/clients/dashboard', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/clients/dashboard response message does NOT echo the second-step or third-step messages', async ({
		request
	}) => {
		// The `checkAdminAuth()` helper emits THREE
		// distinct envelopes — `'Unauthorized'` (401),
		// `'User ID not found'` (401), and `'Insufficient permissions'`
		// (403). The unauth branch must hit the FIRST
		// envelope only. A regression that reorders the
		// guard's checks would surface here as a body-
		// divergence assertion failure.
		const response = await request.get('/api/admin/clients/dashboard');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('User ID not found');
		expect(body.error).not.toBe('Insufficient permissions');
		expect(body.error).not.toBe('Forbidden');
	});
});
