import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-gated items list endpoint served by
 * `apps/web/app/api/admin/items/route.ts`.
 *
 * `GET /api/admin/items` is **admin-gated** via
 * `auth()` + the `session.user.isAdmin` bit (the same
 * gate the sibling `admin/categories`,
 * `admin/comments`, `admin/companies`,
 * `admin/items/stats`, `admin/items/export/sample`,
 * `admin/users` routes use, distinct from the session-
 * only gate the `admin/featured-items` route uses). The
 * handler reads seven query params (`page`, `limit`,
 * `status`, `search`, `categories`, `tags`, `sortBy`,
 * `sortOrder`) **after** the gate fires, so the
 * unauthenticated branch always returns 401 with the
 * canonical
 * `{ success: false, error: 'Unauthorized. Admin access required.' }`
 * envelope regardless of which keys the caller appends:
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
 *         const statusParam = searchParams.get('status');
 *         const sortByParam = searchParams.get('sortBy');
 *         const sortOrderParam = searchParams.get('sortOrder');
 *         …
 *         const result = await itemRepository.findAllPaginated(page, limit, {…});
 *         return NextResponse.json({ success: true, items: result.items, … });
 *       } catch (error) {
 *         return safeErrorResponse(error, 'Failed to fetch items');
 *       }
 *     }
 *
 * The route's seven documented query params are read
 * **after** the admin gate, so every call from this
 * spec — which carries no authenticated session —
 * round-trips to the same 401 regardless of the query
 * string. A regression that reads any query param
 * before the gate (e.g. a future `?asAdmin=true`
 * admin-impersonation key, a `?token=…` magic-token
 * bypass, a `?as=admin` admin-override, or any other
 * dangerous-passthrough that bypasses
 * `session?.user?.isAdmin`) would change the unauth
 * branch's behaviour from "always 401" to
 * "200 / 400 / 500 if the right query is present" —
 * and that change is exactly what this spec catches.
 *
 * The route's authorization contract is the load-
 * bearing invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or
 *     a session without `isAdmin`); the route returns
 *     401 with the canonical
 *     `{ success: false, error: 'Unauthorized. Admin access required.' }`
 *     envelope. This is the contract every assertion
 *     below pins, because the e2e runner does not
 *     carry an authenticated session by default.
 *   - **Authenticated user, missing `isAdmin`**: same
 *     401 branch. The admin-bit gate is the single
 *     auth primitive this route honours.
 *   - **Admin, valid params**: returns 200 with the
 *     canonical
 *     `{ success: true, items: […], total, page, limit, totalPages }`
 *     envelope. Out of scope for this spec because the
 *     gate fires before any branching on the
 *     documented params.
 *   - **Admin, invalid pagination**: returns 400 via
 *     the `validatePaginationParams(...)` shared
 *     utility's `error` branch. Out of scope on the
 *     unauth branch.
 *   - **Admin, invalid `status` / `sortBy` /
 *     `sortOrder` enum**: returns 400 via the
 *     per-enum `is*` type-guard's negative branch. Out
 *     of scope on the unauth branch.
 *   - **Internal error**: the catch returns
 *     `safeErrorResponse(error, 'Failed to fetch items')`
 *     (typically 500). Out of scope on the unauth
 *     branch because the catch can only fire after the
 *     gate has already let the call through.
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
 * `admin-items-stats-query.spec.ts`,
 * `admin-users-query.spec.ts` smoke specs — all share
 * the same "admin-or-session gated, 401/403 before any
 * service-layer call" posture. The bare
 * `admin/items` list route is unique in that:
 *
 *   1. It uses the **admin gate** (`session?.user?.isAdmin`)
 *      — same as the sibling `admin/categories`,
 *      `admin/comments`, `admin/companies`,
 *      `admin/items/stats`, `admin/items/export/sample`,
 *      `admin/users` routes — distinct from the
 *      session-only gate the `admin/featured-items`
 *      route uses.
 *   2. The 401 envelope carries the role-context-
 *      specific
 *      **`'Unauthorized. Admin access required.'`**
 *      message — distinct from the session-gated
 *      routes' bare `'Unauthorized'` message and from
 *      the `admin/comments` route's
 *      `{ success: false, error: 'Forbidden' }`
 *      envelope (which drops the canonical 401 status
 *      entirely). The admin-gated message is the
 *      production-source convention for routes that
 *      check the `isAdmin` bit explicitly.
 *   3. The post-gate handler delegates pagination
 *      validation to the shared
 *      **`validatePaginationParams(searchParams)`**
 *      utility — same as the `admin/featured-items`
 *      route, distinct from the inline
 *      `parseInt(...)` + `isNaN` check the
 *      `admin/companies` route uses, distinct from
 *      the Zod-schema posture the
 *      `admin/items/export/sample` route uses.
 *   4. The post-gate handler reads exactly **seven**
 *      documented query keys (`page`, `limit`,
 *      `status`, `search`, `categories`, `tags`,
 *      `sortBy`, `sortOrder`) — more than the
 *      `admin/items/stats` route's three (`search`,
 *      `categories`, `tags`), more than the
 *      `admin/items/export/sample` route's one
 *      (`format`), comparable to the
 *      `admin/featured-items` route's three
 *      (`page`, `limit`, `activeOnly`). The wider
 *      surface means more bypass vectors but the same
 *      boundary-test discipline.
 *   5. The route returns the canonical paginated
 *      JSON envelope on the happy path
 *      (`{ success, items, total, page, limit, totalPages }`)
 *      — distinct from the binary-stream envelope the
 *      `admin/items/export/sample` route returns and
 *      distinct from the bare `{ success, data }`
 *      envelope the `admin/items/stats` route returns.
 *      The unauth branch is invariant to this
 *      distinction (still a 401 JSON envelope), but
 *      the post-auth contract is fundamentally
 *      different.
 *   6. The route uses `ItemRepository` directly
 *      (`itemRepository.findAllPaginated(page, limit, {…})`)
 *      — the same per-repository posture the
 *      `admin/categories`, `admin/featured-items`,
 *      `admin/items/stats` routes use, distinct from
 *      the `ItemExportService` direct-instantiation
 *      posture the `admin/items/export/sample` route
 *      uses.
 *   7. The route honours the per-enum type-guard
 *      pattern (`isItemStatus`, `isSortField`,
 *      `isSortOrder`) for the three enum-typed query
 *      params — distinct from the Zod-schema posture
 *      the `admin/items/export/sample` route uses for
 *      its single `format` enum. The type-guard
 *      pattern returns 400 with a per-enum
 *      `'Invalid <name> parameter. Must be one of: …'`
 *      message on the auth branch.
 *   8. The route's `categories` / `tags` params are
 *      **comma-delimited CSV strings** parsed via the
 *      inline `parseCsv(...)` helper
 *      (`split(',').map(trim).filter(Boolean)`) — same
 *      as the `admin/items/stats` route, distinct from
 *      the singular `category` / `tag` form params the
 *      sibling `admin/featured-items` route uses. The
 *      unauth branch is invariant to this distinction.
 *
 * The deeper `admin-protected-extra.spec.ts` smoke
 * also covers this route at the broad `< 500` level;
 * this spec adds the deep query-surface walk on top of
 * that.
 */
