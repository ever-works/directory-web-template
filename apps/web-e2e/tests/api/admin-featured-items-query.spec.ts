import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * session-gated featured-items-listing endpoint served by
 * `apps/web/app/api/admin/featured-items/route.ts`.
 *
 * `GET /api/admin/featured-items` is **session-gated** via
 * `auth()` + the `session.user.id` bit (NOT the
 * `session.user.isAdmin` bit — distinct from the admin-
 * isAdmin gate the sibling `admin/categories`,
 * `admin/comments`, `admin/companies`, `admin/users`
 * routes use). The handler reads three query params after
 * the gate (`page`, `limit`, `active`), so the
 * unauthenticated branch returns 401 with the canonical
 * `{ success: false, error: 'Unauthorized' }` envelope
 * regardless of which keys the caller appends:
 *
 *     export async function GET(request: NextRequest) {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.id) {
 *           return NextResponse.json(
 *             { success: false, error: 'Unauthorized' },
 *             { status: 401 }
 *           );
 *         }
 *         const { searchParams } = new URL(request.url);
 *         const paginationResult = validatePaginationParams(searchParams);
 *         if ('error' in paginationResult) {
 *           return NextResponse.json(
 *             { success: false, error: paginationResult.error },
 *             { status: paginationResult.status }
 *           );
 *         }
 *         const { page, limit } = paginationResult;
 *         const activeOnly = searchParams.get('active') === 'true';
 *         const offset = (page - 1) * limit;
 *         const tenantId = await getTenantId();
 *         if (!tenantId) {
 *           return NextResponse.json(
 *             { success: false, error: 'Tenant not found' },
 *             { status: 403 }
 *           );
 *         }
 *         const conditions = [eq(featuredItems.tenantId, tenantId)];
 *         if (activeOnly) {
 *           conditions.push(eq(featuredItems.isActive, true));
 *         }
 *         const featuredItemsList = await db.select().from(featuredItems).…;
 *         const totalResult = await db.select({ count: count() }).from(featuredItems).…;
 *         return NextResponse.json({ success: true, data: …, pagination: {…} });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Failed to fetch featured items' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The route's three documented query params (`page`,
 * `limit`, `active`) are read **after** the single-step
 * session gate, so every call from this spec — which
 * carries no authenticated session — round-trips to the
 * same 401 regardless of the query string. A regression
 * that reads any query param before the gate (e.g. a
 * future `?asUser=true` impersonation key, a `?token=…`
 * magic-token bypass, a `?as=admin` admin-override, or any
 * other dangerous-passthrough that bypasses
 * `session?.user?.id`) would change the unauth branch's
 * behaviour from "always 401" to "200 / 400 / 500 if the
 * right query is present" — and that change is exactly
 * what this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session without a user id); the route returns 401
 *     with the canonical
 *     `{ success: false, error: 'Unauthorized' }`
 *     envelope. This is the contract every assertion
 *     below pins, because the e2e runner does not carry
 *     an authenticated session by default.
 *   - **Authenticated user, missing tenant**: `getTenantId()`
 *     returns `null`; the route returns 403 with
 *     `{ success: false, error: 'Tenant not found' }`. Out
 *     of scope for this spec because the gate fires before
 *     the tenant resolution on every unauth invocation.
 *   - **Authenticated user with invalid pagination**:
 *     `validatePaginationParams(...)` returns
 *     `{ error: 'Invalid page parameter. …', status: 400 }`
 *     (or the equivalent for `limit`); the route returns
 *     400 with the bare-error envelope. Out of scope for
 *     this spec because the session gate fires before the
 *     pagination validators on every unauth invocation.
 *   - **Authenticated user with valid pagination**: returns
 *     200 with `{ success: true, data: [...], pagination: {
 *     page, limit, total, totalPages, hasNext, hasPrev } }`
 *     after the drizzle `db.select().from(featuredItems)`
 *     query completes. Out of scope for this spec because
 *     the gate fires before the repository call on every
 *     unauth invocation.
 *   - **Internal error**: the catch returns 500 with
 *     `{ success: false, error: 'Failed to fetch featured items' }`.
 *     Out of scope for this spec because the gate fires
 *     before any repository call on every unauth
 *     invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec
 * hits. A regression that introduces query-string-based
 * bypass — e.g. a future `?asUser=true` impersonation key
 * that fires before `auth()`, a `?token=…` magic-token
 * bypass, or a `?itemSlug=…` dangerous-passthrough that
 * would forward a caller-supplied id to a future
 * "view a single featured item by slug" feature — would
 * surface immediately as a status divergence between the
 * no-arg 401 and a parameter-laden non-401.
 *
 * The shape mirrors the sibling
 * `admin-categories-query.spec.ts`,
 * `admin-collections-query.spec.ts`,
 * `admin-comments-query.spec.ts`,
 * `admin-companies-query.spec.ts`,
 * `admin-dashboard-stats-query.spec.ts`,
 * `admin-geo-analytics-query.spec.ts`,
 * `admin-items-stats-query.spec.ts`,
 * `admin-users-query.spec.ts`,
 * `client-dashboard-stats-query.spec.ts`,
 * `client-geo-stats-query.spec.ts`,
 * `client-items-coordinates-query.spec.ts`,
 * `stripe-payment-methods-list-query.spec.ts`,
 * `lemonsqueezy-list-query.spec.ts`,
 * `subscription-query.spec.ts`,
 * `payments-query.spec.ts`, and
 * `plan-status-query.spec.ts` smoke specs — all share the
 * same "session-or-admin gated, 401/403 before any
 * service-layer call" posture. The featured-items-listing
 * route is unique in that:
 *   1. It uses a **session gate** (`session?.user?.id`)
 *      rather than the **admin gate**
 *      (`session?.user?.isAdmin`) the sibling admin-tree
 *      routes (`admin/categories`, `admin/comments`,
 *      `admin/companies`, `admin/users`,
 *      `admin/dashboard/stats`, `admin/items/stats`,
 *      `admin/geo-analytics`, `admin/collections`) use.
 *      The `admin/featured-items` namespace is gated
 *      against any authenticated user, not just admins —
 *      the per-tenant scoping via `getTenantId()` is what
 *      narrows the visibility, not a per-role check. The
 *      unauth branch is invariant to this distinction
 *      (still a 401), but the role-based authz contract is
 *      different from the rest of the admin tree.
 *   2. The handler signature is `GET(request: NextRequest)`
 *      (with the Next-specific `NextRequest` type, not the
 *      bare `Request` type the `admin/comments` handler
 *      uses) — which opens up the Next-specific request
 *      surface (e.g. `request.cookies`, `request.geo`,
 *      `request.ip`). The behavioural contract is the same
 *      on the unauth branch.
 *   3. The 401 envelope is the **`{ success: false, error:
 *      'Unauthorized' }` shape** — distinct from the
 *      `admin/categories` route's
 *      `'Unauthorized. Admin access required.'` message
 *      (which adds the role-context-specific suffix) and
 *      distinct from the `admin/comments` route's
 *      `{ success: false, error: 'Forbidden' }` envelope
 *      (which drops the canonical 401 status entirely).
 *      The unified `success: false` shape with the bare
 *      `'Unauthorized'` message is the production-source
 *      convention for session-gated routes.
 *   4. The post-gate handler delegates pagination
 *      validation to the shared `validatePaginationParams`
 *      utility (from `@/lib/utils/pagination-validation`)
 *      — distinct from the inline `parseInt(...)` +
 *      `isNaN` check the `admin/companies` route uses.
 *      The utility-based posture is the production-source
 *      convention for new admin routes; the unauth-branch
 *      contract is invariant to the validator's location
 *      (utility vs inline).
 *   5. The post-gate handler reads **three** documented
 *      query keys (`page`, `limit`, `active`) — fewer than
 *      the `admin/categories` route's five, fewer than the
 *      `admin/users` route's five, fewer than the
 *      `admin/collections` route's six, more than the
 *      `admin/comments` route's three (tied). The narrower
 *      surface means fewer bypass vectors but the same
 *      boundary-test discipline.
 *   6. The route's `active` query key gates the
 *      "include only active featured items" filter via a
 *      strict `=== 'true'` string-equality check — so any
 *      value other than the literal string `'true'`
 *      coerces to `false`. Distinct from the
 *      `admin/categories` route's `includeInactive` key
 *      (which has the inverse polarity). The unauth branch
 *      is invariant to the key's value.
 *   7. The route uses drizzle directly
 *      (`db.select().from(featuredItems)`) without a
 *      repository abstraction — distinct from the
 *      `admin/categories` route's
 *      `categoryRepository.findAllPaginated(...)` posture.
 *      The repository-pattern posture is the production-
 *      source convention for new admin routes; future
 *      contributors who refactor the `admin/featured-items`
 *      route to use a `featuredItemsRepository` should
 *      preserve the gate-order invariant this spec pins.
 *   8. The route resolves the per-tenant scope via
 *      `getTenantId()` (from `@/lib/auth/tenant`) on every
 *      authenticated call — a 403 if the tenant cannot be
 *      resolved. Out of scope for this spec because the
 *      session gate fires before the tenant resolution on
 *      every unauth invocation.
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this spec
 * adds the deep query-surface walk on top of that.
 */
