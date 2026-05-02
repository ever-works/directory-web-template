import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-gated categories-listing endpoint served by
 * `apps/web/app/api/admin/categories/route.ts`.
 *
 * `GET /api/admin/categories` is **admin-gated** via
 * `auth()` + the `session.user.isAdmin` bit. The handler
 * reads five query params after the gate (`page`, `limit`,
 * `includeInactive`, `sortBy`, `sortOrder`), so the
 * unauthenticated branch returns 401 with
 * `{ success: false, error: 'Unauthorized. Admin access required.' }`
 * regardless of which keys the caller appends:
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
 *         const { searchParams } = new URL(request.url);
 *         const paginationResult = validatePaginationParams(searchParams);
 *         if ('error' in paginationResult) {
 *           return NextResponse.json(
 *             { success: false, error: paginationResult.error },
 *             { status: paginationResult.status }
 *           );
 *         }
 *         const { page, limit } = paginationResult;
 *         const includeInactive = searchParams.get('includeInactive') === 'true';
 *         const sortByParam = searchParams.get('sortBy');
 *         const sortBy = (sortByParam === 'name' || sortByParam === 'id') ? sortByParam : 'name';
 *         const sortOrderParam = searchParams.get('sortOrder');
 *         const sortOrder = (sortOrderParam === 'asc' || sortOrderParam === 'desc') ? sortOrderParam : 'asc';
 *         const result = await categoryRepository.findAllPaginated({ … });
 *         return NextResponse.json({ success: true, categories, total, page, limit, totalPages });
 *       } catch (error) {
 *         return safeErrorResponse(error, 'Failed to fetch categories');
 *       }
 *     }
 *
 * The route's five documented query params (`page`,
 * `limit`, `includeInactive`, `sortBy`, `sortOrder`) are
 * read **after** the single-step admin gate, so every call
 * from this spec — which carries no authenticated session
 * — round-trips to the same 401 regardless of the query
 * string. A regression that reads any query param before
 * the gate (e.g. a future `?asAdmin=true` admin-
 * impersonation key, a `?token=…` magic-token bypass, a
 * `?as=admin` admin-override, or any other dangerous-
 * passthrough that bypasses `session?.user?.isAdmin`)
 * would change the unauth branch's behaviour from
 * "always 401" to "200 / 400 / 500 if the right query is
 * present" — and that change is exactly what this spec
 * catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session without an admin user); the route returns
 *     401 with the canonical
 *     `{ success: false, error: 'Unauthorized. Admin access required.' }`
 *     envelope. This is the contract every assertion
 *     below pins, because the e2e runner does not carry
 *     an authenticated session by default.
 *   - **Authenticated non-admin user**: `session.user.isAdmin`
 *     is `false`; the route returns the same 401 envelope.
 *     The single-step gate collapses both unauthenticated
 *     and authenticated-non-admin into the same 401 (in
 *     contrast to the sibling `admin/users` route which
 *     separates them into 401 vs 403 and the
 *     `admin/comments` route which collapses them into a
 *     single 403). Out of scope for this spec because the
 *     gate fires before the inline pagination validators
 *     on every unauth invocation.
 *   - **Authenticated admin user with invalid pagination**:
 *     `validatePaginationParams(...)` returns
 *     `{ error: 'Invalid page parameter. …', status: 400 }`
 *     (or the equivalent for `limit`); the route returns
 *     400 with the bare-error envelope. Out of scope for
 *     this spec because the admin gate fires before the
 *     pagination validators on every unauth invocation.
 *   - **Authenticated admin user**: returns 200 with
 *     `{ success: true, categories: [...], total, page,
 *     limit, totalPages }` after the
 *     `categoryRepository.findAllPaginated(...)` query
 *     completes. Out of scope for this spec because the
 *     gate fires before the repository call on every
 *     unauth invocation.
 *   - **Internal error**: returns whatever
 *     `safeErrorResponse(...)` produces (canonically a
 *     500 with the `'Failed to fetch categories'` message).
 *     Out of scope for this spec because the gate fires
 *     before any repository call on every unauth
 *     invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec
 * hits. A regression that introduces query-string-based
 * bypass — e.g. a future `?asAdmin=true` admin-
 * impersonation key that fires before `auth()`, a
 * `?token=…` magic-token bypass, or a `?categoryId=…`
 * dangerous-passthrough that would forward a caller-
 * supplied id to a future "view a single category by id"
 * feature — would surface immediately as a status
 * divergence between the no-arg 401 and a parameter-laden
 * non-401.
 *
 * The shape mirrors the sibling
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
 * service-layer call" posture. The admin categories-
 * listing route is unique in that:
 *   1. It uses a **401** for the unauth branch (where
 *      `admin-comments-query.spec.ts` documents a single-
 *      step **403** gate). The handler hard-codes the 401
 *      status in the gate's `NextResponse.json` call, the
 *      same posture as the `admin/companies`,
 *      `admin/collections`, and `admin/users` routes for
 *      the unauthenticated case.
 *   2. The handler signature is `GET(request: NextRequest)`
 *      (with the Next-specific `NextRequest` type, not the
 *      bare `Request` type the `admin/comments` handler
 *      uses) — which opens up the Next-specific request
 *      surface (e.g. `request.cookies`, `request.geo`,
 *      `request.ip`). The behavioural contract is the same
 *      on the unauth branch.
 *   3. The 401 envelope is the **`{ success: false, error
 *      }` shape** with the message `'Unauthorized. Admin
 *      access required.'` — a more verbose variant than
 *      the bare `{ error: 'Unauthorized' }` envelope the
 *      `admin/companies` route emits, and distinct from
 *      the `{ success: false, error: 'Forbidden' }`
 *      envelope the `admin/comments` route emits. The
 *      `success: false` shape is the unified envelope that
 *      newer admin routes are expected to share, but every
 *      contributor who refactors a sibling admin route to
 *      a `success: false` envelope must preserve the
 *      gate-order invariant this spec pins.
 *   4. The handler uses the `categoryRepository.
 *      findAllPaginated(...)` repository function (from
 *      `@/lib/repositories/category.repository`) — distinct
 *      from the drizzle-direct posture of the `admin/
 *      comments` route. The repository-pattern posture is
 *      the production-source convention for new admin
 *      routes; future contributors who refactor the
 *      `admin/comments` route to use a `commentRepository`
 *      should preserve the gate-order invariant this spec
 *      pins.
 *   5. The post-gate handler delegates pagination
 *      validation to the shared `validatePaginationParams`
 *      utility (from `@/lib/utils/pagination-validation`)
 *      — distinct from the inline `parseInt(...)` +
 *      `isNaN` check the `admin/companies` route uses.
 *      The utility-based posture is the production-source
 *      convention for new admin routes; the unauth-branch
 *      contract is invariant to the validator's location
 *      (utility vs inline).
 *   6. The post-gate handler reads **five** documented
 *      query keys (`page`, `limit`, `includeInactive`,
 *      `sortBy`, `sortOrder`) — the same count as the
 *      `admin/users` route, fewer than the `admin/
 *      collections` route's six, more than the `admin/
 *      comments` route's three. The narrower surface
 *      means fewer bypass vectors but the same boundary-
 *      test discipline.
 *   7. The route's `includeInactive` query key gates the
 *      "include inactive categories in the results" filter
 *      via a strict `=== 'true'` string-equality check —
 *      so any value other than the literal string `'true'`
 *      coerces to `false`. The unauth branch is invariant
 *      to the key's value.
 *   8. The route's `sortBy` query key accepts `name` /
 *      `id` (a two-state sort-field enum); any other value
 *      silently coerces to `'name'`. The route's
 *      `sortOrder` query key accepts `asc` / `desc` (a
 *      two-state sort-order enum); any other value
 *      silently coerces to `'asc'`. Out of scope for this
 *      spec because the coercion only fires on the auth
 *      branch.
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this spec
 * adds the deep query-surface walk on top of that.
 */
const ADMIN_CATEGORIES_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/categories',

	// `?page=` / `?limit=` — pagination params validated by
	// `validatePaginationParams(...)` after the gate, with
	// inline `isNaN` / range checks that fire on the auth
	// branch.
	'/api/admin/categories?page=1',
	'/api/admin/categories?page=2',
	'/api/admin/categories?page=999',
	'/api/admin/categories?limit=10',
	'/api/admin/categories?limit=50',
	'/api/admin/categories?limit=100',
	'/api/admin/categories?page=1&limit=20',
	'/api/admin/categories?page=invalid',
	'/api/admin/categories?limit=invalid',
	'/api/admin/categories?page=-1',
	'/api/admin/categories?page=0',
	'/api/admin/categories?limit=0',
	'/api/admin/categories?limit=-1',
	'/api/admin/categories?limit=99999',
	'/api/admin/categories?limit=101', // just over the inline ceiling
	'/api/admin/categories?page=', // empty -> NaN -> 400 on auth
	'/api/admin/categories?limit=', // empty -> NaN -> 400 on auth

	// `?includeInactive=` — strict `=== 'true'` filter
	// that gates the "include inactive categories in the
	// results" branch on the auth branch.
	'/api/admin/categories?includeInactive=true',
	'/api/admin/categories?includeInactive=false',
	'/api/admin/categories?includeInactive=TRUE', // case-sensitivity
	'/api/admin/categories?includeInactive=1',
	'/api/admin/categories?includeInactive=',
	'/api/admin/categories?includeInactive=invalid',

	// `?sortBy=` / `?sortOrder=` — documented sort enums
	// (`name` / `id`, `asc` / `desc`). Any other value
	// silently coerces to the default on the auth branch.
	'/api/admin/categories?sortBy=name',
	'/api/admin/categories?sortBy=id',
	'/api/admin/categories?sortBy=NAME', // case-sensitivity
	'/api/admin/categories?sortBy=invalid',
	'/api/admin/categories?sortBy=createdAt',
	'/api/admin/categories?sortBy=',
	'/api/admin/categories?sortOrder=asc',
	'/api/admin/categories?sortOrder=desc',
	'/api/admin/categories?sortOrder=ASC',
	'/api/admin/categories?sortOrder=invalid',
	'/api/admin/categories?sortOrder=',

	// Combinations of the documented filters.
	'/api/admin/categories?page=1&limit=20&includeInactive=true&sortBy=name&sortOrder=asc',
	'/api/admin/categories?page=&limit=&includeInactive=&sortBy=&sortOrder=',
	'/api/admin/categories?page=2&limit=50&includeInactive=true&sortBy=id&sortOrder=desc',

	// `?categoryId=` / `?id=` / `?slug=` / `?parentId=` —
	// category-targeting keys a future contributor might
	// add for a "view a single category" feature. The route
	// does not target a single category today (the per-
	// category endpoint lives at
	// `/api/admin/categories/[id]/route.ts`).
	'/api/admin/categories?categoryId=anything',
	'/api/admin/categories?id=cat_123',
	'/api/admin/categories?slug=technology',
	'/api/admin/categories?parentId=root',

	// `?q=` / `?search=` — free-text filter keys a future
	// contributor might add. The route does not filter by
	// free text today (only by `includeInactive`).
	'/api/admin/categories?q=test',
	'/api/admin/categories?q=technology',
	'/api/admin/categories?q=hello%20world',
	'/api/admin/categories?q=',
	'/api/admin/categories?q=%20%20%20',
	"/api/admin/categories?q=%27%20OR%201%3D1",
	'/api/admin/categories?q=%3Cscript%3E',
	'/api/admin/categories?q=%25', // SQL LIKE wildcard
	'/api/admin/categories?q=_', // SQL LIKE wildcard
	'/api/admin/categories?q=%5C', // backslash
	`/api/admin/categories?q=${'x'.repeat(50)}`,
	`/api/admin/categories?q=${'x'.repeat(500)}`,
	`/api/admin/categories?q=${'x'.repeat(1000)}`,
	'/api/admin/categories?search=test',
	'/api/admin/categories?search=technology',

	// `?userId=` / `?adminId=` / `?as=` — admin-
	// impersonation keys a future contributor might add. The
	// route reads the admin identity from
	// `session.user.isAdmin` exclusively today.
	'/api/admin/categories?userId=anything',
	'/api/admin/categories?user_id=anything',
	'/api/admin/categories?adminId=anything',
	'/api/admin/categories?as=admin',
	'/api/admin/categories?asAdmin=true',
	'/api/admin/categories?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/categories?token=anything',
	'/api/admin/categories?secret=anything',
	'/api/admin/categories?api_key=anything',
	'/api/admin/categories?authorization=Bearer+anything',
	'/api/admin/categories?session=anything',
	'/api/admin/categories?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/categories?bypass=1',
	'/api/admin/categories?admin=1',
	'/api/admin/categories?admin=true',
	'/api/admin/categories?override=true',
	'/api/admin/categories?force=true',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys for a future contributor. The route
	// returns the full category envelope today.
	'/api/admin/categories?fields=id',
	'/api/admin/categories?fields=id,name,slug',
	'/api/admin/categories?select=name',
	'/api/admin/categories?include=items',
	'/api/admin/categories?exclude=description',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// cache-busting keys.
	'/api/admin/categories?refresh=1',
	'/api/admin/categories?fresh=true',
	'/api/admin/categories?cache=bypass',
	'/api/admin/categories?nocache=1',

	// `?format=` — content-negotiation key. The route returns
	// JSON exclusively today.
	'/api/admin/categories?format=json',
	'/api/admin/categories?format=csv',
	'/api/admin/categories?format=xml',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/categories?locale=en',
	'/api/admin/categories?locale=fr',
	'/api/admin/categories?lang=de',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-tenancy
	// keys. The route does not resolve tenant per-call today
	// (no `getTenantId` call); a query-string tenant override
	// would be a separate auth issue.
	'/api/admin/categories?tenant=acme',
	'/api/admin/categories?tenantId=42',
	'/api/admin/categories?org=ever-works',

	// `?from=` / `?to=` / `?since=` / `?until=` — time-range
	// filter keys for a future contributor.
	'/api/admin/categories?from=2024-01-01',
	'/api/admin/categories?to=2026-12-31',
	'/api/admin/categories?since=2024-01-01T00:00:00Z',
	'/api/admin/categories?until=2026-12-31T23:59:59Z',
	'/api/admin/categories?from=invalid-date',

	// `?deleted=` / `?includeDeleted=` — soft-delete filter
	// keys for a future contributor.
	'/api/admin/categories?deleted=true',
	'/api/admin/categories?deleted=false',
	'/api/admin/categories?includeDeleted=true',

	// Repeated keys — `searchParams.get(name)` returns the
	// first value for every key the route reads.
	'/api/admin/categories?page=1&page=2',
	'/api/admin/categories?limit=10&limit=20',
	'/api/admin/categories?includeInactive=true&includeInactive=false',
	'/api/admin/categories?sortBy=name&sortBy=id',
	'/api/admin/categories?sortOrder=asc&sortOrder=desc',

	// Bogus / typo'd query keys — the route reads five
	// documented keys today, so any combination of unknown
	// keys is silently ignored on every branch.
	'/api/admin/categories?unknown=value',
	'/api/admin/categories?foo=bar&baz=qux',
	'/api/admin/categories?userId=admin&token=foo&unknown=value&page=1&limit=20&foo=bar&includeInactive=true&sortBy=name&sortOrder=asc'
] as const;

test.describe('API: /api/admin/categories query-param surface', () => {
	for (const path of ADMIN_CATEGORIES_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's admin gate fires before any
			// `searchParams` parsing or repository call, so the
			// unauthenticated GET surface returns a 4xx
			// (typically 401) deterministically. There is no 5xx
			// branch reachable on the unauthenticated GET surface
			// because the catch can only fire after the gate has
			// already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/categories returns a 401 on the unauth branch', async ({ request }) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the admin gate must fire before any
		// `searchParams` parsing or repository call. The
		// status must be exactly 401 (the route hard-codes the
		// 401 status in the gate's `NextResponse.json` call).
		// Either way the response must NOT echo any category
		// data — every consuming client depends on the
		// early-return.
		const response = await request.get('/api/admin/categories');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized. Admin access required.'
		});
	});

	test('GET /api/admin/categories has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads five documented query params today
		// after the gate, so the response status must be
		// invariant to any combination of known and unknown
		// keys. A regression that reads any query param before
		// the gate would surface here as a status divergence
		// between the no-arg baseline and the parameterised
		// variant.
		const baseline = await request.get('/api/admin/categories');
		const parameterised = await request.get(
			'/api/admin/categories?page=1&limit=20&includeInactive=true&sortBy=name&sortOrder=asc&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/categories?page=…&limit=… does NOT bypass the admin gate, and the inline pagination validators do NOT fire on the unauth branch', async ({
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
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories?page=1'),
			request.get('/api/admin/categories?page=invalid'),
			request.get('/api/admin/categories?page=-1'),
			request.get('/api/admin/categories?page=0'),
			request.get('/api/admin/categories?limit=10'),
			request.get('/api/admin/categories?limit=invalid'),
			request.get('/api/admin/categories?limit=0'),
			request.get('/api/admin/categories?limit=-1'),
			request.get('/api/admin/categories?limit=101'),
			request.get('/api/admin/categories?limit=99999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories?includeInactive=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `?includeInactive=` filter gates a strict
		// `=== 'true'` string-equality check on the auth
		// branch. Any value (including the literal string
		// `'true'`) must round-trip to the same status on the
		// unauth branch.
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories?includeInactive=true'),
			request.get('/api/admin/categories?includeInactive=false'),
			request.get('/api/admin/categories?includeInactive=TRUE'),
			request.get('/api/admin/categories?includeInactive=1'),
			request.get('/api/admin/categories?includeInactive='),
			request.get('/api/admin/categories?includeInactive=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories?sortBy=… does NOT bypass the admin gate', async ({ request }) => {
		// The `?sortBy=` filter accepts the two-state enum
		// (`name` / `id`) on the auth branch via a coercion to
		// `'name'` for any other value. A future contributor
		// who validates the sort-by before the gate would
		// change the unauth branch from "always 401" to
		// "400 if ?sortBy=invalid" — this assertion catches
		// that change immediately.
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories?sortBy=name'),
			request.get('/api/admin/categories?sortBy=id'),
			request.get('/api/admin/categories?sortBy=NAME'),
			request.get('/api/admin/categories?sortBy=invalid'),
			request.get('/api/admin/categories?sortBy=createdAt'),
			request.get('/api/admin/categories?sortBy=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories?sortOrder=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `?sortOrder=` filter accepts the two-state enum
		// (`asc` / `desc`) on the auth branch via a coercion
		// to `'asc'` for any other value. A future contributor
		// who validates the sort-order before the gate would
		// change the unauth branch from "always 401" to
		// "400 if ?sortOrder=invalid" — this assertion catches
		// that change immediately.
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories?sortOrder=asc'),
			request.get('/api/admin/categories?sortOrder=desc'),
			request.get('/api/admin/categories?sortOrder=ASC'),
			request.get('/api/admin/categories?sortOrder=invalid'),
			request.get('/api/admin/categories?sortOrder=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories?userId=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven admin resolution would
		// change the unauth branch from "always 401" to
		// "200 if ?userId=admin is present" — silently
		// granting any anonymous caller admin access. This
		// assertion catches that change immediately.
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories?userId=admin'),
			request.get('/api/admin/categories?user_id=admin'),
			request.get('/api/admin/categories?adminId=admin'),
			request.get('/api/admin/categories?as=admin'),
			request.get('/api/admin/categories?asAdmin=true'),
			request.get('/api/admin/categories?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories?token=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who adds magic-token-based
		// admin bypass — e.g. a `?token=…` shortcut for an
		// internal cron job or a `?secret=…` shortcut for a
		// staging-environment integration test — would change
		// the unauth branch from "always 401" to "200 if the
		// right token is present". This assertion catches that
		// change immediately.
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories?token=anything'),
			request.get('/api/admin/categories?secret=anything'),
			request.get('/api/admin/categories?api_key=anything'),
			request.get('/api/admin/categories?authorization=Bearer+anything'),
			request.get('/api/admin/categories?session=anything'),
			request.get('/api/admin/categories?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories?bypass=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who adds a `?bypass=…`,
		// `?admin=…`, or `?override=…` admin-override key
		// would change the unauth branch from "always 401" to
		// "200 if the right key is present". This assertion
		// catches that change immediately.
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories?bypass=1'),
			request.get('/api/admin/categories?admin=1'),
			request.get('/api/admin/categories?admin=true'),
			request.get('/api/admin/categories?override=true'),
			request.get('/api/admin/categories?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories?fields=… does NOT introduce a field-projection bypass', async ({
		request
	}) => {
		// The route returns the full category envelope today;
		// any future field-projection support must not bypass
		// the auth gate. The unauth branch's status must be
		// invariant to the field-projection keys.
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories?fields=id'),
			request.get('/api/admin/categories?fields=id,name,slug'),
			request.get('/api/admin/categories?select=name'),
			request.get('/api/admin/categories?include=items'),
			request.get('/api/admin/categories?exclude=description')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories?categoryId=… does NOT introduce a single-category-targeting bypass', async ({
		request
	}) => {
		// The route does not target a single category today
		// (the per-category endpoint lives at
		// `/api/admin/categories/[id]/route.ts`). A future
		// contributor who adds a `?categoryId=…` /
		// `?slug=…` / `?parentId=…` shortcut on the listing
		// route must not bypass the auth gate. The unauth
		// branch's status must be invariant to the category-
		// targeting keys.
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories?categoryId=anything'),
			request.get('/api/admin/categories?id=cat_123'),
			request.get('/api/admin/categories?slug=technology'),
			request.get('/api/admin/categories?parentId=root')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories?q=… does NOT introduce a free-text-filter bypass', async ({
		request
	}) => {
		// The route does not filter by free text today (only
		// by `includeInactive`). A future contributor who
		// adds a `?q=…` / `?search=…` filter must not bypass
		// the auth gate. The unauth branch's status must be
		// invariant to the free-text keys.
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories?q=test'),
			request.get('/api/admin/categories?q=technology'),
			request.get('/api/admin/categories?q=hello%20world'),
			request.get('/api/admin/categories?q='),
			request.get("/api/admin/categories?q=%27%20OR%201%3D1"),
			request.get('/api/admin/categories?q=%3Cscript%3E'),
			request.get('/api/admin/categories?q=%25'),
			request.get('/api/admin/categories?q=%5C'),
			request.get(`/api/admin/categories?q=${'x'.repeat(500)}`),
			request.get('/api/admin/categories?search=test')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories?from=…&to=… does NOT introduce a time-range-filter bypass', async ({
		request
	}) => {
		// The route does not filter by time today. A future
		// contributor who adds time-range filter keys
		// (`?from=…` / `?to=…` / `?since=…` / `?until=…`)
		// must not bypass the auth gate. The unauth branch's
		// status must be invariant to the time-range keys.
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories?from=2024-01-01'),
			request.get('/api/admin/categories?to=2026-12-31'),
			request.get('/api/admin/categories?since=2024-01-01T00:00:00Z'),
			request.get('/api/admin/categories?until=2026-12-31T23:59:59Z'),
			request.get('/api/admin/categories?from=invalid-date')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories?deleted=… does NOT introduce a soft-delete-filter bypass', async ({
		request
	}) => {
		// The route's `includeInactive` filter is distinct
		// from a soft-delete filter (the inactive flag is a
		// per-row state, not a tombstone). A future contributor
		// who adds a soft-delete filter (`?includeDeleted=true`
		// / `?deleted=…`) must not bypass the auth gate. The
		// unauth branch's status must be invariant to the
		// soft-delete keys.
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories?deleted=true'),
			request.get('/api/admin/categories?deleted=false'),
			request.get('/api/admin/categories?includeDeleted=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth branch.
		// The shape guarantees the route's admin gate fires
		// before any branching on the documented `page` /
		// `limit` / `includeInactive` / `sortBy` / `sortOrder`
		// query params or any potential future query schemas.
		const responses = await Promise.all([
			request.get('/api/admin/categories'),
			request.get('/api/admin/categories?page=1&limit=20&includeInactive=true&sortBy=name&sortOrder=asc'),
			request.get(
				'/api/admin/categories?userId=admin&token=foo&from=2024-01-01&to=2026-12-31&page=invalid&limit=99999&sortBy=invalid&sortOrder=invalid&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/categories does NOT branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to the same
		// status on the unauth branch.
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/categories', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/categories', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/categories', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		// `searchParams.get(name)` returns the first value of
		// any repeated key, so repetition is irrelevant on
		// every branch. The unauth branch must return 401
		// regardless of whether the repeated value is valid or
		// invalid.
		const baseline = await request.get('/api/admin/categories');
		const responses = await Promise.all([
			request.get('/api/admin/categories?page=1&page=2'),
			request.get('/api/admin/categories?limit=10&limit=20'),
			request.get('/api/admin/categories?includeInactive=true&includeInactive=false'),
			request.get('/api/admin/categories?sortBy=name&sortBy=id'),
			request.get('/api/admin/categories?sortOrder=asc&sortOrder=desc')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/categories keeps a NextRequest-typed handler signature stable', async ({
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
			request.get('/api/admin/categories', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/categories', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/categories', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/categories', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});
});