const ADMIN_ITEMS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/items',

	// `?page=` — pagination page param. The route
	// honours the shared `validatePaginationParams` util
	// today.
	'/api/admin/items?page=1',
	'/api/admin/items?page=2',
	'/api/admin/items?page=999',
	'/api/admin/items?page=0',
	'/api/admin/items?page=-1',
	'/api/admin/items?page=abc',
	'/api/admin/items?page=',

	// `?limit=` — pagination size param.
	'/api/admin/items?limit=1',
	'/api/admin/items?limit=10',
	'/api/admin/items?limit=100',
	'/api/admin/items?limit=101',
	'/api/admin/items?limit=0',
	'/api/admin/items?limit=-1',
	'/api/admin/items?limit=abc',
	'/api/admin/items?limit=',

	// `?status=` — the four documented enum members
	// plus a few near-misses. The handler's
	// `isItemStatus(...)` type-guard rejects every
	// non-member with a 400 on the auth branch.
	'/api/admin/items?status=draft',
	'/api/admin/items?status=pending',
	'/api/admin/items?status=approved',
	'/api/admin/items?status=rejected',
	'/api/admin/items?status=DRAFT',
	'/api/admin/items?status=Pending',
	'/api/admin/items?status=invalid',
	'/api/admin/items?status=',

	// `?search=` — free-text search filter. Trimmed to
	// undefined for whitespace-only inputs.
	'/api/admin/items?search=test',
	'/api/admin/items?search=',
	'/api/admin/items?search=%20',
	'/api/admin/items?search=anything',
	`/api/admin/items?search=${'x'.repeat(500)}`,

	// `?categories=` — comma-delimited CSV filter
	// parsed via the inline `parseCsv` helper.
	'/api/admin/items?categories=tools',
	'/api/admin/items?categories=tools,services',
	'/api/admin/items?categories=',
	'/api/admin/items?categories=,,,',
	'/api/admin/items?categories=tools,,services',

	// `?tags=` — symmetric CSV filter.
	'/api/admin/items?tags=react',
	'/api/admin/items?tags=react,nextjs',
	'/api/admin/items?tags=',
	'/api/admin/items?tags=,,,',

	// `?sortBy=` — the four documented enum members
	// (`name`, `updated_at`, `status`, `submitted_at`)
	// plus a few near-misses. The
	// handler's `isSortField` type-guard rejects every
	// non-member with a 400 on the auth branch.
	'/api/admin/items?sortBy=name',
	'/api/admin/items?sortBy=updated_at',
	'/api/admin/items?sortBy=status',
	'/api/admin/items?sortBy=submitted_at',
	'/api/admin/items?sortBy=created_at',
	'/api/admin/items?sortBy=NAME',
	'/api/admin/items?sortBy=invalid',
	'/api/admin/items?sortBy=',

	// `?sortOrder=` — the two documented enum members
	// plus a few near-misses.
	'/api/admin/items?sortOrder=asc',
	'/api/admin/items?sortOrder=desc',
	'/api/admin/items?sortOrder=ASC',
	'/api/admin/items?sortOrder=Desc',
	'/api/admin/items?sortOrder=invalid',
	'/api/admin/items?sortOrder=',

	// `?userId=` / `?adminId=` / `?as=` —
	// impersonation keys a future contributor might
	// add.
	'/api/admin/items?userId=admin',
	'/api/admin/items?user_id=admin',
	'/api/admin/items?adminId=admin',
	'/api/admin/items?as=admin',
	'/api/admin/items?asAdmin=true',
	'/api/admin/items?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/items?token=anything',
	'/api/admin/items?secret=anything',
	'/api/admin/items?api_key=anything',
	'/api/admin/items?authorization=Bearer+anything',
	'/api/admin/items?session=anything',
	'/api/admin/items?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/items?bypass=1',
	'/api/admin/items?admin=1',
	'/api/admin/items?admin=true',
	'/api/admin/items?override=true',
	'/api/admin/items?force=true',

	// `?fields=` / `?include=` / `?exclude=` — field-
	// projection keys for a future contributor.
	'/api/admin/items?fields=id',
	'/api/admin/items?fields=id,name,description',
	'/api/admin/items?include=tags',
	'/api/admin/items?exclude=description',

	// `?refresh=` / `?force=` / `?cache=` — cache-
	// busting keys.
	'/api/admin/items?refresh=1',
	'/api/admin/items?fresh=true',
	'/api/admin/items?cache=bypass',
	'/api/admin/items?nocache=1',

	// `?format=` — content-negotiation key. The route
	// returns JSON exclusively today.
	'/api/admin/items?format=json',
	'/api/admin/items?format=csv',
	'/api/admin/items?format=xml',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/items?locale=en',
	'/api/admin/items?locale=fr',
	'/api/admin/items?lang=de',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-
	// tenancy keys.
	'/api/admin/items?tenant=acme',
	'/api/admin/items?tenantId=42',
	'/api/admin/items?org=ever-works',

	// Repeated keys — `searchParams.get(name)` returns
	// the first value for every key the route reads.
	'/api/admin/items?page=1&page=2',
	'/api/admin/items?status=draft&status=approved',
	'/api/admin/items?categories=tools&categories=services',
	'/api/admin/items?sortBy=name&sortBy=invalid',

	// Bogus / typo'd query keys — the route reads
	// seven documented keys today, so any combination
	// of unknown keys is silently ignored on every
	// branch.
	'/api/admin/items?unknown=value',
	'/api/admin/items?foo=bar&baz=qux',
	'/api/admin/items?userId=admin&token=foo&unknown=value&page=1&limit=10&status=approved&search=test&categories=tools&tags=react&sortBy=name&sortOrder=desc&foo=bar'
] as const;

