import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only report-statistics endpoint served by
 * `apps/web/app/api/admin/reports/stats/route.ts`.
 *
 * `GET /api/admin/reports/stats` is **admin-gated** via
 * `auth()` + the `session.user.isAdmin` bit, with the
 * **403-on-missing-session contract** mirroring the
 * sibling `/api/admin/reports` route — distinct from
 * every other admin-tree query-smoke spec EXCEPT
 * `admin-reports-query.spec.ts`. The route's gate is:
 *
 *     export async function GET() {
 *       try {
 *         const dbCheck = checkDatabaseAvailability();
 *         if (dbCheck) return dbCheck;
 *         const session = await auth();
 *         if (!session?.user?.isAdmin) {
 *           return NextResponse.json(
 *             { success: false, error: 'Forbidden' },
 *             { status: 403 }
 *           );
 *         }
 *         const stats = await getReportStats();
 *         return NextResponse.json({ success: true, data: stats });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Internal Server Error' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * Because the gate uses `!session?.user?.isAdmin`
 * (optional-chain + negation) rather than a two-step
 * `session?.user?.id` then `session.user.isAdmin` pair,
 * a missing session resolves the optional-chain to
 * `undefined`, the negation flips to `true`, and the
 * gate returns 403 `'Forbidden'` — NOT 401
 * `'Unauthorized'`. This single-step gate folds the
 * "missing session" and "missing admin bit" branches
 * into a single 403 response, mirroring the sibling
 * `/api/admin/reports` route's contract documented in
 * [`admin-reports-query.spec.ts`](./admin-reports-query.spec.ts).
 *
 * The route's **unique posture** vs the sibling
 * `admin-reports-query.spec.ts`:
 *
 *   1. The handler signature is the **bare `GET()`**
 *      (no `request` parameter) — distinct from the
 *      sibling `/api/admin/reports` route's
 *      `GET(request: Request)` signature (which reads
 *      six query params: `page`, `limit`, `search`,
 *      `status`, `contentType`, `reason`). The
 *      `admin/reports/stats` route has **zero** post-
 *      gate query surface — there is no way for a
 *      future contributor to silently leak a query-
 *      param-driven bypass without also widening the
 *      handler signature.
 *   2. The route uses the **same `runtime = 'nodejs'`**
 *      explicit export as the sibling
 *      `/api/admin/reports` route — distinct from the
 *      `admin/roles/stats` route's implicit Edge
 *      runtime.
 *   3. The route reuses the **`checkDatabaseAvailability()`**
 *      pre-auth DB check from `@/lib/utils/database-check`
 *      — distinct from the `admin/roles/stats` route's
 *      no-pre-auth-DB-check posture and identical to
 *      the sibling `/api/admin/reports` route's posture.
 *      A DB-unavailable invocation returns a Response
 *      from `checkDatabaseAvailability()` directly,
 *      bypassing both the auth gate and the
 *      `getReportStats()` repository call.
 *   4. The repository call is **`getReportStats()`**
 *      (a no-arg query) — distinct from the sibling
 *      `/api/admin/reports` route's
 *      `getReports({ page, limit, search, status, contentType, reason })`
 *      call. The unauth branch never reaches either
 *      call because the auth gate fires first.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **DB unavailable**: `checkDatabaseAvailability()`
 *     returns a Response object; the route returns it
 *     directly. Out of scope for this spec because the
 *     test harness has DB available by default.
 *   - **Unauthenticated** (no session): the optional-
 *     chain `session?.user?.isAdmin` resolves to
 *     `undefined`, the negation returns 403 with
 *     `{ success: false, error: 'Forbidden' }`. This is
 *     the contract every assertion below pins, because
 *     the e2e runner does not carry an authenticated
 *     session by default.
 *   - **Authenticated user, missing `isAdmin`**: same
 *     403 'Forbidden' branch. The single-step gate
 *     folds the two branches into one.
 *   - **Authenticated admin user**: the gate passes;
 *     the route returns 200 with
 *     `{ success: true, data: { total, pendingCount, resolvedCount, byStatus, byContentType, byReason } }`.
 *     Out of scope.
 *   - **Internal error**: the catch returns 500 with
 *     `{ success: false, error: 'Internal Server Error' }`.
 *     Out of scope.
 *
 * The spec is unique among the admin-tree query-smoke
 * specs in that it pins **the `/admin/reports` family's
 * 403 'Forbidden' single-step gate** combined with
 * **the bare `GET()` handler signature** — a
 * combination no other admin-tree route documents. The
 * `admin-reports-query.spec.ts` documents the 403
 * gate with a `GET(request: Request)` signature; the
 * `admin-roles-stats-query.spec.ts` documents the bare
 * `GET()` signature with a two-step 401/403 gate; this
 * spec documents the intersection — the **single-step
 * 403 gate with no request parameter at all**.
 *
 * The shape mirrors the sibling admin-gated
 * query-smoke specs (`admin-categories-query.spec.ts`,
 * `admin-categories-all-query.spec.ts`,
 * `admin-categories-git-query.spec.ts`,
 * `admin-clients-query.spec.ts`,
 * `admin-clients-advanced-search-query.spec.ts`,
 * `admin-clients-dashboard-query.spec.ts`,
 * `admin-clients-stats-query.spec.ts`,
 * `admin-collections-query.spec.ts`,
 * `admin-comments-query.spec.ts`,
 * `admin-companies-query.spec.ts`,
 * `admin-dashboard-stats-query.spec.ts`,
 * `admin-featured-items-query.spec.ts`,
 * `admin-geo-analytics-query.spec.ts`,
 * `admin-items-export-sample-query.spec.ts`,
 * `admin-items-query.spec.ts`,
 * `admin-items-stats-query.spec.ts`,
 * `admin-location-index-query.spec.ts`,
 * `admin-navigation-query.spec.ts`,
 * `admin-notifications-query.spec.ts`,
 * `admin-reports-query.spec.ts`,
 * `admin-roles-stats-query.spec.ts`,
 * `admin-settings-query.spec.ts`,
 * `admin-sponsor-ads-query.spec.ts`,
 * `admin-tags-query.spec.ts`,
 * `admin-tags-all-query.spec.ts`,
 * `admin-users-query.spec.ts`,
 * `admin-users-stats-query.spec.ts`).
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of that.
 */
const ADMIN_REPORTS_STATS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/reports/stats',

	// `?page=` / `?limit=` — pagination params the
	// sibling `/api/admin/reports` route reads via
	// `Math.max(1, Number(searchParams.get('page')) || 1)` /
	// `Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10))`.
	// The `admin/reports/stats` route does NOT read query
	// params at all; a regression that adds pagination
	// parsing would change the unauth-branch contract.
	'/api/admin/reports/stats?page=1',
	'/api/admin/reports/stats?page=2',
	'/api/admin/reports/stats?page=999',
	'/api/admin/reports/stats?page=-1',
	'/api/admin/reports/stats?page=0',
	'/api/admin/reports/stats?page=invalid',
	'/api/admin/reports/stats?page=1.5',
	'/api/admin/reports/stats?limit=10',
	'/api/admin/reports/stats?limit=50',
	'/api/admin/reports/stats?limit=100',
	'/api/admin/reports/stats?limit=999',
	'/api/admin/reports/stats?limit=0',
	'/api/admin/reports/stats?limit=-1',
	'/api/admin/reports/stats?limit=invalid',
	'/api/admin/reports/stats?page=1&limit=20',

	// `?status=` — the four-value enum the sibling
	// `/api/admin/reports` route accepts (`pending` /
	// `reviewed` / `resolved` / `dismissed`). The
	// `admin/reports/stats` route does NOT read this
	// query key today; a regression that adds an
	// `?status=…` filter to scope the stats to a
	// specific status would change the unauth-branch
	// contract.
	'/api/admin/reports/stats?status=pending',
	'/api/admin/reports/stats?status=reviewed',
	'/api/admin/reports/stats?status=resolved',
	'/api/admin/reports/stats?status=dismissed',
	'/api/admin/reports/stats?status=invalid',
	'/api/admin/reports/stats?status=',

	// `?contentType=` — the two-value enum the sibling
	// `/api/admin/reports` route accepts (`item` /
	// `comment`). The `admin/reports/stats` route
	// already returns a `byContentType` aggregate; a
	// regression that adds an `?contentType=…` filter
	// to scope the aggregate would change the unauth-
	// branch contract.
	'/api/admin/reports/stats?contentType=item',
	'/api/admin/reports/stats?contentType=comment',
	'/api/admin/reports/stats?contentType=invalid',
	'/api/admin/reports/stats?contentType=',

	// `?reason=` — the multi-value enum the sibling
	// `/api/admin/reports` route accepts. The
	// `admin/reports/stats` route already returns a
	// `byReason` aggregate; a regression that adds a
	// `?reason=…` filter would change the unauth-branch
	// contract.
	'/api/admin/reports/stats?reason=spam',
	'/api/admin/reports/stats?reason=harassment',
	'/api/admin/reports/stats?reason=inappropriate',
	'/api/admin/reports/stats?reason=other',
	'/api/admin/reports/stats?reason=invalid',
	'/api/admin/reports/stats?reason=',

	// `?search=` — the free-text filter the sibling
	// `/api/admin/reports` route accepts (search by
	// content ID, details, or reporter name/email).
	// The `admin/reports/stats` route does NOT.
	'/api/admin/reports/stats?search=spam',
	'/api/admin/reports/stats?search=',
	'/api/admin/reports/stats?search=%20',
	'/api/admin/reports/stats?search=%27%20OR%201%3D1',
	'/api/admin/reports/stats?search=%3Cscript%3E',
	'/api/admin/reports/stats?search=' + encodeURIComponent('a'.repeat(500)),

	// `?from=` / `?to=` / `?since=` / `?until=` —
	// time-range filter keys for a future contributor
	// who wants to scope the stats to a date window.
	'/api/admin/reports/stats?from=2024-01-01',
	'/api/admin/reports/stats?to=2026-12-31',
	'/api/admin/reports/stats?since=2024-01-01T00:00:00Z',
	'/api/admin/reports/stats?until=2026-12-31T23:59:59Z',
	'/api/admin/reports/stats?from=invalid-date',
	'/api/admin/reports/stats?from=2024-01-01&to=2024-12-31',

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys.
	'/api/admin/reports/stats?userId=anything',
	'/api/admin/reports/stats?user_id=anything',
	'/api/admin/reports/stats?adminId=anything',
	'/api/admin/reports/stats?as=admin',
	'/api/admin/reports/stats?asUser=true',
	'/api/admin/reports/stats?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/reports/stats?token=anything',
	'/api/admin/reports/stats?secret=anything',
	'/api/admin/reports/stats?api_key=anything',
	'/api/admin/reports/stats?authorization=Bearer+anything',
	'/api/admin/reports/stats?session=anything',
	'/api/admin/reports/stats?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/reports/stats?bypass=1',
	'/api/admin/reports/stats?admin=1',
	'/api/admin/reports/stats?admin=true',
	'/api/admin/reports/stats?override=true',
	'/api/admin/reports/stats?force=true',

	// `?reportId=` / `?contentId=` — per-row-targeting
	// keys for a future contributor who wants per-
	// report stats.
	'/api/admin/reports/stats?reportId=42',
	'/api/admin/reports/stats?contentId=anything',

	// `?refresh=` / `?force=` / `?cache=` — cache-
	// busting keys.
	'/api/admin/reports/stats?refresh=1',
	'/api/admin/reports/stats?fresh=true',
	'/api/admin/reports/stats?cache=bypass',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/reports/stats?locale=en',
	'/api/admin/reports/stats?locale=fr',
	'/api/admin/reports/stats?lang=de',

	// `?tenant=` / `?tenantId=` — multi-tenancy keys.
	'/api/admin/reports/stats?tenant=acme',
	'/api/admin/reports/stats?tenantId=42',

	// Repeated keys.
	'/api/admin/reports/stats?status=pending&status=resolved',
	'/api/admin/reports/stats?contentType=item&contentType=comment',
	'/api/admin/reports/stats?reason=spam&reason=harassment',
	'/api/admin/reports/stats?as=admin&as=user',
	'/api/admin/reports/stats?token=foo&token=bar',
	'/api/admin/reports/stats?bypass=1&bypass=0',

	// Bogus / typo'd query keys.
	'/api/admin/reports/stats?unknown=value',
	'/api/admin/reports/stats?foo=bar&baz=qux',
	'/api/admin/reports/stats?status=pending&contentType=item&reason=spam&search=test&page=1&limit=20&token=foo&unknown=value'
] as const;

test.describe('API: /api/admin/reports/stats query-param surface', () => {
	for (const path of ADMIN_REPORTS_STATS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's single-step gate fires before any
			// repository call (and the handler signature is
			// the bare `GET()` — no `request` parameter,
			// so there is no `searchParams` surface inside
			// the handler at all). The unauthenticated GET
			// surface returns a 4xx (specifically 403)
			// deterministically. A 500 is reachable only if
			// the catch fires after the gate has let the
			// call through (e.g. the `getReportStats()`
			// call throws), which never happens on the
			// unauth branch.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/reports/stats returns 403 (NOT 401) on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the gate
		// `if (!session?.user?.isAdmin)` fires, returning
		// 403 with `{ success: false, error: 'Forbidden' }`.
		// Distinct from every other admin-tree route's
		// 401 'Unauthorized' branch EXCEPT the sibling
		// `/api/admin/reports` route which uses the same
		// 403 'Forbidden' single-step gate. A regression
		// that switches to a two-step
		// `session?.user?.id` then `session.user.isAdmin`
		// pair (which would emit 401 'Unauthorized' for
		// missing session and 403 'Forbidden' for non-
		// admin) would surface here as a status
		// divergence between the expected 403 and the
		// unexpected 401.
		const response = await request.get('/api/admin/reports/stats');

		expect(response.status()).toBe(403);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Forbidden'
		});
	});

	test('GET /api/admin/reports/stats 403 envelope matches the canonical { success, error } shape', async ({
		request
	}) => {
		// The 403 envelope carries the canonical
		// `{ success: false, error: 'Forbidden' }` shape
		// — distinct from the
		// `admin/clients/advanced-search` route's bare
		// `{ error: '...' }` envelope and the
		// `admin/categories/git` route's bare
		// `{ error: 'Unauthorized. Admin access required.' }`
		// shape. A regression that switches to either
		// alternative would surface here as a positive-
		// shape assertion failure.
		const response = await request.get('/api/admin/reports/stats');
		const body = await response.json();

		expect(body).toHaveProperty('success', false);
		expect(body).toHaveProperty('error', 'Forbidden');
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test('GET /api/admin/reports/stats has a stable status across query permutations', async ({
		request
	}) => {
		// The route's handler signature is the bare `GET()`
		// (no `request` parameter), so there is no
		// `searchParams` surface inside the handler at all.
		// Every query-param permutation must round-trip to
		// the same status on the unauth branch.
		const baseline = await request.get('/api/admin/reports/stats');
		const parameterised = await request.get(
			'/api/admin/reports/stats?page=1&limit=20&status=pending&contentType=item&reason=spam&search=test&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/reports/stats?page=… & ?limit=… do NOT bypass the admin gate', async ({
		request
	}) => {
		// The sibling `/api/admin/reports` route reads
		// `?page=` / `?limit=` via
		// `Math.max(1, Number(...) || 1)` /
		// `Math.min(100, Math.max(1, Number(...) || 10))`,
		// but the `admin/reports/stats` route does NOT
		// read query params at all. A regression that
		// adds pagination parsing would change the
		// unauth-branch contract.
		const baseline = await request.get('/api/admin/reports/stats');
		const responses = await Promise.all([
			request.get('/api/admin/reports/stats?page=1'),
			request.get('/api/admin/reports/stats?page=invalid'),
			request.get('/api/admin/reports/stats?page=-1'),
			request.get('/api/admin/reports/stats?page=0'),
			request.get('/api/admin/reports/stats?page=1.5'),
			request.get('/api/admin/reports/stats?limit=10'),
			request.get('/api/admin/reports/stats?limit=invalid'),
			request.get('/api/admin/reports/stats?limit=0'),
			request.get('/api/admin/reports/stats?limit=-1'),
			request.get('/api/admin/reports/stats?limit=999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports/stats?status=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The sibling `/api/admin/reports` route reads
		// `?status=` and validates against the four-
		// value enum (`pending` / `reviewed` /
		// `resolved` / `dismissed`). The
		// `admin/reports/stats` route does NOT read this
		// key — but a regression that adds an
		// `?status=…` filter to scope the stats would
		// change the unauth-branch contract.
		const baseline = await request.get('/api/admin/reports/stats');
		const responses = await Promise.all([
			request.get('/api/admin/reports/stats?status=pending'),
			request.get('/api/admin/reports/stats?status=reviewed'),
			request.get('/api/admin/reports/stats?status=resolved'),
			request.get('/api/admin/reports/stats?status=dismissed'),
			request.get('/api/admin/reports/stats?status=invalid'),
			request.get('/api/admin/reports/stats?status=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports/stats?contentType=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The sibling `/api/admin/reports` route reads
		// `?contentType=` and validates against the
		// two-value enum (`item` / `comment`). The
		// `admin/reports/stats` route already returns a
		// `byContentType` aggregate; a regression that
		// adds an `?contentType=…` filter to scope the
		// aggregate would change the unauth-branch
		// contract.
		const baseline = await request.get('/api/admin/reports/stats');
		const responses = await Promise.all([
			request.get('/api/admin/reports/stats?contentType=item'),
			request.get('/api/admin/reports/stats?contentType=comment'),
			request.get('/api/admin/reports/stats?contentType=invalid'),
			request.get('/api/admin/reports/stats?contentType=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports/stats?reason=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The sibling `/api/admin/reports` route reads
		// `?reason=` and validates against the multi-
		// value enum the schema's `ReportReason` exports.
		// The `admin/reports/stats` route already returns
		// a `byReason` aggregate; a regression that adds
		// a `?reason=…` filter to scope the aggregate
		// would change the unauth-branch contract.
		const baseline = await request.get('/api/admin/reports/stats');
		const responses = await Promise.all([
			request.get('/api/admin/reports/stats?reason=spam'),
			request.get('/api/admin/reports/stats?reason=harassment'),
			request.get('/api/admin/reports/stats?reason=inappropriate'),
			request.get('/api/admin/reports/stats?reason=other'),
			request.get('/api/admin/reports/stats?reason=invalid'),
			request.get('/api/admin/reports/stats?reason=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports/stats?search=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `search` key feeds the sibling
		// `/api/admin/reports` route's general search-
		// term filter. The unauth branch must be
		// invariant to SQL-injection-shaped payloads,
		// long payloads, and special-character payloads
		// — every payload below MUST hit the gate before
		// reaching the (non-existent) `searchParams` read.
		const baseline = await request.get('/api/admin/reports/stats');
		const responses = await Promise.all([
			request.get('/api/admin/reports/stats?search=spam'),
			request.get('/api/admin/reports/stats?search='),
			request.get('/api/admin/reports/stats?search=%27%20OR%201%3D1'),
			request.get(
				'/api/admin/reports/stats?search=' + encodeURIComponent('a'.repeat(500))
			)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports/stats?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback
		// for `auth()`'s session-driven user resolution
		// would change the unauth branch from "always
		// 403" to "200 if ?userId=… is present". The
		// bare `GET()` signature is the strongest
		// possible defence here: a contributor must
		// first widen the handler signature to
		// `GET(request: NextRequest)` before they can
		// even read a query param.
		const baseline = await request.get('/api/admin/reports/stats');
		const responses = await Promise.all([
			request.get('/api/admin/reports/stats?userId=admin'),
			request.get('/api/admin/reports/stats?user_id=admin'),
			request.get('/api/admin/reports/stats?adminId=admin'),
			request.get('/api/admin/reports/stats?as=admin'),
			request.get('/api/admin/reports/stats?asUser=true'),
			request.get('/api/admin/reports/stats?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports/stats?token=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/reports/stats');
		const responses = await Promise.all([
			request.get('/api/admin/reports/stats?token=anything'),
			request.get('/api/admin/reports/stats?secret=anything'),
			request.get('/api/admin/reports/stats?api_key=anything'),
			request.get('/api/admin/reports/stats?authorization=Bearer+anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports/stats?bypass=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/reports/stats');
		const responses = await Promise.all([
			request.get('/api/admin/reports/stats?bypass=1'),
			request.get('/api/admin/reports/stats?admin=1'),
			request.get('/api/admin/reports/stats?override=true'),
			request.get('/api/admin/reports/stats?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports/stats?from=… & friends do NOT bypass the admin gate', async ({
		request
	}) => {
		// Time-range filter keys for a future contributor
		// who wants to scope the stats to a date window.
		// The unauth branch must be invariant to malformed-
		// date payloads.
		const baseline = await request.get('/api/admin/reports/stats');
		const responses = await Promise.all([
			request.get('/api/admin/reports/stats?from=2024-01-01'),
			request.get('/api/admin/reports/stats?to=2026-12-31'),
			request.get('/api/admin/reports/stats?since=2024-01-01T00:00:00Z'),
			request.get('/api/admin/reports/stats?until=2026-12-31T23:59:59Z'),
			request.get('/api/admin/reports/stats?from=invalid-date'),
			request.get('/api/admin/reports/stats?from=2024-01-01&to=2024-12-31')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports/stats does NOT branch on Accept header', async ({ request }) => {
		const baseline = await request.get('/api/admin/reports/stats');
		const responses = await Promise.all([
			request.get('/api/admin/reports/stats', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/admin/reports/stats', {
				headers: { Accept: 'text/csv' }
			}),
			request.get('/api/admin/reports/stats', {
				headers: { Accept: 'application/xml' }
			}),
			request.get('/api/admin/reports/stats', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports/stats repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/reports/stats');
		const responses = await Promise.all([
			request.get('/api/admin/reports/stats?status=pending&status=resolved'),
			request.get('/api/admin/reports/stats?contentType=item&contentType=comment'),
			request.get('/api/admin/reports/stats?reason=spam&reason=harassment'),
			request.get('/api/admin/reports/stats?as=admin&as=user'),
			request.get('/api/admin/reports/stats?token=foo&token=bar'),
			request.get('/api/admin/reports/stats?bypass=1&bypass=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports/stats keeps a bare-GET-no-arg handler signature stable under cookie / IP side channels', async ({
		request
	}) => {
		// The route's handler signature is `GET()` (no
		// `request` parameter), so there is no
		// `searchParams` surface inside the handler at
		// all. A regression that widens the signature to
		// `GET(request: NextRequest)` and forwards
		// `request.cookies` / `request.geo` /
		// `request.ip` to a custom auth resolver would
		// bypass the `auth()` → `session.user.isAdmin`
		// chain. The unauth-branch contract must stay
		// invariant under any of those side channels.
		const responses = await Promise.all([
			request.get('/api/admin/reports/stats', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/reports/stats', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/reports/stats', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/reports/stats', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/reports/stats response message is the bare "Forbidden" (NOT "Unauthorized", NOT role-context-specific suffix)', async ({
		request
	}) => {
		// The 403 envelope carries the bare
		// `'Forbidden'` message — distinct from the
		// 401 `'Unauthorized'` message every admin-tree
		// route EXCEPT `/api/admin/reports` emits, and
		// distinct from the
		// `'Unauthorized. Admin access required.'`
		// message the categories-git / items-import /
		// items-import-validate routes emit. A
		// regression that switches to either alternative
		// would surface here as a body-divergence
		// assertion failure.
		const response = await request.get('/api/admin/reports/stats');
		const body = await response.json();

		expect(body.error).toBe('Forbidden');
		expect(body.error).not.toBe('Unauthorized');
		expect(body.error).not.toBe('Unauthorized. Admin access required.');
	});

	test('GET /api/admin/reports/stats keeps the response status stable across param permutations', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get('/api/admin/reports/stats'),
			request.get(
				'/api/admin/reports/stats?page=1&limit=20&status=pending&contentType=item&reason=spam'
			),
			request.get(
				'/api/admin/reports/stats?userId=admin&token=foo&page=invalid&limit=99999&status=invalid&contentType=invalid&reason=invalid&search=test&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});
});
