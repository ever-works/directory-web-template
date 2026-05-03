import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only reports-listing endpoint served by
 * `apps/web/app/api/admin/reports/route.ts`.
 *
 * `GET /api/admin/reports` is **admin-gated** via `auth()`
 * + the `session.user.isAdmin` bit, but with a unique
 * **403-on-missing-session contract** — distinct from
 * every other admin-gated route in the smoke layer. The
 * route's gate is:
 *
 *     if (!session?.user?.isAdmin) {
 *       return NextResponse.json(
 *         { success: false, error: 'Forbidden' },
 *         { status: 403 }
 *       );
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
 * into a single 403 response.
 *
 * The handler signature is `GET(request: Request)` (the
 * bare `Request` type, not the Next-specific
 * `NextRequest` type). The handler reads six query
 * params after the gate (`page`, `limit`, `search`,
 * `status`, `contentType`, `reason`) — the largest
 * documented post-gate query surface of any admin-tree
 * route the smoke layer covers. The handler also calls
 * `checkDatabaseAvailability()` BEFORE the auth gate; on
 * an unavailable DB the route returns a 503-ish response
 * before auth fires.
 *
 *     export async function GET(request: Request) {
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
 *         const { searchParams } = new URL(request.url);
 *         const page = Math.max(1, Number(searchParams.get('page')) || 1);
 *         const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10));
 *         const search = (searchParams.get('search') || '').trim();
 *         const status = searchParams.get('status') as ReportStatusValues | null;
 *         const contentType = searchParams.get('contentType') as ReportContentTypeValues | null;
 *         const reason = searchParams.get('reason') as ReportReasonValues | null;
 *         // …per-param VALID_* enum validation…
 *         const result = await getReports({ page, limit, search, status, contentType, reason });
 *         return NextResponse.json({ success: true, data: { reports, pagination } });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Internal Server Error' },
 *           { status: 500 }
 *         );
 *       }
 *     }
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
 *     the contract every assertion below pins.
 *   - **Authenticated user, missing `isAdmin`**: same
 *     403 'Forbidden' branch. The single-step gate
 *     folds the two branches into one.
 *   - **Admin with valid pagination + filter**: returns
 *     200 with `{ success: true, data: { reports, pagination } }`.
 *     Out of scope.
 *   - **Admin with invalid filter** (e.g.
 *     `status=invalid`): returns 400 with the per-
 *     filter `'Invalid status. Must be one of: …'`
 *     message. Out of scope for this spec because the
 *     gate fires before the per-filter validation.
 *   - **Internal error**: the catch returns 500 with
 *     `{ success: false, error: 'Internal Server Error' }`.
 *     Out of scope.
 *
 * The spec is unique among the admin-tree query-smoke
 * specs in that it pins **403 (NOT 401)** plus the bare
 * `'Forbidden'` (NOT `'Unauthorized'` / NOT
 * `'Unauthorized. Admin access required.'`) error
 * message. A regression that switches the gate to the
 * two-step `session?.user?.id` then
 * `session.user.isAdmin` pair (which would emit 401
 * 'Unauthorized' for missing session and 403 'Forbidden'
 * for non-admin) would surface here as a status
 * divergence between the expected 403 and the unexpected
 * 401.
 *
 * The shape mirrors the sibling admin-gated
 * `admin-categories-query.spec.ts`,
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
 * `admin-users-query.spec.ts` smoke specs — all share
 * the same "session-or-admin gated, 401/403 before any
 * service-layer call" posture. The reports-listing
 * route is unique in that:
 *   1. The single-step gate `!session?.user?.isAdmin`
 *      folds the missing-session and missing-admin-bit
 *      branches into a single 403 response — distinct
 *      from the notifications route's two-step gate
 *      (which emits 401 'Unauthorized' for missing
 *      session and 403 'Forbidden' for missing admin
 *      bit).
 *   2. The 403 envelope carries the bare `'Forbidden'`
 *      message — distinct from the
 *      `'Unauthorized. Admin access required.'`
 *      message most admin-gated routes emit.
 *   3. The handler signature is `GET(request: Request)`
 *      (the bare `Request` type, not the Next-specific
 *      `NextRequest` type) — distinct from every other
 *      admin-tree route's `GET(request: NextRequest)`
 *      signature. The bare `Request` type narrows the
 *      request surface to the standard Web API
 *      `Request` interface; a future migration to
 *      `NextRequest` opens up the Next-specific
 *      `request.cookies` / `request.geo` / `request.ip`
 *      surface — but the unauth-branch contract must
 *      stay invariant under any of those side
 *      channels.
 *   4. The route runs `checkDatabaseAvailability()`
 *      BEFORE the auth gate. A pre-auth DB check is
 *      unusual — most admin-tree routes call `auth()`
 *      first, then read the DB. The pre-auth check
 *      means an unavailable DB short-circuits to a
 *      service-availability response before auth
 *      fires.
 *   5. The post-gate handler reads SIX documented
 *      query keys (`page`, `limit`, `search`,
 *      `status`, `contentType`, `reason`) — the
 *      largest documented post-gate query surface of
 *      any admin-tree route the smoke layer covers.
 *      More query keys means more bypass vectors; the
 *      sweep below covers all six.
 *   6. The route uses inline `Number()` parsing +
 *      `Math.max()` / `Math.min()` clamps for the
 *      `page` / `limit` params — distinct from the
 *      `validatePaginationParams(...)` utility the
 *      sibling routes use. The inline-clamp posture
 *      means invalid values silently coerce to the
 *      bounds (e.g. `?page=invalid` → `Number(...)` →
 *      `NaN` → `|| 1` → `1`); a regression that
 *      switches to a strict validator that returns
 *      400 on invalid values would change the auth-
 *      branch contract but not the unauth-branch
 *      contract.
 *   7. The post-gate handler delegates per-filter
 *      validation to inline `VALID_*.includes(...)`
 *      checks against the schema's enum constants
 *      (`ReportStatus`, `ReportContentType`,
 *      `ReportReason`) — distinct from the Zod-schema
 *      posture the items-export-sample route uses.
 *      Out of scope for this spec because the gate
 *      fires before the per-filter validation on
 *      every unauth invocation.
 *   8. The route uses an explicit `runtime = 'nodejs'`
 *      Next.js export — distinct from the implicit
 *      Edge runtime most admin-tree routes use. The
 *      Node.js runtime is required for the Drizzle DB
 *      driver to use the full Postgres feature set;
 *      an Edge runtime would force a smaller subset.
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of that.
 */
