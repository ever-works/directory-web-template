import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only notifications-listing endpoint served by
 * `apps/web/app/api/admin/notifications/route.ts`.
 *
 * `GET /api/admin/notifications` is the **first** admin-
 * tree route the smoke layer covers that documents a
 * **two-step session gate** — distinct from every other
 * admin-tree route's single-step gate. The handler signature
 * is the **zero-argument** Next 16 form (the route does
 * not take a `NextRequest` argument and reads no
 * `searchParams` at all today). The route applies two
 * distinct checks in order and emits two distinct status /
 * envelope shapes:
 *
 *     export async function GET() {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.id) {
 *           return NextResponse.json(
 *             { success: false, error: 'Unauthorized' },
 *             { status: 401 }
 *           );
 *         }
 *         const isAdmin = session.user.isAdmin;
 *         if (!isAdmin) {
 *           return NextResponse.json(
 *             { success: false, error: 'Forbidden' },
 *             { status: 403 }
 *           );
 *         }
 *         const tenantId = await getTenantId();
 *         if (!tenantId) {
 *           return NextResponse.json(
 *             { success: false, error: 'Tenant not found' },
 *             { status: 403 }
 *           );
 *         }
 *         const userNotifications = await db.select().from(notifications).…;
 *         const unreadCountResult = await db.select({ count: count() }).from(notifications).…;
 *         return NextResponse.json({ success: true, data: {…} });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Internal server error' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The two-step gate's status / envelope contract is the
 * load-bearing invariant this spec pins:
 *
 *   - **Unauthenticated** (no session at all): `auth()`
 *     returns `null` (or a session without a user id);
 *     the route returns 401 with the canonical
 *     `{ success: false, error: 'Unauthorized' }` envelope.
 *     This is the contract every assertion below pins,
 *     because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Authenticated user, missing `isAdmin`** (a session
 *     exists but the user is not admin): the route returns
 *     403 with `{ success: false, error: 'Forbidden' }`.
 *     Out of scope for this spec because the unauth runner
 *     never reaches the second gate.
 *   - **Admin, missing tenant**: `getTenantId()` returns
 *     `null`; the route returns 403 with
 *     `{ success: false, error: 'Tenant not found' }`.
 *     Out of scope for this spec.
 *   - **Admin with tenant**: returns 200 with
 *     `{ success: true, data: { notifications: [...], unreadCount: number } }`
 *     after the two drizzle `db.select(...)` queries
 *     complete. Out of scope for this spec.
 *   - **Internal error**: the catch returns 500 with
 *     `{ success: false, error: 'Internal server error' }`.
 *     Out of scope for this spec because the gate fires
 *     before any repository call on every unauth
 *     invocation.
 *
 * Because the handler signature is **zero-argument**, the
 * route reads zero query params today — every assertion
 * below pins that the unauthenticated GET surface returns
 * a 4xx (specifically 401) deterministically regardless of
 * which keys the caller appends to the URL. A regression
 * that switches the signature to `GET(request: NextRequest)`
 * and starts reading query params before the gate would
 * surface immediately as a status divergence between the
 * no-arg 401 and a parameter-laden non-401 — and that
 * change is exactly what this spec catches.
 *
 * The spec is unique among the admin-tree query-smoke
 * specs in that it pins **both** the 401 status AND the
 * `'Unauthorized'` (not `'Forbidden'`) error message —
 * the two-step gate emits distinct messages depending on
 * which gate fired. A regression that switches the gate
 * order (e.g. checks `isAdmin` before `id`, which would
 * silently bypass the 401 status) would surface here as a
 * status divergence between the expected 401 and the
 * unexpected 403.
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
 * `admin-users-query.spec.ts` smoke specs — all share the
 * same "session-or-admin gated, 401/403 before any
 * service-layer call" posture. The notifications-listing
 * route is unique in that:
 *   1. It uses a **two-step gate** — first
 *      `session?.user?.id` (401 if missing), then
 *      `session.user.isAdmin` (403 if missing) — distinct
 *      from every other admin-tree route's single-step
 *      gate. The `admin/featured-items` route's session-
 *      only gate uses `session?.user?.id` exclusively;
 *      the `admin/categories` / `admin/comments` /
 *      `admin/companies` / `admin/users` routes use
 *      `session?.user?.isAdmin` exclusively. The
 *      notifications route is the only admin-tree route
 *      that requires both gates to pass before reaching
 *      the service call.
 *   2. The 401 envelope carries the bare
 *      `'Unauthorized'` message — distinct from the
 *      admin-gated routes' role-context-specific
 *      `'Unauthorized. Admin access required.'` message.
 *      The unified `success: false` shape with the bare
 *      `'Unauthorized'` is the production-source
 *      convention for routes that distinguish
 *      session-missing (401) from role-missing (403).
 *   3. The 403 envelope carries the bare `'Forbidden'`
 *      message — distinct from the `admin/comments`
 *      route's `'Forbidden'` envelope (which drops the
 *      canonical 401 status entirely) and distinct from
 *      the `admin/categories` route's
 *      `'Unauthorized. Admin access required.'` message
 *      (which folds the 401/403 distinction into a
 *      single 401 status). The notifications route is
 *      the canonical reference for the two-step gate
 *      pattern.
 *   4. The handler signature is `GET()` (zero-argument)
 *      — distinct from every other admin-tree route's
 *      `GET(request: NextRequest)` signature. The zero-
 *      argument signature is the strongest possible
 *      guarantee that the route reads no query params
 *      today; a future contributor who switches to
 *      `GET(request: NextRequest)` to read query params
 *      must update the gate-order discipline in lockstep.
 *   5. The route uses drizzle directly (`db.select().from(notifications)`)
 *      without a repository abstraction — distinct from
 *      the `admin/categories` route's
 *      `categoryRepository.findAllPaginated(...)`
 *      posture. The repository-pattern posture is the
 *      production-source convention for new admin
 *      routes; future contributors who refactor this
 *      route to use a `notificationsRepository` should
 *      preserve the gate-order invariant this spec
 *      pins.
 *   6. The route runs **two** sequential drizzle queries
 *      after the two-step gate (one for the 50-row
 *      paginated listing, one for the unread count) —
 *      distinct from every other admin-tree query-smoke
 *      route's single-query posture. Out of scope for
 *      this spec because both queries fire after the
 *      gate.
 *   7. The route's per-tenant scoping via `getTenantId()`
 *      runs after both auth gates pass — a 403 if the
 *      tenant cannot be resolved. Out of scope for this
 *      spec because the session gate fires before the
 *      tenant resolution on every unauth invocation.
 *   8. The route is paired with the per-id read-receipt
 *      route at
 *      `/api/admin/notifications/[id]/read/route.ts` and
 *      the bulk mark-all-read route at
 *      `/api/admin/notifications/mark-all-read/route.ts`.
 *      The listing route is the canonical entry-point;
 *      the per-id and bulk routes are downstream
 *      mutations.
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this spec
 * adds the deep query-surface walk on top of that.
 */