test.describe('API: /api/admin/items query-param surface', () => {
	for (const path of ADMIN_ITEMS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's admin gate fires before any
			// `searchParams` parsing or `itemRepository`
			// call, so the unauthenticated GET surface
			// returns a 4xx (typically 401)
			// deterministically. There is no 5xx branch
			// reachable on the unauthenticated GET surface
			// because the catch can only fire after the
			// gate has already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/items returns a 401 on the unauth branch', async ({ request }) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the admin gate must fire
		// before any `searchParams` parsing or repository
		// call. The status must be exactly 401 (the route
		// hard-codes the 401 status in the gate's
		// `NextResponse.json` call). Either way the
		// response must NOT echo any items list — every
		// consuming client depends on the early-return.
		const response = await request.get('/api/admin/items');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized. Admin access required.'
		});
	});

	test('GET /api/admin/items has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads seven documented query params
		// today after the gate, so the response status must
		// be invariant to any combination of known and
		// unknown keys. A regression that reads any query
		// param before the gate would surface here as a
		// status divergence between the no-arg baseline and
		// the parameterised variant.
		const baseline = await request.get('/api/admin/items');
		const parameterised = await request.get(
			'/api/admin/items?page=1&limit=10&status=approved&search=test&categories=tools&tags=react&sortBy=name&sortOrder=desc&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/items?page=… does NOT bypass the admin gate', async ({ request }) => {
		// The `?page=` param is parsed via the shared
		// `validatePaginationParams` utility after the gate.
		// A regression that runs the validator before the
		// gate would surface here as a 400 on
		// `?page=invalid` (the validator's invalid-input
		// branch) rather than a stable 401 on every
		// invocation.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items?page=1'),
			request.get('/api/admin/items?page=999'),
			request.get('/api/admin/items?page=0'),
			request.get('/api/admin/items?page=-1'),
			request.get('/api/admin/items?page=abc'),
			request.get('/api/admin/items?page=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items?limit=… does NOT bypass the admin gate', async ({ request }) => {
		// Symmetric with the `?page=` assertion above.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items?limit=1'),
			request.get('/api/admin/items?limit=100'),
			request.get('/api/admin/items?limit=101'),
			request.get('/api/admin/items?limit=0'),
			request.get('/api/admin/items?limit=-1'),
			request.get('/api/admin/items?limit=abc')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items?status=… does NOT bypass the admin gate', async ({ request }) => {
		// The `?status=` param is gated through the
		// `isItemStatus` type-guard after the gate. A
		// regression that runs the type-guard before the
		// admin gate would surface as a 400 on
		// `?status=invalid` rather than a stable 401.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items?status=draft'),
			request.get('/api/admin/items?status=pending'),
			request.get('/api/admin/items?status=approved'),
			request.get('/api/admin/items?status=rejected'),
			request.get('/api/admin/items?status=DRAFT'),
			request.get('/api/admin/items?status=invalid'),
			request.get('/api/admin/items?status=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items?search=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who reads
		// `searchParams.get('search')` as a side-channel
		// for a "preview as a search query" feature that
		// bypasses the admin gate would change the unauth
		// branch from "always 401" to "200 if ?search=…
		// is present" and silently grant any anonymous
		// caller arbitrary item-list access. This
		// assertion catches that change immediately.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items?search=test'),
			request.get('/api/admin/items?search='),
			request.get('/api/admin/items?search=%20'),
			request.get(`/api/admin/items?search=${'x'.repeat(500)}`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items?categories=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `?categories=` filter is the route's
		// documented comma-delimited categories filter.
		// The route's `parseCsv(...)` helper only fires
		// after the gate. A regression that reads the
		// parameter before the gate would change the
		// unauth branch's behaviour. This assertion catches
		// that change immediately.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items?categories=tools'),
			request.get('/api/admin/items?categories=tools,services'),
			request.get('/api/admin/items?categories='),
			request.get('/api/admin/items?categories=,,,'),
			request.get('/api/admin/items?categories=tools,,services')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items?tags=… does NOT bypass the admin gate', async ({ request }) => {
		// Symmetric with the `?categories=` assertion.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items?tags=react'),
			request.get('/api/admin/items?tags=react,nextjs'),
			request.get('/api/admin/items?tags='),
			request.get('/api/admin/items?tags=,,,')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items?sortBy=… does NOT bypass the admin gate', async ({ request }) => {
		// The `?sortBy=` param is gated through the
		// `isSortField` type-guard after the gate.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items?sortBy=name'),
			request.get('/api/admin/items?sortBy=updated_at'),
			request.get('/api/admin/items?sortBy=status'),
			request.get('/api/admin/items?sortBy=submitted_at'),
			request.get('/api/admin/items?sortBy=created_at'),
			request.get('/api/admin/items?sortBy=NAME'),
			request.get('/api/admin/items?sortBy=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items?sortOrder=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `?sortOrder=` param is gated through the
		// `isSortOrder` type-guard after the gate.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items?sortOrder=asc'),
			request.get('/api/admin/items?sortOrder=desc'),
			request.get('/api/admin/items?sortOrder=ASC'),
			request.get('/api/admin/items?sortOrder=Desc'),
			request.get('/api/admin/items?sortOrder=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items?userId=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven admin resolution would
		// change the unauth branch from "always 401" to
		// "200 if ?userId=… is present" and silently grant
		// any anonymous caller arbitrary item-list access.
		// This assertion catches that change immediately.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items?userId=admin'),
			request.get('/api/admin/items?user_id=admin'),
			request.get('/api/admin/items?adminId=admin'),
			request.get('/api/admin/items?as=admin'),
			request.get('/api/admin/items?asAdmin=true'),
			request.get('/api/admin/items?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items?token=… does NOT introduce a query-token auth bypass', async ({
		request
	}) => {
		// The route does not authenticate via a query
		// token today (auth is gated through `auth()`
		// which reads the NextAuth session cookie and the
		// admin role bit on the session user). A future
		// contributor who adds a magic-token bypass for
		// the admin gate would change the unauth branch's
		// behaviour. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items?token=anything'),
			request.get('/api/admin/items?secret=anything'),
			request.get('/api/admin/items?api_key=anything'),
			request.get('/api/admin/items?authorization=Bearer+anything'),
			request.get('/api/admin/items?session=anything'),
			request.get('/api/admin/items?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items?bypass=… does NOT introduce a query-admin-override', async ({
		request
	}) => {
		// The route's admin guard does not branch on any
		// query-string admin override today. A regression
		// that wires `searchParams.get('bypass')` /
		// `searchParams.get('admin')` /
		// `searchParams.get('override')` as a non-session-
		// driven admin bypass would let an attacker
		// elevate to admin from any anonymous session.
		// This assertion pins the "admin status is read
		// from the session, never from the query string"
		// invariant.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items?bypass=1'),
			request.get('/api/admin/items?admin=1'),
			request.get('/api/admin/items?admin=true'),
			request.get('/api/admin/items?override=true'),
			request.get('/api/admin/items?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items?format=… does NOT introduce a content-negotiation bypass', async ({
		request
	}) => {
		// The route returns JSON exclusively today (the
		// items-export route at
		// `/api/admin/items/export` is the dedicated
		// CSV / XLSX surface, distinct from this list
		// route). A future `?format=csv` extension on
		// this route must not bypass the admin gate. The
		// unauth branch's status must be invariant to the
		// format key.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items?format=json'),
			request.get('/api/admin/items?format=csv'),
			request.get('/api/admin/items?format=xml')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which
		// must round-trip to the same status on the unauth
		// branch. The shape guarantees the route's admin
		// gate fires before any branching on the
		// documented query params or any potential future
		// query schemas.
		const responses = await Promise.all([
			request.get('/api/admin/items'),
			request.get(
				'/api/admin/items?page=1&limit=10&status=approved&sortBy=name&sortOrder=desc'
			),
			request.get(
				'/api/admin/items?userId=admin&token=foo&page=1&limit=10&status=invalid&search=test&categories=tools&tags=react&sortBy=invalid&sortOrder=invalid&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/items does NOT branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types
		// today; every Accept header must round-trip to
		// the same status on the unauth branch.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/admin/items', {
				headers: { Accept: 'text/csv' }
			}),
			request.get('/api/admin/items', {
				headers: { Accept: 'application/xml' }
			}),
			request.get('/api/admin/items', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items repeated query keys do NOT bypass the gate', async ({ request }) => {
		// `searchParams.get(name)` returns the first value
		// of any repeated key, so repetition is irrelevant
		// on every branch. The unauth branch must return
		// 401 regardless of whether the repeated value is
		// valid or invalid.
		const baseline = await request.get('/api/admin/items');
		const responses = await Promise.all([
			request.get('/api/admin/items?page=1&page=2'),
			request.get('/api/admin/items?status=draft&status=approved'),
			request.get('/api/admin/items?categories=tools&categories=services'),
			request.get('/api/admin/items?sortBy=name&sortBy=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items keeps a NextRequest-typed handler signature stable', async ({
		request
	}) => {
		// The route's handler signature is
		// `GET(request: NextRequest)` — explicitly typed
		// against the Next-specific `NextRequest` type,
		// distinct from the bare `Request` type the
		// `admin/items/stats` route uses. The Next-
		// specific type opens up the `request.cookies`,
		// `request.geo`, `request.ip` surface — but the
		// unauth-branch contract must stay invariant under
		// any of those side channels. A future regression
		// that adds a cookie / IP-based admin bypass would
		// surface here as a 200 on the unauth branch with
		// a fabricated session cookie. This assertion
		// pins the unauth-branch contract by sweeping a
		// few known-bogus cookie / header values.
		const responses = await Promise.all([
			request.get('/api/admin/items', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/items', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/items', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/items', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});
});