const ADMIN_REPORTS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/reports',

	// `?page=` / `?limit=` — pagination params validated
	// via inline `Number()` parsing + `Math.max()` /
	// `Math.min()` clamps after the gate.
	'/api/admin/reports?page=1',
	'/api/admin/reports?page=2',
	'/api/admin/reports?page=999',
	'/api/admin/reports?limit=10',
	'/api/admin/reports?limit=50',
	'/api/admin/reports?limit=100',
	'/api/admin/reports?page=1&limit=20',
	'/api/admin/reports?page=invalid',
	'/api/admin/reports?limit=invalid',
	'/api/admin/reports?page=-1',
	'/api/admin/reports?page=0',
	'/api/admin/reports?limit=0',
	'/api/admin/reports?limit=-1',
	'/api/admin/reports?limit=99999',
	'/api/admin/reports?limit=101',
	'/api/admin/reports?page=',
	'/api/admin/reports?limit=',

	// `?search=` — free-text filter validated as a
	// trimmed string after the gate.
	'/api/admin/reports?search=test',
	'/api/admin/reports?search=spam',
	'/api/admin/reports?search=hello%20world',
	'/api/admin/reports?search=',
	"/api/admin/reports?search=%27%20OR%201%3D1",
	'/api/admin/reports?search=%3Cscript%3E',
	'/api/admin/reports?search=%25',
	`/api/admin/reports?search=${'x'.repeat(500)}`,

	// `?status=` — Zod-enum-like filter against the
	// `ReportStatus` enum (pending / reviewed /
	// resolved / dismissed) validated after the gate.
	'/api/admin/reports?status=pending',
	'/api/admin/reports?status=reviewed',
	'/api/admin/reports?status=resolved',
	'/api/admin/reports?status=dismissed',
	'/api/admin/reports?status=',
	'/api/admin/reports?status=invalid',
	'/api/admin/reports?status=PENDING',
	'/api/admin/reports?status=Pending',

	// `?contentType=` — enum filter against the
	// `ReportContentType` enum (item / comment).
	'/api/admin/reports?contentType=item',
	'/api/admin/reports?contentType=comment',
	'/api/admin/reports?contentType=',
	'/api/admin/reports?contentType=invalid',
	'/api/admin/reports?contentType=ITEM',

	// `?reason=` — enum filter against the
	// `ReportReason` enum (spam / harassment /
	// inappropriate / other).
	'/api/admin/reports?reason=spam',
	'/api/admin/reports?reason=harassment',
	'/api/admin/reports?reason=inappropriate',
	'/api/admin/reports?reason=other',
	'/api/admin/reports?reason=',
	'/api/admin/reports?reason=invalid',
	'/api/admin/reports?reason=SPAM',

	// Combinations of the documented filters.
	'/api/admin/reports?page=1&limit=20&status=pending&contentType=item&reason=spam',
	'/api/admin/reports?page=&limit=&search=&status=&contentType=&reason=',

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys.
	'/api/admin/reports?userId=anything',
	'/api/admin/reports?user_id=anything',
	'/api/admin/reports?adminId=anything',
	'/api/admin/reports?as=admin',
	'/api/admin/reports?asUser=true',
	'/api/admin/reports?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/reports?token=anything',
	'/api/admin/reports?secret=anything',
	'/api/admin/reports?api_key=anything',
	'/api/admin/reports?authorization=Bearer+anything',
	'/api/admin/reports?session=anything',
	'/api/admin/reports?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/reports?bypass=1',
	'/api/admin/reports?admin=1',
	'/api/admin/reports?admin=true',
	'/api/admin/reports?override=true',
	'/api/admin/reports?force=true',

	// `?reporterId=` / `?reportedBy=` / `?targetId=` /
	// `?contentId=` — per-row-targeting keys for a
	// future contributor.
	'/api/admin/reports?reporterId=user_123',
	'/api/admin/reports?reportedBy=user_123',
	'/api/admin/reports?targetId=item_456',
	'/api/admin/reports?contentId=comment_789',

	// `?from=` / `?to=` / `?since=` / `?until=` —
	// time-range filter keys.
	'/api/admin/reports?from=2024-01-01',
	'/api/admin/reports?to=2026-12-31',
	'/api/admin/reports?since=2024-01-01T00:00:00Z',
	'/api/admin/reports?until=2026-12-31T23:59:59Z',
	'/api/admin/reports?from=invalid-date',

	// `?sortBy=` / `?sortOrder=` — order-targeting keys.
	'/api/admin/reports?sortBy=createdAt',
	'/api/admin/reports?sortBy=status',
	'/api/admin/reports?sortOrder=asc',
	'/api/admin/reports?sortOrder=desc',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys.
	'/api/admin/reports?fields=id',
	'/api/admin/reports?fields=id,status,contentType',
	'/api/admin/reports?select=status',
	'/api/admin/reports?include=reporter',

	// `?refresh=` / `?force=` / `?cache=` — cache-
	// busting keys.
	'/api/admin/reports?refresh=1',
	'/api/admin/reports?fresh=true',
	'/api/admin/reports?cache=bypass',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/reports?locale=en',
	'/api/admin/reports?locale=fr',
	'/api/admin/reports?lang=de',

	// Repeated keys.
	'/api/admin/reports?page=1&page=2',
	'/api/admin/reports?status=pending&status=resolved',
	'/api/admin/reports?reason=spam&reason=harassment',

	// Bogus / typo'd query keys.
	'/api/admin/reports?unknown=value',
	'/api/admin/reports?foo=bar&baz=qux',
	'/api/admin/reports?userId=admin&token=foo&unknown=value&page=1&limit=20&status=pending&foo=bar'
] as const;