const ADMIN_NOTIFICATIONS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/notifications',

	// `?page=` / `?limit=` — pagination params a future
	// contributor might add. The route hard-codes the
	// 50-row limit today and reads zero query params.
	'/api/admin/notifications?page=1',
	'/api/admin/notifications?page=2',
	'/api/admin/notifications?limit=10',
	'/api/admin/notifications?limit=100',
	'/api/admin/notifications?page=1&limit=50',
	'/api/admin/notifications?page=invalid',
	'/api/admin/notifications?limit=invalid',
	'/api/admin/notifications?page=-1',
	'/api/admin/notifications?limit=0',

	// `?unreadOnly=` / `?status=` / `?type=` — filter
	// keys for a future contributor. The route does not
	// filter by read-state today (it returns the full
	// 50-row listing plus the unread count separately).
	'/api/admin/notifications?unreadOnly=true',
	'/api/admin/notifications?unreadOnly=false',
	'/api/admin/notifications?status=read',
	'/api/admin/notifications?status=unread',
	'/api/admin/notifications?type=item_approved',
	'/api/admin/notifications?type=comment_received',
	'/api/admin/notifications?type=anything',

	// `?since=` / `?from=` / `?until=` / `?to=` — time-
	// range filter keys for a future contributor.
	'/api/admin/notifications?since=2024-01-01',
	'/api/admin/notifications?from=2024-01-01',
	'/api/admin/notifications?until=2026-12-31',
	'/api/admin/notifications?to=2026-12-31',
	'/api/admin/notifications?since=invalid-date',

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys a future contributor might add. The route
	// reads the user identity from `session.user.id`
	// exclusively today.
	'/api/admin/notifications?userId=anything',
	'/api/admin/notifications?user_id=anything',
	'/api/admin/notifications?adminId=anything',
	'/api/admin/notifications?as=admin',
	'/api/admin/notifications?asUser=true',
	'/api/admin/notifications?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/notifications?token=anything',
	'/api/admin/notifications?secret=anything',
	'/api/admin/notifications?api_key=anything',
	'/api/admin/notifications?authorization=Bearer+anything',
	'/api/admin/notifications?session=anything',
	'/api/admin/notifications?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/notifications?bypass=1',
	'/api/admin/notifications?admin=1',
	'/api/admin/notifications?admin=true',
	'/api/admin/notifications?override=true',
	'/api/admin/notifications?force=true',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-
	// tenancy keys. The route resolves tenant per-call
	// via `getTenantId()` after both auth gates pass.
	'/api/admin/notifications?tenant=acme',
	'/api/admin/notifications?tenantId=42',
	'/api/admin/notifications?org=ever-works',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys for a future contributor.
	'/api/admin/notifications?fields=id',
	'/api/admin/notifications?fields=id,title,message',
	'/api/admin/notifications?select=title',
	'/api/admin/notifications?include=user',

	// `?refresh=` / `?force=` / `?cache=` — cache-busting
	// keys.
	'/api/admin/notifications?refresh=1',
	'/api/admin/notifications?fresh=true',
	'/api/admin/notifications?cache=bypass',
	'/api/admin/notifications?nocache=1',

	// `?orderBy=` / `?sortBy=` — order-targeting keys.
	// The route hard-codes `desc(notifications.createdAt)`
	// today.
	'/api/admin/notifications?orderBy=createdAt',
	'/api/admin/notifications?orderBy=updatedAt',
	'/api/admin/notifications?sortBy=type',
	'/api/admin/notifications?sortOrder=asc',
	'/api/admin/notifications?sortOrder=desc',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/notifications?locale=en',
	'/api/admin/notifications?locale=fr',
	'/api/admin/notifications?lang=de',

	// Repeated keys.
	'/api/admin/notifications?page=1&page=2',
	'/api/admin/notifications?status=read&status=unread',

	// Bogus / typo'd query keys.
	'/api/admin/notifications?unknown=value',
	'/api/admin/notifications?foo=bar&baz=qux',
	'/api/admin/notifications?userId=admin&token=foo&unknown=value&page=1&unreadOnly=true&foo=bar'
] as const;

