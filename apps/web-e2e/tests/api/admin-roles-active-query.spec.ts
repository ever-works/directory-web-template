import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only active-roles endpoint served by
 * `apps/web/app/api/admin/roles/active/route.ts`.
 *
 * **NOTE — Auth-gate divergence finding (sibling).** Like
 * the immediately-preceding sibling
 * `admin-roles-query.spec.ts` smoke spec for
 * `apps/web/app/api/admin/roles/route.ts`, the route
 * under test here does **not** call `auth()` and does
 * **not** check `session?.user?.isAdmin` before
 * delegating to `roleRepository.findActive()`. Every
 * other admin-tree GET route covered by a sibling smoke
 * spec (`admin-categories-query.spec.ts`,
 * `admin-clients-query.spec.ts`,
 * `admin-comments-query.spec.ts`,
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
 * `admin-tags-query.spec.ts`, `admin-tags-all-query.spec.ts`,
 * `admin-twenty-crm-config-query.spec.ts`,
 * `admin-twenty-crm-test-connection-body.spec.ts`,
 * `admin-users-query.spec.ts`,
 * `admin-users-stats-query.spec.ts`) carries an explicit
 * `auth()` gate. The handler body of the route under
 * test here is the **bare** zero-argument Next 16 form:
 *
 *     export async function GET() {
 *       try {
 *         const activeRoles = await roleRepository.findActive();
 *         return NextResponse.json({
 *           roles: activeRoles,
 *         });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { error: 'Failed to fetch active roles' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * That signature has three load-bearing implications
 * the smoke walk pins:
 *
 *   1. The handler does NOT take a `request` parameter —
 *      every `?…=…` permutation is silently discarded by
 *      the Next.js routing layer before the handler body
 *      runs. The smoke walk therefore expects every
 *      query-param permutation to round-trip to the
 *      **same status** as the no-arg baseline; the
 *      route is **invariant** to its query string.
 *      A regression that switches the handler signature
 *      to `GET(request: NextRequest)` and starts reading
 *      `searchParams.get(...)` would change the
 *      observable behavior on at least one of the
 *      permutations below — the baseline-equality
 *      assertions would surface that change without the
 *      suite going red, because the bulk-loop's `< 500`
 *      envelope still holds.
 *   2. The handler does NOT call `auth()` — there is no
 *      session-bearing branch and no `session?.user?.id`
 *      / `session?.user?.isAdmin` check. The route is
 *      effectively **public** today; the e2e harness
 *      hits it without an authenticated session and
 *      receives the same 200-with-roles payload an
 *      authenticated admin would. A regression that
 *      adds an `auth()` gate (e.g. the same two-step
 *      gate as the sibling `/api/admin/roles/stats`
 *      route) would change the unauth-branch contract
 *      from "200 with the active-roles payload" to
 *      "401 with the bare 'Unauthorized' envelope" —
 *      the smoke walk's baseline-equality assertions
 *      stay invariant to that change because every
 *      permutation continues to match the **same**
 *      baseline status (whichever it happens to be),
 *      and the bulk-loop's `< 500` envelope still
 *      holds.
 *   3. The handler delegates to `roleRepository.findActive()`
 *      with **no** `options` bag — the repository is
 *      called with zero arguments. A regression that
 *      threads any of the query keys below into a new
 *      `options` bag (e.g. `?status=` to widen the
 *      filter beyond the active set, or `?sortBy=` /
 *      `?sortOrder=` to override the repository's
 *      canonical order) would change the auth-branch
 *      payload — the smoke walk's `< 500` envelope
 *      still holds.
 *
 * The matching question for human review is logged in
 * `docs/questions.md` under
 * **"Should `/api/admin/roles` and `/api/admin/roles/active`
 * carry an explicit `auth()` gate like every other admin-
 * tree GET?"** with the recommended default of "yes" and
 * the migration-path note. This spec is the **second**
 * spec to pin the divergence finding for the sibling
 * routes covered by Q-010b — the other one being
 * `admin-roles-query.spec.ts`.
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of that.
 */
const ADMIN_ROLES_ACTIVE_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/roles/active',

	// `?page=` / `?limit=` — pagination keys the sibling
	// `admin/roles` route reads. The
	// `admin/roles/active` route does NOT take a
	// `request` parameter, so the keys are silently
	// discarded before the handler body runs.
	'/api/admin/roles/active?page=1',
	'/api/admin/roles/active?page=2',
	'/api/admin/roles/active?limit=10',
	'/api/admin/roles/active?limit=50',
	'/api/admin/roles/active?limit=100',
	'/api/admin/roles/active?page=1&limit=20',
	'/api/admin/roles/active?page=invalid',
	'/api/admin/roles/active?limit=invalid',
	'/api/admin/roles/active?page=-1',
	'/api/admin/roles/active?page=0',
	'/api/admin/roles/active?limit=99999',

	// `?status=` — enum filter the sibling
	// `admin/roles` route accepts (active / inactive).
	// The `admin/roles/active` route is **already**
	// scoped to active roles by the repository call,
	// so this key is doubly meaningless: the route
	// neither reads it nor would the repository
	// re-scope on it.
	'/api/admin/roles/active?status=active',
	'/api/admin/roles/active?status=inactive',
	'/api/admin/roles/active?status=',
	'/api/admin/roles/active?status=invalid',
	'/api/admin/roles/active?status=ACTIVE',
	'/api/admin/roles/active?status=pending',
	'/api/admin/roles/active?status=archived',
	'/api/admin/roles/active?status=deleted',
	'/api/admin/roles/active?status=all',

	// `?isAdmin=` — boolean filter that would scope the
	// active set to admin-roles only. Not read today;
	// a regression that adds it would change the
	// baseline payload.
	'/api/admin/roles/active?isAdmin=true',
	'/api/admin/roles/active?isAdmin=false',
	'/api/admin/roles/active?isAdmin=1',
	'/api/admin/roles/active?isAdmin=0',

	// `?sortBy=` / `?sortOrder=` — order-targeting
	// keys the sibling `admin/roles` route accepts.
	// Not read today.
	'/api/admin/roles/active?sortBy=name',
	'/api/admin/roles/active?sortBy=id',
	'/api/admin/roles/active?sortBy=created_at',
	'/api/admin/roles/active?sortBy=permissions',
	'/api/admin/roles/active?sortBy=isAdmin',
	'/api/admin/roles/active?sortBy=description',
	'/api/admin/roles/active?sortBy=',
	'/api/admin/roles/active?sortBy=invalid',
	'/api/admin/roles/active?sortOrder=asc',
	'/api/admin/roles/active?sortOrder=desc',
	'/api/admin/roles/active?sortOrder=random',
	'/api/admin/roles/active?sortOrder=',
	'/api/admin/roles/active?sortOrder=invalid',

	// Combined sort + pagination.
	'/api/admin/roles/active?page=1&limit=10&sortBy=name&sortOrder=asc',
	'/api/admin/roles/active?page=2&limit=20&sortBy=created_at&sortOrder=desc',
	'/api/admin/roles/active?status=active&sortBy=name&sortOrder=asc',

	// `?search=` — free-text filter the sibling
	// `admin/roles` route does NOT read; the
	// `admin/roles/active` route equally rejects.
	'/api/admin/roles/active?search=test',
	'/api/admin/roles/active?search=admin',
	'/api/admin/roles/active?search=',
	"/api/admin/roles/active?search=%27%20OR%201%3D1",
	'/api/admin/roles/active?search=%3Cscript%3E',
	'/api/admin/roles/active?search=%25',
	`/api/admin/roles/active?search=${'x'.repeat(500)}`,

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys.
	'/api/admin/roles/active?userId=anything',
	'/api/admin/roles/active?user_id=anything',
	'/api/admin/roles/active?adminId=anything',
	'/api/admin/roles/active?as=admin',
	'/api/admin/roles/active?asUser=true',
	'/api/admin/roles/active?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/roles/active?token=anything',
	'/api/admin/roles/active?secret=anything',
	'/api/admin/roles/active?api_key=anything',
	'/api/admin/roles/active?authorization=Bearer+anything',
	'/api/admin/roles/active?session=anything',
	'/api/admin/roles/active?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/roles/active?bypass=1',
	'/api/admin/roles/active?admin=1',
	'/api/admin/roles/active?admin=true',
	'/api/admin/roles/active?override=true',
	'/api/admin/roles/active?force=true',

	// `?roleId=` / `?roleName=` — per-row-targeting
	// keys.
	'/api/admin/roles/active?roleId=admin',
	'/api/admin/roles/active?roleName=Administrator',

	// `?from=` / `?to=` / `?since=` / `?until=` —
	// time-range filter keys.
	'/api/admin/roles/active?from=2024-01-01',
	'/api/admin/roles/active?to=2026-12-31',
	'/api/admin/roles/active?since=2024-01-01T00:00:00Z',
	'/api/admin/roles/active?until=2026-12-31T23:59:59Z',
	'/api/admin/roles/active?from=invalid-date',

	// `?refresh=` / `?force=` / `?cache=` — cache-
	// busting keys.
	'/api/admin/roles/active?refresh=1',
	'/api/admin/roles/active?fresh=true',
	'/api/admin/roles/active?cache=bypass',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/roles/active?locale=en',
	'/api/admin/roles/active?locale=fr',
	'/api/admin/roles/active?lang=de',

	// `?includeInactive=` / `?includeDeleted=` /
	// `?withPermissions=` / `?expand=` — payload-shape
	// keys the route does NOT read today; a regression
	// that wires one of these into a new `options`
	// bag for `roleRepository.findActive(...)` would
	// widen the response payload (e.g.
	// `?includeInactive=true` would defeat the
	// route's whole purpose).
	'/api/admin/roles/active?includeInactive=true',
	'/api/admin/roles/active?includeDeleted=true',
	'/api/admin/roles/active?withPermissions=true',
	'/api/admin/roles/active?expand=permissions',
	'/api/admin/roles/active?fields=id,name',

	// Repeated keys.
	'/api/admin/roles/active?page=1&page=2',
	'/api/admin/roles/active?limit=10&limit=20',
	'/api/admin/roles/active?status=active&status=inactive',
	'/api/admin/roles/active?sortBy=name&sortBy=id',
	'/api/admin/roles/active?as=admin&as=user',
	'/api/admin/roles/active?token=foo&token=bar',
	'/api/admin/roles/active?bypass=1&bypass=0',

	// Bogus / typo'd query keys.
	'/api/admin/roles/active?unknown=value',
	'/api/admin/roles/active?foo=bar&baz=qux',
	'/api/admin/roles/active?userId=admin&token=foo&unknown=value&page=1&limit=20&status=active&sortBy=name&sortOrder=asc&foo=bar'
] as const;

test.describe('API: /api/admin/roles/active query-param surface', () => {
	for (const path of ADMIN_ROLES_ACTIVE_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// Every query-param permutation must round-trip to
			// a non-5xx status. This is the loosest envelope
			// that still surfaces a real regression: a 500
			// from `roleRepository.findActive()` throwing
			// would surface here.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/roles/active round-trips to a stable status across query permutations', async ({
		request
	}) => {
		// The route does NOT take a `request` parameter, so
		// every query-param permutation is silently
		// discarded — every walk MUST round-trip to the
		// no-arg baseline status.
		const baseline = await request.get('/api/admin/roles/active');
		const responses = await Promise.all([
			request.get('/api/admin/roles/active?page=1&limit=20&status=active&sortBy=name&sortOrder=asc'),
			request.get('/api/admin/roles/active?page=1&limit=10&sortBy=created_at&sortOrder=desc'),
			request.get(
				'/api/admin/roles/active?userId=admin&token=foo&unknown=value&page=1&limit=20&status=active&sortBy=name&sortOrder=asc&foo=bar'
			)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/active?status=… does not change baseline status', async ({
		request
	}) => {
		// The handler does NOT take `request` and so
		// cannot read `?status=`. A regression that
		// switches the signature to `GET(request)` and
		// starts widening the active-roles filter on
		// `?status=` would change the auth-branch
		// payload — the smoke envelope still holds.
		const baseline = await request.get('/api/admin/roles/active');
		const responses = await Promise.all([
			request.get('/api/admin/roles/active?status=active'),
			request.get('/api/admin/roles/active?status=inactive'),
			request.get('/api/admin/roles/active?status=invalid'),
			request.get('/api/admin/roles/active?status='),
			request.get('/api/admin/roles/active?status=ACTIVE'),
			request.get('/api/admin/roles/active?status=pending'),
			request.get('/api/admin/roles/active?status=archived'),
			request.get('/api/admin/roles/active?status=deleted'),
			request.get('/api/admin/roles/active?status=all')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/active?isAdmin=… does not change baseline status', async ({
		request
	}) => {
		// A regression that reads `?isAdmin=` as a
		// session-fallback for `session.user.isAdmin`
		// would silently grant any anonymous caller
		// admin-level role visibility. Today the route
		// does not read the key.
		const baseline = await request.get('/api/admin/roles/active');
		const responses = await Promise.all([
			request.get('/api/admin/roles/active?isAdmin=true'),
			request.get('/api/admin/roles/active?isAdmin=false'),
			request.get('/api/admin/roles/active?isAdmin=1'),
			request.get('/api/admin/roles/active?isAdmin=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/active?sortBy=… does not change baseline status', async ({
		request
	}) => {
		// The sibling `admin/roles` route accepts
		// `?sortBy=` for `'name'` / `'id'` /
		// `'created_at'`; the `admin/roles/active`
		// route does NOT read the key.
		const baseline = await request.get('/api/admin/roles/active');
		const responses = await Promise.all([
			request.get('/api/admin/roles/active?sortBy=name'),
			request.get('/api/admin/roles/active?sortBy=id'),
			request.get('/api/admin/roles/active?sortBy=created_at'),
			request.get('/api/admin/roles/active?sortBy=permissions'),
			request.get('/api/admin/roles/active?sortBy=isAdmin'),
			request.get('/api/admin/roles/active?sortBy=description'),
			request.get('/api/admin/roles/active?sortBy=invalid'),
			request.get('/api/admin/roles/active?sortBy=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/active?sortOrder=… does not change baseline status', async ({
		request
	}) => {
		// The sibling `admin/roles` route accepts
		// `?sortOrder=` for `'asc'` / `'desc'`; the
		// `admin/roles/active` route does NOT read the
		// key.
		const baseline = await request.get('/api/admin/roles/active');
		const responses = await Promise.all([
			request.get('/api/admin/roles/active?sortOrder=asc'),
			request.get('/api/admin/roles/active?sortOrder=desc'),
			request.get('/api/admin/roles/active?sortOrder=random'),
			request.get('/api/admin/roles/active?sortOrder=invalid'),
			request.get('/api/admin/roles/active?sortOrder=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/active?page=… does not change baseline status', async ({
		request
	}) => {
		// The sibling `admin/roles` route reads `?page=`
		// via the shared `validatePaginationParams(...)`
		// helper. The `admin/roles/active` route does
		// NOT take a `request` parameter, so the
		// pagination keys are silently discarded BEFORE
		// the helper would run. A regression that adds
		// pagination to the active-roles route (e.g. for
		// large directories with hundreds of active
		// roles) would change the baseline behavior;
		// the smoke envelope still holds.
		const baseline = await request.get('/api/admin/roles/active');
		const responses = await Promise.all([
			request.get('/api/admin/roles/active?page=1'),
			request.get('/api/admin/roles/active?page=999'),
			request.get('/api/admin/roles/active?page=invalid'),
			request.get('/api/admin/roles/active?page=-1'),
			request.get('/api/admin/roles/active?limit=10'),
			request.get('/api/admin/roles/active?limit=99999'),
			request.get('/api/admin/roles/active?limit=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/active?userId=… does not change baseline status', async ({
		request
	}) => {
		// The route does not read `?userId=` / `?adminId=` /
		// `?as=` today. A regression that adds one of these
		// as a session-fallback would change the auth-
		// branch behavior — but the smoke envelope still
		// holds.
		const baseline = await request.get('/api/admin/roles/active');
		const responses = await Promise.all([
			request.get('/api/admin/roles/active?userId=admin'),
			request.get('/api/admin/roles/active?user_id=admin'),
			request.get('/api/admin/roles/active?adminId=admin'),
			request.get('/api/admin/roles/active?as=admin'),
			request.get('/api/admin/roles/active?asUser=true'),
			request.get('/api/admin/roles/active?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/active?token=… does not change baseline status', async ({
		request
	}) => {
		// The route does not read `?token=` / `?secret=` /
		// `?api_key=` today. A regression that adds magic-
		// token-based admin bypass would change the auth-
		// branch behavior — but the smoke envelope still
		// holds.
		const baseline = await request.get('/api/admin/roles/active');
		const responses = await Promise.all([
			request.get('/api/admin/roles/active?token=anything'),
			request.get('/api/admin/roles/active?secret=anything'),
			request.get('/api/admin/roles/active?api_key=anything'),
			request.get('/api/admin/roles/active?authorization=Bearer+anything'),
			request.get('/api/admin/roles/active?session=anything'),
			request.get('/api/admin/roles/active?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/active?bypass=… does not change baseline status', async ({
		request
	}) => {
		// The route does not read `?bypass=` / `?admin=` /
		// `?override=` today.
		const baseline = await request.get('/api/admin/roles/active');
		const responses = await Promise.all([
			request.get('/api/admin/roles/active?bypass=1'),
			request.get('/api/admin/roles/active?admin=1'),
			request.get('/api/admin/roles/active?admin=true'),
			request.get('/api/admin/roles/active?override=true'),
			request.get('/api/admin/roles/active?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/active?includeInactive=… does not change baseline status', async ({
		request
	}) => {
		// The route does not read `?includeInactive=` /
		// `?includeDeleted=` / `?withPermissions=` /
		// `?expand=` / `?fields=` today. A regression
		// that wires `?includeInactive=true` into a new
		// `options` bag would defeat the whole purpose
		// of the route (the dropdown / selector UI uses
		// it precisely because it always returns the
		// active subset only). The smoke envelope still
		// holds.
		const baseline = await request.get('/api/admin/roles/active');
		const responses = await Promise.all([
			request.get('/api/admin/roles/active?includeInactive=true'),
			request.get('/api/admin/roles/active?includeDeleted=true'),
			request.get('/api/admin/roles/active?withPermissions=true'),
			request.get('/api/admin/roles/active?expand=permissions'),
			request.get('/api/admin/roles/active?fields=id,name')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/active does not branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types
		// today; every Accept header must round-trip to
		// the same status.
		const baseline = await request.get('/api/admin/roles/active');
		const responses = await Promise.all([
			request.get('/api/admin/roles/active', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/roles/active', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/roles/active', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/roles/active', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/roles/active does not branch on side-channel cookies / headers', async ({
		request
	}) => {
		// A regression that switches the handler to a
		// custom auth resolver that consults
		// `request.cookies` / `request.geo` /
		// `request.ip` would change the auth-branch
		// behavior — the smoke envelope still holds.
		const responses = await Promise.all([
			request.get('/api/admin/roles/active', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/roles/active', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/roles/active', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/roles/active', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/roles/active repeated query keys do not 5xx', async ({ request }) => {
		// The handler does not read any query keys, so
		// repeated keys are doubly meaningless. The
		// route must not crash on any repeated-key
		// permutation.
		const baseline = await request.get('/api/admin/roles/active');
		const responses = await Promise.all([
			request.get('/api/admin/roles/active?page=1&page=2'),
			request.get('/api/admin/roles/active?limit=10&limit=20'),
			request.get('/api/admin/roles/active?status=active&status=inactive'),
			request.get('/api/admin/roles/active?sortBy=name&sortBy=id'),
			request.get('/api/admin/roles/active?as=admin&as=user'),
			request.get('/api/admin/roles/active?token=foo&token=bar'),
			request.get('/api/admin/roles/active?bypass=1&bypass=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