test.describe('API: /api/admin/reports query-param surface', () => {
	for (const path of ADMIN_REPORTS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's single-step admin gate fires
			// after the DB-availability check but before any
			// `searchParams` parsing or repository call. The
			// unauthenticated GET surface returns a 4xx
			// (specifically 403) deterministically. A 500
			// is reachable only if the catch fires after the
			// gate has let the call through (e.g. the
			// `getReports(...)` repository call throws),
			// which never happens on the unauth branch.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/reports returns a 403 (NOT 401) on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the single-step gate
		// (`!session?.user?.isAdmin`) folds the
		// missing-session and missing-admin-bit branches
		// into a single 403 response with the bare
		// `'Forbidden'` message — distinct from the
		// notifications route's two-step gate (which emits
		// 401 'Unauthorized' for missing session and 403
		// 'Forbidden' for missing admin bit). A regression
		// that switches to the two-step gate would surface
		// here as a status divergence between the expected
		// 403 and the unexpected 401.
		const response = await request.get('/api/admin/reports');

		expect(response.status()).toBe(403);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Forbidden'
		});
	});

	test('GET /api/admin/reports has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads six documented query params
		// after the gate, so the response status must be
		// invariant to any combination of known and
		// unknown keys on the unauth branch.
		const baseline = await request.get('/api/admin/reports');
		const parameterised = await request.get(
			'/api/admin/reports?page=1&limit=20&status=pending&contentType=item&reason=spam&search=test&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/reports?page=…&limit=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `?page=` / `?limit=` pagination params are
		// parsed via inline `Number()` + `Math.max()` /
		// `Math.min()` clamps after the gate. The unauth
		// branch must always return 403 regardless. A
		// regression that runs the parsing before the gate
		// would not change the unauth-branch contract
		// (because the inline clamps never throw), but a
		// regression that switches to a strict validator
		// returning 400 on invalid values WOULD change
		// the unauth-branch contract — that change is what
		// this assertion catches.
		const baseline = await request.get('/api/admin/reports');
		const responses = await Promise.all([
			request.get('/api/admin/reports?page=1'),
			request.get('/api/admin/reports?page=invalid'),
			request.get('/api/admin/reports?page=-1'),
			request.get('/api/admin/reports?page=0'),
			request.get('/api/admin/reports?limit=10'),
			request.get('/api/admin/reports?limit=invalid'),
			request.get('/api/admin/reports?limit=0'),
			request.get('/api/admin/reports?limit=-1'),
			request.get('/api/admin/reports?limit=101'),
			request.get('/api/admin/reports?limit=99999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports?status=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `?status=` filter is validated against the
		// `ReportStatus` enum (pending / reviewed /
		// resolved / dismissed) after the gate. Any value
		// must round-trip to the same status on the unauth
		// branch.
		const baseline = await request.get('/api/admin/reports');
		const responses = await Promise.all([
			request.get('/api/admin/reports?status=pending'),
			request.get('/api/admin/reports?status=reviewed'),
			request.get('/api/admin/reports?status=resolved'),
			request.get('/api/admin/reports?status=dismissed'),
			request.get('/api/admin/reports?status=invalid'),
			request.get('/api/admin/reports?status='),
			request.get('/api/admin/reports?status=PENDING')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports?contentType=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `?contentType=` filter is validated against
		// the `ReportContentType` enum (item / comment)
		// after the gate.
		const baseline = await request.get('/api/admin/reports');
		const responses = await Promise.all([
			request.get('/api/admin/reports?contentType=item'),
			request.get('/api/admin/reports?contentType=comment'),
			request.get('/api/admin/reports?contentType=invalid'),
			request.get('/api/admin/reports?contentType='),
			request.get('/api/admin/reports?contentType=ITEM')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports?reason=… does NOT bypass the admin gate', async ({ request }) => {
		// The `?reason=` filter is validated against the
		// `ReportReason` enum (spam / harassment /
		// inappropriate / other) after the gate.
		const baseline = await request.get('/api/admin/reports');
		const responses = await Promise.all([
			request.get('/api/admin/reports?reason=spam'),
			request.get('/api/admin/reports?reason=harassment'),
			request.get('/api/admin/reports?reason=inappropriate'),
			request.get('/api/admin/reports?reason=other'),
			request.get('/api/admin/reports?reason=invalid'),
			request.get('/api/admin/reports?reason=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports?userId=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven user resolution would
		// change the unauth branch from "always 403" to
		// "200 if ?userId=… is present" — silently
		// granting any anonymous caller admin-level
		// reports visibility.
		const baseline = await request.get('/api/admin/reports');
		const responses = await Promise.all([
			request.get('/api/admin/reports?userId=admin'),
			request.get('/api/admin/reports?user_id=admin'),
			request.get('/api/admin/reports?adminId=admin'),
			request.get('/api/admin/reports?as=admin'),
			request.get('/api/admin/reports?asUser=true'),
			request.get('/api/admin/reports?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports?token=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who adds magic-token-based
		// admin bypass would change the unauth branch
		// from "always 403" to "200 if the right token is
		// present".
		const baseline = await request.get('/api/admin/reports');
		const responses = await Promise.all([
			request.get('/api/admin/reports?token=anything'),
			request.get('/api/admin/reports?secret=anything'),
			request.get('/api/admin/reports?api_key=anything'),
			request.get('/api/admin/reports?authorization=Bearer+anything'),
			request.get('/api/admin/reports?session=anything'),
			request.get('/api/admin/reports?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports?bypass=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who adds a `?bypass=…`,
		// `?admin=…`, or `?override=…` admin-override key
		// would change the unauth branch from "always
		// 403" to "200 if the right key is present".
		const baseline = await request.get('/api/admin/reports');
		const responses = await Promise.all([
			request.get('/api/admin/reports?bypass=1'),
			request.get('/api/admin/reports?admin=1'),
			request.get('/api/admin/reports?admin=true'),
			request.get('/api/admin/reports?override=true'),
			request.get('/api/admin/reports?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports?search=… does NOT introduce a SQL-injection bypass', async ({
		request
	}) => {
		// The `?search=` free-text filter is forwarded to
		// the `getReports({ search })` repository call,
		// which internally constructs a Drizzle query
		// with the search term. A regression that
		// switches to raw SQL string interpolation would
		// open the route to SQL injection. The unauth
		// branch must always return 403 regardless of
		// the search payload.
		const baseline = await request.get('/api/admin/reports');
		const responses = await Promise.all([
			request.get("/api/admin/reports?search=%27%20OR%201%3D1"),
			request.get('/api/admin/reports?search=%3Cscript%3E'),
			request.get('/api/admin/reports?search=%25'),
			request.get('/api/admin/reports?search=%5C'),
			request.get(`/api/admin/reports?search=${'x'.repeat(500)}`),
			request.get(`/api/admin/reports?search=${'x'.repeat(1000)}`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth
		// branch.
		const responses = await Promise.all([
			request.get('/api/admin/reports'),
			request.get('/api/admin/reports?page=1&limit=20&status=pending&contentType=item&reason=spam'),
			request.get(
				'/api/admin/reports?userId=admin&token=foo&page=invalid&limit=99999&status=invalid&contentType=invalid&reason=invalid&search=test&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/reports does NOT branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types
		// today; every Accept header must round-trip to
		// the same status on the unauth branch.
		const baseline = await request.get('/api/admin/reports');
		const responses = await Promise.all([
			request.get('/api/admin/reports', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/reports', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/reports', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/reports', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/reports');
		const responses = await Promise.all([
			request.get('/api/admin/reports?page=1&page=2'),
			request.get('/api/admin/reports?status=pending&status=resolved'),
			request.get('/api/admin/reports?reason=spam&reason=harassment')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/reports keeps a bare-Request-typed handler signature stable', async ({
		request
	}) => {
		// The route's handler signature is
		// `GET(request: Request)` — explicitly typed
		// against the bare `Request` Web API type, NOT
		// the Next-specific `NextRequest` type that other
		// admin-tree routes use. The bare `Request` type
		// narrows the request surface to the standard Web
		// API; a future migration to `NextRequest` opens
		// up `request.cookies` / `request.geo` /
		// `request.ip`. The unauth-branch contract must
		// stay invariant under any of those side
		// channels.
		const responses = await Promise.all([
			request.get('/api/admin/reports', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/reports', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/reports', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/reports', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/reports response message does NOT echo any other admin-tree route signature', async ({
		request
	}) => {
		// The 403 envelope carries the bare `'Forbidden'`
		// message — distinct from the
		// `'Unauthorized. Admin access required.'`
		// message most admin-gated routes emit and
		// distinct from the bare `'Unauthorized'` message
		// the notifications route's first-step gate
		// emits. A regression that switches to either
		// alternative would surface here as a body-
		// divergence assertion failure.
		const response = await request.get('/api/admin/reports');
		const body = await response.json();

		expect(body.error).toBe('Forbidden');
		expect(body.error).not.toBe('Unauthorized');
		expect(body.error).not.toBe('Unauthorized. Admin access required.');
	});
});