test.describe('API: /api/admin/notifications query-param surface', () => {
	for (const path of ADMIN_NOTIFICATIONS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's two-step gate fires before any
			// repository call. The first gate (`session?.user?.id`)
			// returns 401 on the unauth branch deterministically.
			// There is no 5xx branch reachable on the
			// unauthenticated GET surface because the catch can
			// only fire after both gates have already let the
			// call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/notifications returns a 401 (NOT 403) on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the FIRST gate
		// (`session?.user?.id`) must fire before the
		// second gate (`session.user.isAdmin`). The status
		// must be exactly 401 (not 403). A regression that
		// reorders the gates — checking `isAdmin` first —
		// would silently bypass the 401 status because
		// `session?.user?.isAdmin` on a `null` session
		// resolves to `undefined`, which the second gate's
		// negation would catch as "not admin", returning
		// 403 instead of 401. This assertion catches that
		// reorder regression immediately.
		const response = await request.get('/api/admin/notifications');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized'
		});
	});

	test('GET /api/admin/notifications has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads zero query params today (the
		// handler signature is `GET()`, zero-argument), so
		// the response status must be invariant to any
		// combination of known and unknown keys. A
		// regression that switches the signature to
		// `GET(request: NextRequest)` and reads query
		// params before the gate would surface here as a
		// status divergence between the no-arg baseline
		// and the parameterised variant.
		const baseline = await request.get('/api/admin/notifications');
		const parameterised = await request.get(
			'/api/admin/notifications?page=1&limit=50&unreadOnly=true&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/notifications?userId=… does NOT bypass the session gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven user resolution would
		// change the unauth branch from "always 401" to
		// "200 if ?userId=… is present" — silently
		// granting any anonymous caller user-level
		// notifications visibility. This assertion catches
		// that change immediately.
		const baseline = await request.get('/api/admin/notifications');
		const responses = await Promise.all([
			request.get('/api/admin/notifications?userId=admin'),
			request.get('/api/admin/notifications?user_id=admin'),
			request.get('/api/admin/notifications?adminId=admin'),
			request.get('/api/admin/notifications?as=admin'),
			request.get('/api/admin/notifications?asUser=true'),
			request.get('/api/admin/notifications?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/notifications?token=… does NOT bypass the session gate', async ({
		request
	}) => {
		// A future contributor who adds magic-token-based
		// session bypass — e.g. a `?token=…` shortcut for
		// an internal cron job that pre-warms the
		// notifications, a `?secret=…` shortcut for a
		// staging-environment integration test, or a
		// `?authorization=Bearer …` header-mirroring key —
		// would change the unauth branch from "always 401"
		// to "200 if the right token is present". This
		// assertion catches that change immediately.
		const baseline = await request.get('/api/admin/notifications');
		const responses = await Promise.all([
			request.get('/api/admin/notifications?token=anything'),
			request.get('/api/admin/notifications?secret=anything'),
			request.get('/api/admin/notifications?api_key=anything'),
			request.get('/api/admin/notifications?authorization=Bearer+anything'),
			request.get('/api/admin/notifications?session=anything'),
			request.get('/api/admin/notifications?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/notifications?bypass=… does NOT bypass the session gate', async ({
		request
	}) => {
		// A future contributor who adds a `?bypass=…`,
		// `?admin=…`, or `?override=…` admin-override key
		// would change the unauth branch from "always 401"
		// to "200 if the right key is present". This
		// assertion catches that change immediately.
		const baseline = await request.get('/api/admin/notifications');
		const responses = await Promise.all([
			request.get('/api/admin/notifications?bypass=1'),
			request.get('/api/admin/notifications?admin=1'),
			request.get('/api/admin/notifications?admin=true'),
			request.get('/api/admin/notifications?override=true'),
			request.get('/api/admin/notifications?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/notifications?unreadOnly=… does NOT introduce a read-state-filter bypass', async ({
		request
	}) => {
		// The route returns the full 50-row listing plus
		// the unread count separately today. A future
		// contributor who adds a read-state filter
		// (`?unreadOnly=true` / `?status=read|unread`)
		// must not bypass the two-step gate. The unauth
		// branch's status must be invariant to the read-
		// state keys.
		const baseline = await request.get('/api/admin/notifications');
		const responses = await Promise.all([
			request.get('/api/admin/notifications?unreadOnly=true'),
			request.get('/api/admin/notifications?unreadOnly=false'),
			request.get('/api/admin/notifications?status=read'),
			request.get('/api/admin/notifications?status=unread')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/notifications?type=… does NOT introduce a type-filter bypass', async ({
		request
	}) => {
		// The route does not filter by notification type
		// today. A future contributor who adds a `?type=…`
		// filter must not bypass the two-step gate.
		const baseline = await request.get('/api/admin/notifications');
		const responses = await Promise.all([
			request.get('/api/admin/notifications?type=item_approved'),
			request.get('/api/admin/notifications?type=comment_received'),
			request.get('/api/admin/notifications?type=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/notifications?since=…&until=… does NOT introduce a time-range-filter bypass', async ({
		request
	}) => {
		// The route does not filter by time today. A
		// future contributor who adds time-range filter
		// keys (`?since=…` / `?from=…` / `?until=…` /
		// `?to=…`) must not bypass the two-step gate.
		const baseline = await request.get('/api/admin/notifications');
		const responses = await Promise.all([
			request.get('/api/admin/notifications?since=2024-01-01'),
			request.get('/api/admin/notifications?from=2024-01-01'),
			request.get('/api/admin/notifications?until=2026-12-31'),
			request.get('/api/admin/notifications?to=2026-12-31'),
			request.get('/api/admin/notifications?since=invalid-date')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/notifications keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth
		// branch. The shape guarantees the route's two-
		// step gate fires before any branching on potential
		// future query schemas.
		const responses = await Promise.all([
			request.get('/api/admin/notifications'),
			request.get('/api/admin/notifications?page=1&limit=50'),
			request.get(
				'/api/admin/notifications?userId=admin&token=foo&page=invalid&unreadOnly=true&type=anything&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/notifications does NOT branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types
		// today; every Accept header must round-trip to
		// the same status on the unauth branch.
		const baseline = await request.get('/api/admin/notifications');
		const responses = await Promise.all([
			request.get('/api/admin/notifications', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/notifications', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/notifications', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/notifications', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/notifications repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		// `searchParams.get(name)` returns the first value
		// of any repeated key, so repetition is irrelevant
		// on every branch. The unauth branch must return
		// 401 regardless of whether the repeated value is
		// valid or invalid.
		const baseline = await request.get('/api/admin/notifications');
		const responses = await Promise.all([
			request.get('/api/admin/notifications?page=1&page=2'),
			request.get('/api/admin/notifications?status=read&status=unread'),
			request.get('/api/admin/notifications?unreadOnly=true&unreadOnly=false')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/notifications keeps a zero-argument handler signature stable', async ({
		request
	}) => {
		// The route's handler signature is `GET()` —
		// zero-argument, no `NextRequest` parameter at
		// all today. The zero-argument signature is the
		// strongest possible guarantee that the route
		// reads no query params, no cookies (other than
		// what `auth()` reads internally), no headers
		// (other than what `auth()` reads internally), and
		// has no Next-specific request surface. A future
		// regression that switches to
		// `GET(request: NextRequest)` would silently open
		// up the request.cookies / request.geo / request.ip
		// surface — the unauth branch must stay invariant
		// under any of those side channels. This assertion
		// pins the zero-argument contract by sweeping a
		// few known-bogus cookie / header values.
		const responses = await Promise.all([
			request.get('/api/admin/notifications', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/notifications', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/notifications', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/notifications', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/notifications response message does NOT echo the role-context-specific suffix', async ({
		request
	}) => {
		// The 401 envelope carries the bare
		// `'Unauthorized'` message — distinct from the
		// admin-gated routes' role-context-specific
		// `'Unauthorized. Admin access required.'`
		// message. A regression that switches to the
		// role-context-specific suffix would surface here
		// as a body-divergence assertion failure.
		const response = await request.get('/api/admin/notifications');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Unauthorized. Admin access required.');
		expect(body.error).not.toBe('Forbidden');
	});
});