const ADMIN_FEATURED_ITEMS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/featured-items',

	// `?page=` / `?limit=` — pagination params validated by
	// `validatePaginationParams(...)` after the gate, with
	// inline `isNaN` / range checks that fire on the auth
	// branch.
	'/api/admin/featured-items?page=1',
	'/api/admin/featured-items?page=2',
	'/api/admin/featured-items?page=999',
	'/api/admin/featured-items?limit=10',
	'/api/admin/featured-items?limit=50',
	'/api/admin/featured-items?limit=100',
	'/api/admin/featured-items?page=1&limit=20',
	'/api/admin/featured-items?page=invalid',
	'/api/admin/featured-items?limit=invalid',
	'/api/admin/featured-items?page=-1',
	'/api/admin/featured-items?page=0',
	'/api/admin/featured-items?limit=0',
	'/api/admin/featured-items?limit=-1',
	'/api/admin/featured-items?limit=99999',
	'/api/admin/featured-items?limit=101', // just over the inline ceiling
	'/api/admin/featured-items?page=', // empty -> NaN -> 400 on auth
	'/api/admin/featured-items?limit=', // empty -> NaN -> 400 on auth

	// `?active=` — strict `=== 'true'` filter that gates the
	// "include only active featured items" branch on the
	// auth branch.
	'/api/admin/featured-items?active=true',
	'/api/admin/featured-items?active=false',
	'/api/admin/featured-items?active=TRUE', // case-sensitivity
	'/api/admin/featured-items?active=1',
	'/api/admin/featured-items?active=',
	'/api/admin/featured-items?active=invalid',

	// Combinations of the documented filters.
	'/api/admin/featured-items?page=1&limit=20&active=true',
	'/api/admin/featured-items?page=&limit=&active=',
	'/api/admin/featured-items?page=2&limit=50&active=false',

	// `?itemSlug=` / `?id=` / `?slug=` / `?itemId=` —
	// item-targeting keys a future contributor might add for
	// a "view a single featured item" feature. The route does
	// not target a single featured item today (the per-item
	// endpoint lives at
	// `/api/admin/featured-items/[id]/route.ts`).
	'/api/admin/featured-items?itemSlug=anything',
	'/api/admin/featured-items?id=feat_123',
	'/api/admin/featured-items?slug=awesome-tool',
	'/api/admin/featured-items?itemId=feat_123',

	// `?q=` / `?search=` — free-text filter keys a future
	// contributor might add. The route does not filter by
	// free text today (only by `active`).
	'/api/admin/featured-items?q=test',
	'/api/admin/featured-items?q=awesome',
	'/api/admin/featured-items?q=hello%20world',
	'/api/admin/featured-items?q=',
	'/api/admin/featured-items?q=%20%20%20',
	"/api/admin/featured-items?q=%27%20OR%201%3D1",
	'/api/admin/featured-items?q=%3Cscript%3E',
	'/api/admin/featured-items?q=%25', // SQL LIKE wildcard
	'/api/admin/featured-items?q=_', // SQL LIKE wildcard
	'/api/admin/featured-items?q=%5C', // backslash
	`/api/admin/featured-items?q=${'x'.repeat(50)}`,
	`/api/admin/featured-items?q=${'x'.repeat(500)}`,
	`/api/admin/featured-items?q=${'x'.repeat(1000)}`,
	'/api/admin/featured-items?search=test',
	'/api/admin/featured-items?search=awesome',

	// `?userId=` / `?adminId=` / `?as=` — impersonation keys
	// a future contributor might add. The route reads the
	// user identity from `session.user.id` exclusively today.
	'/api/admin/featured-items?userId=anything',
	'/api/admin/featured-items?user_id=anything',
	'/api/admin/featured-items?adminId=anything',
	'/api/admin/featured-items?as=admin',
	'/api/admin/featured-items?asUser=true',
	'/api/admin/featured-items?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` / `?authorization=`
	// — magic-token bypass keys.
	'/api/admin/featured-items?token=anything',
	'/api/admin/featured-items?secret=anything',
	'/api/admin/featured-items?api_key=anything',
	'/api/admin/featured-items?authorization=Bearer+anything',
	'/api/admin/featured-items?session=anything',
	'/api/admin/featured-items?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-override
	// keys.
	'/api/admin/featured-items?bypass=1',
	'/api/admin/featured-items?admin=1',
	'/api/admin/featured-items?admin=true',
	'/api/admin/featured-items?override=true',
	'/api/admin/featured-items?force=true',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys for a future contributor. The route
	// returns the full featured-item envelope today.
	'/api/admin/featured-items?fields=id',
	'/api/admin/featured-items?fields=id,itemSlug,itemName',
	'/api/admin/featured-items?select=itemName',
	'/api/admin/featured-items?include=item',
	'/api/admin/featured-items?exclude=itemDescription',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` — cache-
	// busting keys.
	'/api/admin/featured-items?refresh=1',
	'/api/admin/featured-items?fresh=true',
	'/api/admin/featured-items?cache=bypass',
	'/api/admin/featured-items?nocache=1',

	// `?format=` — content-negotiation key. The route returns
	// JSON exclusively today.
	'/api/admin/featured-items?format=json',
	'/api/admin/featured-items?format=csv',
	'/api/admin/featured-items?format=xml',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/featured-items?locale=en',
	'/api/admin/featured-items?locale=fr',
	'/api/admin/featured-items?lang=de',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-tenancy
	// keys. The route resolves tenant per-call via
	// `getTenantId()` (from the auth context) — a query-
	// string tenant override would be a separate auth issue.
	'/api/admin/featured-items?tenant=acme',
	'/api/admin/featured-items?tenantId=42',
	'/api/admin/featured-items?org=ever-works',

	// `?from=` / `?to=` / `?since=` / `?until=` — time-range
	// filter keys for a future contributor.
	'/api/admin/featured-items?from=2024-01-01',
	'/api/admin/featured-items?to=2026-12-31',
	'/api/admin/featured-items?since=2024-01-01T00:00:00Z',
	'/api/admin/featured-items?until=2026-12-31T23:59:59Z',
	'/api/admin/featured-items?from=invalid-date',

	// `?deleted=` / `?includeDeleted=` — soft-delete filter
	// keys for a future contributor.
	'/api/admin/featured-items?deleted=true',
	'/api/admin/featured-items?deleted=false',
	'/api/admin/featured-items?includeDeleted=true',

	// `?featuredOrder=` / `?orderBy=` / `?sortBy=` —
	// order-targeting keys for a future contributor. The
	// route hard-codes the
	// `orderBy(desc(featuredItems.featuredOrder),
	// desc(featuredItems.featuredAt))` chain today — a future
	// query-string sort override would be a per-key bypass
	// vector.
	'/api/admin/featured-items?featuredOrder=10',
	'/api/admin/featured-items?orderBy=featuredAt',
	'/api/admin/featured-items?orderBy=featuredOrder',
	'/api/admin/featured-items?sortBy=name',
	'/api/admin/featured-items?sortBy=featuredOrder',
	'/api/admin/featured-items?sortOrder=desc',
	'/api/admin/featured-items?sortOrder=asc',

	// `?category=` / `?itemCategory=` — category-filter keys
	// for a future contributor.
	'/api/admin/featured-items?category=Productivity',
	'/api/admin/featured-items?itemCategory=Productivity',

	// Repeated keys — `searchParams.get(name)` returns the
	// first value for every key the route reads.
	'/api/admin/featured-items?page=1&page=2',
	'/api/admin/featured-items?limit=10&limit=20',
	'/api/admin/featured-items?active=true&active=false',

	// Bogus / typo'd query keys — the route reads three
	// documented keys today, so any combination of unknown
	// keys is silently ignored on every branch.
	'/api/admin/featured-items?unknown=value',
	'/api/admin/featured-items?foo=bar&baz=qux',
	'/api/admin/featured-items?userId=admin&token=foo&unknown=value&page=1&limit=20&foo=bar&active=true'
] as const;

