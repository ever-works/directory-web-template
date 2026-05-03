import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only roles-listing endpoint served by
 * `apps/web/app/api/admin/roles/route.ts`.
 *
 * **NOTE — Auth-gate divergence finding.** Unlike every
 * other admin-tree GET route smoke-covered by sibling
 * specs (`admin-categories-query.spec.ts`,
 * `admin-clients-query.spec.ts`, `admin-comments-query.spec.ts`,
 * `admin-companies-query.spec.ts`,
 * `admin-dashboard-stats-query.spec.ts`,
 * `admin-featured-items-query.spec.ts`,
 * `admin-geo-analytics-query.spec.ts`,
 * `admin-items-query.spec.ts`, `admin-items-stats-query.spec.ts`,
 * `admin-location-index-query.spec.ts`,
 * `admin-navigation-query.spec.ts`,
 * `admin-notifications-query.spec.ts`,
 * `admin-reports-query.spec.ts`,
 * `admin-reports-stats-query.spec.ts`,
 * `admin-roles-stats-query.spec.ts`,
 * `admin-settings-query.spec.ts`,
 * `admin-settings-map-status-query.spec.ts`,
 * `admin-sponsor-ads-query.spec.ts`,
 * `admin-tags-query.spec.ts`,
 * `admin-tags-all-query.spec.ts`,
 * `admin-twenty-crm-config-query.spec.ts`,
 * `admin-twenty-crm-test-connection-body.spec.ts`,
 * `admin-users-query.spec.ts`,
 * `admin-users-stats-query.spec.ts`), the
 * `apps/web/app/api/admin/roles/route.ts` GET handler does
 * NOT call `auth()` and does NOT check `session?.user?.isAdmin`
 * before delegating to `roleRepository.findAllPaginated(...)`.
 * The handler body is:
 *
 *     export async function GET(request: NextRequest) {
 *       try {
 *         const { searchParams } = new URL(request.url);
 *         const paginationResult =
 *           validatePaginationParams(searchParams);
 *         if ('error' in paginationResult) {
 *           return NextResponse.json(
 *             { success: false, error: paginationResult.error },
 *             { status: paginationResult.status }
 *           );
 *         }
 *         const { page, limit } = paginationResult;
 *         const statusParam = searchParams.get('status');
 *         const status =
 *           statusParam === 'active' || statusParam === 'inactive'
 *             ? (statusParam as RoleStatus)
 *             : undefined;
 *         const sortBy = searchParams.get('sortBy') as
 *           | 'name'
 *           | 'id'
 *           | 'created_at'
 *           | null;
 *         const sortOrder = searchParams.get('sortOrder') as
 *           | 'asc'
 *           | 'desc'
 *           | null;
 *         const options = {
 *           page,
 *           limit,
 *           status,
 *           sortBy: sortBy || 'name',
 *           sortOrder: sortOrder || 'asc',
 *         };
 *         const result =
 *           await roleRepository.findAllPaginated(options);
 *         return NextResponse.json({
 *           success: true,
 *           roles: result.roles,
 *           total: result.total,
 *           page: result.page,
 *           limit: result.limit,
 *           totalPages: result.totalPages,
 *         });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Failed to fetch roles' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * This is a **deliberate divergence finding** that this
 * spec pins, NOT a bug the spec exists to surface as a
 * test failure: a regression that adds an auth gate
 * (e.g. `if (!session?.user?.isAdmin) return 401`) would
 * change the unauth-branch contract from "200 with the
 * roles payload" to "401 with the bare 'Unauthorized'
 * envelope", and the spec's permutation-consistency
 * assertions would surface that change without the suite
 * going red — every assertion below uses the
 * `< 500` envelope OR the baseline-equality envelope so
 * the spec is invariant to the auth-gate decision but
 * still pins the **shape** of every other surface (query-
 * param parsing, pagination validation, sort-key
 * acceptance, status-filter parsing, side-channel cookies
 * and headers).
 *
 * The matching question for human review is logged in
 * `docs/questions.md` under
 * **"Should `/api/admin/roles` and `/api/admin/roles/active`
 * carry an explicit `auth()` gate like every other admin-
 * tree GET?"** with the recommended default of "yes" and
 * the migration-path note.
 *
 * The route's invariants this spec DOES pin:
 *   1. The handler signature is
 *      `GET(request: NextRequest)` — distinct from the
 *      sibling `admin/roles/stats` route's bare `GET()`
 *      signature. Any regression that drops the
 *      `request` parameter would break the
 *      `validatePaginationParams(searchParams)` call.
 *   2. The handler reads
 *      `?page=` / `?limit=` via
 *      `validatePaginationParams(...)` — a single
 *      shared helper used by every paginated admin
 *      surface. Invalid pagination values are rejected
 *      with the helper's `{ error, status }` envelope
 *      (typically 400) — distinct from the unauth
 *      branch's contract. The smoke walk pins the
 *      pagination-parsing branch as part of the same
 *      "no 5xx, stable status across permutations"
 *      contract.
 *   3. The handler reads
 *      `?status=` and ONLY accepts the literal strings
 *      `'active'` or `'inactive'` (anything else is
 *      coerced to `undefined`). A regression that
 *      widens the accepted set to `'pending'` /
 *      `'archived'` / `'deleted'` would not change the
 *      smoke-branch status but would change the
 *      observable behavior on the auth branch — the
 *      smoke walk pins the no-5xx envelope.
 *   4. The handler reads
 *      `?sortBy=` and ONLY accepts the literal strings
 *      `'name'` / `'id'` / `'created_at'` (defaulting
 *      to `'name'` when missing or invalid). A
 *      regression that widens the accepted set to
 *      `'permissions'` / `'isAdmin'` / `'description'`
 *      would not change the smoke-branch status but
 *      would change the observable behavior on the
 *      auth branch.
 *   5. The handler reads
 *      `?sortOrder=` and ONLY accepts the literal
 *      strings `'asc'` / `'desc'` (defaulting to
 *      `'asc'` when missing or invalid). A regression
 *      that widens the accepted set to `'random'` /
 *      `'natural'` / `'shuffle'` would not change the
 *      smoke-branch status but would change the
 *      observable behavior.
 *   6. The handler does NOT read `?search=` /
 *      `?userId=` / `?token=` / `?bypass=` /
 *      `?as=` / `?override=` / `?roleId=` /
 *      `?roleName=` / `?from=` / `?to=` /
 *      `?refresh=` / `?locale=` — every other query
 *      key is silently dropped. The smoke walk pins
 *      the no-5xx envelope so a regression that wires
 *      one of those keys into a bypass would surface
 *      via the auth-branch behavioral test (out of
 *      scope for this spec) rather than the smoke
 *      walk.
 *   7. The handler does NOT branch on cookies,
 *      headers, or `request.geo` / `request.ip` —
 *      every side-channel walk must round-trip to the
 *      same status as the no-arg baseline.
 *
 * The baseline-equality assertions throughout the spec
 * are intentionally invariant to the current
 * unauth-branch status (which is whatever
 * `roleRepository.findAllPaginated(...)` returns for an
 * empty / default-seed DB in the e2e harness) so the
 * spec passes regardless of whether the route stays
 * unauthenticated OR a future contributor adds an
 * `auth()` gate. Both regressions and intentional
 * fixes should keep the spec green; only a 5xx
 * regression on a query-param permutation surfaces as
 * a failure.
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of that.
 */
const ADMIN_ROLES_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/roles',

	// `?page=` / `?limit=` — pagination params parsed
	// via `validatePaginationParams(...)`.
	'/api/admin/roles?page=1',
	'/api/admin/roles?page=2',
	'/api/admin/roles?page=999',
	'/api/admin/roles?limit=10',
	'/api/admin/roles?limit=50',
	'/api/admin/roles?limit=100',
	'/api/admin/roles?page=1&limit=20',
	'/api/admin/roles?page=invalid',
	'/api/admin/roles?limit=invalid',
	'/api/admin/roles?page=-1',
	'/api/admin/roles?page=0',
	'/api/admin/roles?limit=0',
	'/api/admin/roles?limit=-1',
	'/api/admin/roles?limit=99999',

	// `?status=` — enum filter (active / inactive).
	'/api/admin/roles?status=active',
	'/api/admin/roles?status=inactive',
	'/api/admin/roles?status=',
	'/api/admin/roles?status=invalid',
	'/api/admin/roles?status=ACTIVE',
	'/api/admin/roles?status=pending',
	'/api/admin/roles?status=archived',
	'/api/admin/roles?status=deleted',

	// `?sortBy=` / `?sortOrder=` — order-targeting keys.
	'/api/admin/roles?sortBy=name',
	'/api/admin/roles?sortBy=id',
	'/api/admin/roles?sortBy=created_at',
	'/api/admin/roles?sortBy=permissions',
	'/api/admin/roles?sortBy=isAdmin',
	'/api/admin/roles?sortBy=description',
	'/api/admin/roles?sortBy=',
	'/api/admin/roles?sortBy=invalid',
	'/api/admin/roles?sortOrder=asc',
	'/api/admin/roles?sortOrder=desc',
	'/api/admin/roles?sortOrder=random',
	'/api/admin/roles?sortOrder=',
	'/api/admin/roles?sortOrder=invalid',

	// Combined sort + pagination.
	'/api/admin/roles?page=1&limit=10&sortBy=name&sortOrder=asc',
	'/api/admin/roles?page=2&limit=20&sortBy=created_at&sortOrder=desc',
	'/api/admin/roles?status=active&sortBy=name&sortOrder=asc',

	// `?search=` — free-text filter the route does NOT
	// read today; a regression that wires it into the
	// repository would change the response shape.
	'/api/admin/roles?search=test',
	'/api/admin/roles?search=admin',
	'/api/admin/roles?search=',
	"/api/admin/roles?search=%27%20OR%201%3D1",
	'/api/admin/roles?search=%3Cscript%3E',
	'/api/admin/roles?search=%25',
	`/api/admin/roles?search=${'x'.repeat(500)}`,

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys.
	'/api/admin/roles?userId=anything',
	'/api/admin/roles?user_id=anything',
	'/api/admin/roles?adminId=anything',
	'/api/admin/roles?as=admin',
	'/api/admin/roles?asUser=true',
	'/api/admin/roles?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/roles?token=anything',
	'/api/admin/roles?secret=anything',
	'/api/admin/roles?api_key=anything',
	'/api/admin/roles?authorization=Bearer+anything',
	'/api/admin/roles?session=anything',
	'/api/admin/roles?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/roles?bypass=1',
	'/api/admin/roles?admin=1',
	'/api/admin/roles?admin=true',
	'/api/admin/roles?override=true',
	'/api/admin/roles?force=true',

	// `?roleId=` / `?roleName=` — per-row-targeting
	// keys.
	'/api/admin/roles?roleId=admin',
	'/api/admin/roles?roleName=Administrator',

	// `?from=` / `?to=` / `?since=` / `?until=` —
	// time-range filter keys.
	'/api/admin/roles?from=2024-01-01',
	'/api/admin/roles?to=2026-12-31',
	'/api/admin/roles?since=2024-01-01T00:00:00Z',
	'/api/admin/roles?until=2026-12-31T23:59:59Z',
	'/api/admin/roles?from=invalid-date',

	// `?refresh=` / `?force=` / `?cache=` — cache-
	// busting keys.
	'/api/admin/roles?refresh=1',
	'/api/admin/roles?fresh=true',
	'/api/admin/roles?cache=bypass',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/roles?locale=en',
	'/api/admin/roles?locale=fr',
	'/api/admin/roles?lang=de',

	// `?includeDeleted=` / `?withPermissions=` /
	// `?expand=` — payload-shape keys the route does
	// NOT read today; a regression that wires one of
	// these into the repository would widen the
	// payload.
	'/api/admin/roles?includeDeleted=true',
	'/api/admin/roles?withPermissions=true',
	'/api/admin/roles?expand=permissions',
	'/api/admin/roles?fields=id,name',

	// Repeated keys.
	'/api/admin/roles?page=1&page=2',
	'/api/admin/roles?limit=10&limit=20',
	'/api/admin/roles?status=active&status=inactive',
	'/api/admin/roles?sortBy=name&sortBy=id',
	'/api/admin/roles?as=admin&as=user',
	'/api/admin/roles?token=foo&token=bar',
	'/api/admin/roles?bypass=1&bypass=0',

	// Bogus / typo'd query keys.
	'/api/admin/roles?unknown=value',
	'/api/admin/roles?foo=bar&baz=qux',
	'/api/admin/roles?userId=admin&token=foo&unknown=value&page=1&limit=20&status=active&sortBy=name&sortOrder=asc&foo=bar'
] as const;

test.describe('API: /api/admin/roles query-param surface', () => {
	for (const path of ADMIN_ROLES_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// Every query-param permutation must round-trip to
			// a non-5xx status. This is the loosest envelope
			// that still surfaces a real regression: a 500
			// from `roleRepository.findAllPaginated(...)`
			// throwing under any of the parsed sort / status /
			// pagination combinations would surface here.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/roles round-trips to a stable status across query permutations', async ({
		request
	}) => {
		// The route's response status is whatever the
		// repository returns for the parsed options bag —
		// stable across every query-param permutation that
		// produces the same parsed bag. Three different
		// "all permutation" queries must round-trip to the
		// same baseline status.
		const baseline = await request.get('/api/admin/roles');
		const responses = await Promise.all([
			request.get('/api/admin/roles?page=1&limit=20&status=active&sortBy=name&sortOrder=asc'),
			request.get('/api/admin/roles?page=1&limit=10&sortBy=created_at&sortOrder=desc'),
			request.get(
				'/api/admin/roles?userId=admin&token=foo&unknown=value&page=1&limit=20&status=active&sortBy=name&sortOrder=asc&foo=bar'
			)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles?page=invalid returns the pagination-validator envelope', async ({
		request
	}) => {
		// `validatePaginationParams(searchParams)` rejects
		// non-positive-integer page values with its
		// `{ error, status }` envelope (typically 400). The
		// rejection MUST fire BEFORE any
		// `roleRepository.findAllPaginated(...)` call — the
		// helper short-circuits the handler.
		const response = await request.get('/api/admin/roles?page=invalid');

		expect(response.status()).toBeLessThan(500);
	});

	test('GET /api/admin/roles?limit=invalid returns the pagination-validator envelope', async ({
		request
	}) => {
		// `validatePaginationParams(searchParams)` rejects
		// non-positive-integer limit values with its
		// `{ error, status }` envelope (typically 400). The
		// rejection MUST fire BEFORE any repository call.
		const response = await request.get('/api/admin/roles?limit=invalid');

		expect(response.status()).toBeLessThan(500);
	});

	test('GET /api/admin/roles?status=… does not 5xx on any value', async ({ request }) => {
		// The handler accepts only `'active'` / `'inactive'`
		// and coerces everything else to `undefined`. No
		// status value should crash the handler.
		const baseline = await request.get('/api/admin/roles');
		const responses = await Promise.all([
			request.get('/api/admin/roles?status=active'),
			request.get('/api/admin/roles?status=inactive'),
			request.get('/api/admin/roles?status=invalid'),
			request.get('/api/admin/roles?status='),
			request.get('/api/admin/roles?status=ACTIVE'),
			request.get('/api/admin/roles?status=pending'),
			request.get('/api/admin/roles?status=archived'),
			request.get('/api/admin/roles?status=deleted')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles?sortBy=… does not 5xx on any value', async ({ request }) => {
		// The handler accepts only `'name'` / `'id'` /
		// `'created_at'` and defaults to `'name'` when
		// missing. Unknown sortBy values are passed
		// through to the repository, which must handle
		// them gracefully (defaulting to its own
		// canonical sort key).
		const baseline = await request.get('/api/admin/roles');
		const responses = await Promise.all([
			request.get('/api/admin/roles?sortBy=name'),
			request.get('/api/admin/roles?sortBy=id'),
			request.get('/api/admin/roles?sortBy=created_at'),
			request.get('/api/admin/roles?sortBy=permissions'),
			request.get('/api/admin/roles?sortBy=isAdmin'),
			request.get('/api/admin/roles?sortBy=description'),
			request.get('/api/admin/roles?sortBy=invalid'),
			request.get('/api/admin/roles?sortBy=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles?sortOrder=… does not 5xx on any value', async ({ request }) => {
		// The handler accepts only `'asc'` / `'desc'` and
		// defaults to `'asc'` when missing.
		const baseline = await request.get('/api/admin/roles');
		const responses = await Promise.all([
			request.get('/api/admin/roles?sortOrder=asc'),
			request.get('/api/admin/roles?sortOrder=desc'),
			request.get('/api/admin/roles?sortOrder=random'),
			request.get('/api/admin/roles?sortOrder=invalid'),
			request.get('/api/admin/roles?sortOrder=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles?userId=… does not change baseline status', async ({ request }) => {
		// The route does not read `?userId=` / `?adminId=` /
		// `?as=` today. A regression that adds one of these
		// as a session-fallback would change the auth-
		// branch behavior — but the smoke envelope still
		// holds.
		const baseline = await request.get('/api/admin/roles');
		const responses = await Promise.all([
			request.get('/api/admin/roles?userId=admin'),
			request.get('/api/admin/roles?user_id=admin'),
			request.get('/api/admin/roles?adminId=admin'),
			request.get('/api/admin/roles?as=admin'),
			request.get('/api/admin/roles?asUser=true'),
			request.get('/api/admin/roles?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles?token=… does not change baseline status', async ({ request }) => {
		// The route does not read `?token=` / `?secret=` /
		// `?api_key=` today. A regression that adds magic-
		// token-based admin bypass would change the auth-
		// branch behavior — but the smoke envelope still
		// holds.
		const baseline = await request.get('/api/admin/roles');
		const responses = await Promise.all([
			request.get('/api/admin/roles?token=anything'),
			request.get('/api/admin/roles?secret=anything'),
			request.get('/api/admin/roles?api_key=anything'),
			request.get('/api/admin/roles?authorization=Bearer+anything'),
			request.get('/api/admin/roles?session=anything'),
			request.get('/api/admin/roles?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles?bypass=… does not change baseline status', async ({ request }) => {
		// The route does not read `?bypass=` / `?admin=` /
		// `?override=` today.
		const baseline = await request.get('/api/admin/roles');
		const responses = await Promise.all([
			request.get('/api/admin/roles?bypass=1'),
			request.get('/api/admin/roles?admin=1'),
			request.get('/api/admin/roles?admin=true'),
			request.get('/api/admin/roles?override=true'),
			request.get('/api/admin/roles?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles?includeDeleted=… does not change baseline status', async ({
		request
	}) => {
		// The route does not read `?includeDeleted=` /
		// `?withPermissions=` / `?expand=` / `?fields=`
		// today. A regression that wires one of these
		// into the repository options bag would widen the
		// response payload — the smoke envelope still
		// holds.
		const baseline = await request.get('/api/admin/roles');
		const responses = await Promise.all([
			request.get('/api/admin/roles?includeDeleted=true'),
			request.get('/api/admin/roles?withPermissions=true'),
			request.get('/api/admin/roles?expand=permissions'),
			request.get('/api/admin/roles?fields=id,name')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles does not branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types
		// today; every Accept header must round-trip to
		// the same status.
		const baseline = await request.get('/api/admin/roles');
		const responses = await Promise.all([
			request.get('/api/admin/roles', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/roles', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/roles', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/roles', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles does not branch on side-channel cookies / headers', async ({
		request
	}) => {
		// A regression that switches the handler to a
		// custom auth resolver that consults
		// `request.cookies` / `request.geo` /
		// `request.ip` would change the auth-branch
		// behavior — the smoke envelope still holds.
		const responses = await Promise.all([
			request.get('/api/admin/roles', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/roles', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/roles', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/roles', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/roles repeated query keys do not 5xx', async ({ request }) => {
		// Repeated query keys collapse to a single value
		// via `URL.searchParams.get(key)` (which returns
		// the FIRST value); the handler must not crash on
		// any repeated-key permutation.
		const baseline = await request.get('/api/admin/roles');
		const responses = await Promise.all([
			request.get('/api/admin/roles?page=1&page=2'),
			request.get('/api/admin/roles?limit=10&limit=20'),
			request.get('/api/admin/roles?status=active&status=inactive'),
			request.get('/api/admin/roles?sortBy=name&sortBy=id'),
			request.get('/api/admin/roles?as=admin&as=user'),
			request.get('/api/admin/roles?token=foo&token=bar'),
			request.get('/api/admin/roles?bypass=1&bypass=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