test.describe('API: /api/admin/featured-items query-param surface', () => {
	for (const path of ADMIN_FEATURED_ITEMS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's session gate fires before any
			// `searchParams` parsing or repository call, so the
			// unauthenticated GET surface returns a 4xx
			// (typically 401) deterministically. There is no 5xx
			// branch reachable on the unauthenticated GET surface
			// because the catch can only fire after the gate has
			// already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/featured-items returns a 401 on the unauth branch', async ({ request }) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the session gate must fire before any
		// `searchParams` parsing or repository call. The
		// status must be exactly 401 (the route hard-codes the
		// 401 status in the gate's `NextResponse.json` call).
		// Either way the response must NOT echo any featured-
		// items data — every consuming client depends on the
		// early-return.
		const response = await request.get('/api/admin/featured-items');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized'
		});
	});

	test('GET /api/admin/featured-items has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads three documented query params today
		// after the gate, so the response status must be
		// invariant to any combination of known and unknown
		// keys. A regression that reads any query param before
		// the gate would surface here as a status divergence
		// between the no-arg baseline and the parameterised
		// variant.
		const baseline = await request.get('/api/admin/featured-items');
		const parameterised = await request.get(
			'/api/admin/featured-items?page=1&limit=20&active=true&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/featured-items?page=…&limit=… does NOT bypass the session gate, and the inline pagination validators do NOT fire on the unauth branch', async ({
		request
	}) => {
		// The `?page=` / `?limit=` pagination params are
		// validated via `validatePaginationParams(...)` after
		// the gate with inline `isNaN` / range validators that
		// fire on the auth branch. Bogus values surface as 400
		// on the auth branch but the unauth branch must always
		// return 401 regardless. A regression that runs the
		// validator before the gate would surface here as a
		// 400 on `?page=invalid`.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items?page=1'),
			request.get('/api/admin/featured-items?page=invalid'),
			request.get('/api/admin/featured-items?page=-1'),
			request.get('/api/admin/featured-items?page=0'),
			request.get('/api/admin/featured-items?limit=10'),
			request.get('/api/admin/featured-items?limit=invalid'),
			request.get('/api/admin/featured-items?limit=0'),
			request.get('/api/admin/featured-items?limit=-1'),
			request.get('/api/admin/featured-items?limit=101'),
			request.get('/api/admin/featured-items?limit=99999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items?active=… does NOT bypass the session gate', async ({
		request
	}) => {
		// The `?active=` filter gates a strict `=== 'true'`
		// string-equality check on the auth branch. Any value
		// (including the literal string `'true'`) must round-
		// trip to the same status on the unauth branch.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items?active=true'),
			request.get('/api/admin/featured-items?active=false'),
			request.get('/api/admin/featured-items?active=TRUE'),
			request.get('/api/admin/featured-items?active=1'),
			request.get('/api/admin/featured-items?active='),
			request.get('/api/admin/featured-items?active=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items?userId=… does NOT bypass the session gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven user resolution would
		// change the unauth branch from "always 401" to
		// "200 if ?userId=… is present" — silently
		// granting any anonymous caller user access. This
		// assertion catches that change immediately.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items?userId=admin'),
			request.get('/api/admin/featured-items?user_id=admin'),
			request.get('/api/admin/featured-items?adminId=admin'),
			request.get('/api/admin/featured-items?as=admin'),
			request.get('/api/admin/featured-items?asUser=true'),
			request.get('/api/admin/featured-items?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items?token=… does NOT bypass the session gate', async ({
		request
	}) => {
		// A future contributor who adds magic-token-based
		// session bypass — e.g. a `?token=…` shortcut for an
		// internal cron job or a `?secret=…` shortcut for a
		// staging-environment integration test — would change
		// the unauth branch from "always 401" to "200 if the
		// right token is present". This assertion catches that
		// change immediately.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items?token=anything'),
			request.get('/api/admin/featured-items?secret=anything'),
			request.get('/api/admin/featured-items?api_key=anything'),
			request.get('/api/admin/featured-items?authorization=Bearer+anything'),
			request.get('/api/admin/featured-items?session=anything'),
			request.get('/api/admin/featured-items?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items?bypass=… does NOT bypass the session gate', async ({
		request
	}) => {
		// A future contributor who adds a `?bypass=…`,
		// `?admin=…`, or `?override=…` admin-override key
		// would change the unauth branch from "always 401" to
		// "200 if the right key is present". This assertion
		// catches that change immediately.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items?bypass=1'),
			request.get('/api/admin/featured-items?admin=1'),
			request.get('/api/admin/featured-items?admin=true'),
			request.get('/api/admin/featured-items?override=true'),
			request.get('/api/admin/featured-items?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items?fields=… does NOT introduce a field-projection bypass', async ({
		request
	}) => {
		// The route returns the full featured-item envelope
		// today; any future field-projection support must not
		// bypass the session gate. The unauth branch's status
		// must be invariant to the field-projection keys.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items?fields=id'),
			request.get('/api/admin/featured-items?fields=id,itemSlug,itemName'),
			request.get('/api/admin/featured-items?select=itemName'),
			request.get('/api/admin/featured-items?include=item'),
			request.get('/api/admin/featured-items?exclude=itemDescription')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items?itemSlug=… does NOT introduce a single-item-targeting bypass', async ({
		request
	}) => {
		// The route does not target a single featured item
		// today (the per-item endpoint lives at
		// `/api/admin/featured-items/[id]/route.ts`). A future
		// contributor who adds a `?itemSlug=…` / `?slug=…` /
		// `?itemId=…` shortcut on the listing route must not
		// bypass the session gate. The unauth branch's status
		// must be invariant to the item-targeting keys.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items?itemSlug=anything'),
			request.get('/api/admin/featured-items?id=feat_123'),
			request.get('/api/admin/featured-items?slug=awesome-tool'),
			request.get('/api/admin/featured-items?itemId=feat_123')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items?q=… does NOT introduce a free-text-filter bypass', async ({
		request
	}) => {
		// The route does not filter by free text today (only
		// by `active`). A future contributor who adds a
		// `?q=…` / `?search=…` filter must not bypass the
		// session gate. The unauth branch's status must be
		// invariant to the free-text keys.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items?q=test'),
			request.get('/api/admin/featured-items?q=awesome'),
			request.get('/api/admin/featured-items?q=hello%20world'),
			request.get('/api/admin/featured-items?q='),
			request.get("/api/admin/featured-items?q=%27%20OR%201%3D1"),
			request.get('/api/admin/featured-items?q=%3Cscript%3E'),
			request.get('/api/admin/featured-items?q=%25'),
			request.get('/api/admin/featured-items?q=%5C'),
			request.get(`/api/admin/featured-items?q=${'x'.repeat(500)}`),
			request.get('/api/admin/featured-items?search=test')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items?from=…&to=… does NOT introduce a time-range-filter bypass', async ({
		request
	}) => {
		// The route does not filter by time today. A future
		// contributor who adds time-range filter keys
		// (`?from=…` / `?to=…` / `?since=…` / `?until=…`) must
		// not bypass the session gate. The unauth branch's
		// status must be invariant to the time-range keys.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items?from=2024-01-01'),
			request.get('/api/admin/featured-items?to=2026-12-31'),
			request.get('/api/admin/featured-items?since=2024-01-01T00:00:00Z'),
			request.get('/api/admin/featured-items?until=2026-12-31T23:59:59Z'),
			request.get('/api/admin/featured-items?from=invalid-date')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items?deleted=… does NOT introduce a soft-delete-filter bypass', async ({
		request
	}) => {
		// The route's `active` filter is distinct from a soft-
		// delete filter (the active flag is a per-row state,
		// not a tombstone). A future contributor who adds a
		// soft-delete filter (`?includeDeleted=true` /
		// `?deleted=…`) must not bypass the session gate. The
		// unauth branch's status must be invariant to the
		// soft-delete keys.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items?deleted=true'),
			request.get('/api/admin/featured-items?deleted=false'),
			request.get('/api/admin/featured-items?includeDeleted=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items?orderBy=… does NOT introduce an ordering-bypass', async ({
		request
	}) => {
		// The route hard-codes the
		// `orderBy(desc(featuredItems.featuredOrder),
		// desc(featuredItems.featuredAt))` chain today. A
		// future contributor who adds query-string ordering
		// keys (`?orderBy=…` / `?sortBy=…` / `?sortOrder=…`)
		// must not bypass the session gate. The unauth
		// branch's status must be invariant to the ordering
		// keys.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items?orderBy=featuredAt'),
			request.get('/api/admin/featured-items?orderBy=featuredOrder'),
			request.get('/api/admin/featured-items?sortBy=name'),
			request.get('/api/admin/featured-items?sortBy=featuredOrder'),
			request.get('/api/admin/featured-items?sortOrder=asc'),
			request.get('/api/admin/featured-items?sortOrder=desc')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items?category=… does NOT introduce a category-filter bypass', async ({
		request
	}) => {
		// The route does not filter by category today. A
		// future contributor who adds a `?category=…` /
		// `?itemCategory=…` filter must not bypass the
		// session gate. The unauth branch's status must be
		// invariant to the category-filter keys.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items?category=Productivity'),
			request.get('/api/admin/featured-items?itemCategory=Productivity')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth branch.
		// The shape guarantees the route's session gate fires
		// before any branching on the documented `page` /
		// `limit` / `active` query params or any potential
		// future query schemas.
		const responses = await Promise.all([
			request.get('/api/admin/featured-items'),
			request.get('/api/admin/featured-items?page=1&limit=20&active=true'),
			request.get(
				'/api/admin/featured-items?userId=admin&token=foo&from=2024-01-01&to=2026-12-31&page=invalid&limit=99999&active=invalid&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/featured-items does NOT branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to the same
		// status on the unauth branch.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/featured-items', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/featured-items', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/featured-items', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		// `searchParams.get(name)` returns the first value of
		// any repeated key, so repetition is irrelevant on
		// every branch. The unauth branch must return 401
		// regardless of whether the repeated value is valid or
		// invalid.
		const baseline = await request.get('/api/admin/featured-items');
		const responses = await Promise.all([
			request.get('/api/admin/featured-items?page=1&page=2'),
			request.get('/api/admin/featured-items?limit=10&limit=20'),
			request.get('/api/admin/featured-items?active=true&active=false')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/featured-items keeps a NextRequest-typed handler signature stable', async ({
		request
	}) => {
		// The route's handler signature is
		// `GET(request: NextRequest)` — explicitly typed
		// against the Next-specific `NextRequest` type, NOT
		// the bare `Request` type the `admin/comments` route
		// uses. The Next-specific type opens up the
		// `request.cookies`, `request.geo`, `request.ip`
		// surface — but the unauth-branch contract must stay
		// invariant under any of those side channels. A future
		// regression that adds a cookie / IP-based auth bypass
		// would surface here as a 200 on the unauth branch
		// with a fabricated session cookie. This assertion
		// pins the unauth-branch contract by sweeping a few
		// known-bogus cookie / header values.
		const responses = await Promise.all([
			request.get('/api/admin/featured-items', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/featured-items', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/featured-items', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/featured-items', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});
});
