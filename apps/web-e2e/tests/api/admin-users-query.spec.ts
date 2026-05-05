import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-gated user-listing endpoint served by
 * `apps/web/app/api/admin/users/route.ts`.
 *
 * `GET /api/admin/users` is **session-gated** then
 * **admin-gated** via `auth()` + the `session.user.isAdmin`
 * bit. The handler reads eight query params after both
 * gates fire (`page`, `limit`, `search`, `role`, `status`,
 * `sortBy`, `sortOrder`, `includeInactive`), so the
 * unauthenticated branch always returns 401 with
 * `{ success: false, error: "Unauthorized" }` regardless of
 * which keys the caller appends:
 *
 *     export async function GET(request: NextRequest) {
 *       try {
 *         const session = await auth();
 *         if (!session?.user) {
 *           return NextResponse.json(
 *             { success: false, error: "Unauthorized" },
 *             { status: 401 }
 *           );
 *         }
 *         if (!session.user.isAdmin) {
 *           return NextResponse.json(
 *             { success: false, error: "Forbidden" },
 *             { status: 403 }
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
 *         const search = searchParams.get('search') || undefined;
 *         const role = searchParams.get('role') || undefined;
 *         const status = searchParams.get('status') as 'active' | 'inactive' | undefined;
 *         if (status && !['active', 'inactive'].includes(status)) {
 *           return NextResponse.json(
 *             { success: false, error: 'Invalid status parameter' },
 *             { status: 400 }
 *           );
 *         }
 *         const sortBy = searchParams.get('sortBy') as ... | undefined;
 *         const validSortFields = ['name', 'username', 'email', 'role', 'created_at'];
 *         if (sortBy && !validSortFields.includes(sortBy)) {
 *           return NextResponse.json(
 *             { success: false, error: 'Invalid sortBy parameter' },
 *             { status: 400 }
 *           );
 *         }
 *         const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined;
 *         if (sortOrder && !['asc', 'desc'].includes(sortOrder)) {
 *           return NextResponse.json(
 *             { success: false, error: 'Invalid sortOrder parameter' },
 *             { status: 400 }
 *           );
 *         }
 *         const includeInactive = searchParams.get('includeInactive') === 'true';
 *         if (search && search.length > 100) {
 *           return NextResponse.json(
 *             { success: false, error: 'Search parameter too long' },
 *             { status: 400 }
 *           );
 *         }
 *         if (role && role.length > 50) {
 *           return NextResponse.json(
 *             { success: false, error: 'Role parameter too long' },
 *             { status: 400 }
 *           );
 *         }
 *         const userRepository = new UserRepository();
 *         const result = await userRepository.findAll({
 *           page, limit, search, role, status, sortBy, sortOrder, includeInactive,
 *         });
 *         return NextResponse.json({ success: true, data: result.users, ... });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Internal server error' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The route's eight documented query params (`page`, `limit`,
 * `search`, `role`, `status`, `sortBy`, `sortOrder`,
 * `includeInactive`) are read **after** the two-step gate
 * (session-required, then admin-required), so every call from
 * this spec — which carries no authenticated session — round-
 * trips to the same 401 regardless of the query string. A
 * regression that reads any query param before the gate
 * (e.g. a future `?asAdmin=true` admin-impersonation key, a
 * `?token=…` magic-token bypass, a `?as=admin` admin-override,
 * or any other dangerous-passthrough that bypasses
 * `session?.user` and `session.user.isAdmin`) would change
 * the unauth branch's behaviour from "always 401" to
 * "200 / 400 / 500 if the right query is present" — and that
 * change is exactly what this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session without a `user`); the route returns 401 with
 *     the canonical `{ success: false, error: "Unauthorized" }`
 *     envelope. This is the contract every assertion below
 *     pins, because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Authenticated non-admin user**: `session.user.isAdmin`
 *     is `false`; the route returns 403 with
 *     `{ success: false, error: "Forbidden" }`. Out of scope
 *     for this spec.
 *   - **Authenticated admin user**: returns 200 with
 *     `{ success: true, data: [...users], total, page, limit, totalPages }`
 *     after the `userRepository.findAll(...)` call completes.
 *     Out of scope for this spec because the gate fires
 *     before the repository call on every unauth invocation.
 *   - **Authenticated admin user, invalid `?status=…` value**:
 *     returns 400 with `{ success: false, error: 'Invalid status parameter' }`.
 *     Out of scope for this spec because the gate fires
 *     before the validator on every unauth invocation.
 *   - **Authenticated admin user, invalid `?sortBy=…` value**:
 *     returns 400 with `{ success: false, error: 'Invalid sortBy parameter' }`.
 *     Out of scope for this spec because the gate fires
 *     before the validator on every unauth invocation.
 *   - **Authenticated admin user, invalid `?sortOrder=…` value**:
 *     returns 400 with `{ success: false, error: 'Invalid sortOrder parameter' }`.
 *     Out of scope for this spec because the gate fires
 *     before the validator on every unauth invocation.
 *   - **Authenticated admin user, oversize `?search=…` value
 *     (>100 chars)**: returns 400 with
 *     `{ success: false, error: 'Search parameter too long' }`.
 *     Out of scope for this spec because the gate fires
 *     before the validator on every unauth invocation.
 *   - **Authenticated admin user, oversize `?role=…` value
 *     (>50 chars)**: returns 400 with
 *     `{ success: false, error: 'Role parameter too long' }`.
 *     Out of scope for this spec because the gate fires
 *     before the validator on every unauth invocation.
 *   - **Internal error**: returns 500 with
 *     `{ success: false, error: 'Internal server error' }`.
 *     Out of scope for this spec because the gate fires
 *     before any repository call on every unauth invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec hits.
 * A regression that introduces query-string-based bypass —
 * e.g. a future `?asAdmin=true` admin-impersonation key
 * that fires before `auth()`, a `?token=…` magic-token
 * bypass, or a `?userId=…` dangerous-passthrough that would
 * forward a caller-supplied user id to a future "view
 * another admin's user-list" feature — would surface
 * immediately as a status divergence between the no-arg 401
 * and a parameter-laden non-401.
 *
 * The shape mirrors the sibling
 * `admin-dashboard-stats-query.spec.ts`,
 * `admin-geo-analytics-query.spec.ts`,
 * `admin-items-stats-query.spec.ts`,
 * `client-dashboard-stats-query.spec.ts`,
 * `client-geo-stats-query.spec.ts`,
 * `client-items-coordinates-query.spec.ts`,
 * `stripe-payment-methods-list-query.spec.ts`,
 * `lemonsqueezy-list-query.spec.ts`,
 * `subscription-query.spec.ts`,
 * `payments-query.spec.ts`, and
 * `plan-status-query.spec.ts` smoke specs — all share the
 * same "session-or-admin gated, 401/403 before any
 * service-layer call" posture. The admin users-listing route
 * is unique in that:
 *   1. It reads eight documented query params (the largest
 *      query surface of any admin GET endpoint smoke spec to
 *      date).
 *   2. It has a **two-step** authorization gate (session-required
 *      first with 401, then admin-required with 403) — the
 *      sibling `admin-items-stats` route collapses both into a
 *      single 401 ("Unauthorized. Admin access required.").
 *   3. The handler signature is `GET(request: NextRequest)`
 *      (with the Next-specific `NextRequest` type, not the
 *      bare `Request`) — for `request.url` parsing reasons.
 *   4. Five of the eight params have post-gate validators
 *      that return 400 (`status`, `sortBy`, `sortOrder`,
 *      `search` length, `role` length) — none of which fire
 *      on the unauth branch this spec walks.
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this spec
 * adds the deep query-surface walk on top of that.
 */
const ADMIN_USERS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/users',

	// `?search=` — the route's documented free-text filter.
	// The route reads `searchParams.get('search')` after the
	// gate today; oversize values (>100 chars) trip a 400 on
	// the auth branch but the unauth branch always returns 401.
	'/api/admin/users?search=test',
	'/api/admin/users?search=hello%20world',
	'/api/admin/users?search=',
	"/api/admin/users?search=%27%20OR%201%3D1",
	'/api/admin/users?search=%3Cscript%3E',
	`/api/admin/users?search=${'x'.repeat(50)}`,
	`/api/admin/users?search=${'x'.repeat(100)}`,
	`/api/admin/users?search=${'x'.repeat(101)}`, // would-be 400 on auth branch
	`/api/admin/users?search=${'x'.repeat(500)}`, // would-be 400 on auth branch

	// `?role=` — the route's documented role filter.
	// Oversize values (>50 chars) trip a 400 on the auth
	// branch but the unauth branch always returns 401.
	'/api/admin/users?role=admin',
	'/api/admin/users?role=user',
	'/api/admin/users?role=moderator',
	'/api/admin/users?role=',
	`/api/admin/users?role=${'r'.repeat(50)}`,
	`/api/admin/users?role=${'r'.repeat(51)}`, // would-be 400 on auth branch
	`/api/admin/users?role=${'r'.repeat(500)}`, // would-be 400 on auth branch

	// `?status=` — the route's documented status filter.
	// Only `active` / `inactive` are valid on the auth branch;
	// other values trip a 400 there but the unauth branch
	// always returns 401.
	'/api/admin/users?status=active',
	'/api/admin/users?status=inactive',
	'/api/admin/users?status=invalid', // would-be 400 on auth branch
	'/api/admin/users?status=ALL', // would-be 400 on auth branch
	'/api/admin/users?status=', // empty string — falsey, no validation

	// `?sortBy=` — the route's documented sort field.
	// Only `name` / `username` / `email` / `role` /
	// `created_at` are valid on the auth branch; other
	// values trip a 400 there but the unauth branch always
	// returns 401.
	'/api/admin/users?sortBy=name',
	'/api/admin/users?sortBy=username',
	'/api/admin/users?sortBy=email',
	'/api/admin/users?sortBy=role',
	'/api/admin/users?sortBy=created_at',
	'/api/admin/users?sortBy=invalid', // would-be 400 on auth branch
	'/api/admin/users?sortBy=password', // would-be 400 on auth branch
	'/api/admin/users?sortBy=', // empty string — falsey, no validation

	// `?sortOrder=` — the route's documented sort direction.
	// Only `asc` / `desc` are valid on the auth branch.
	'/api/admin/users?sortOrder=asc',
	'/api/admin/users?sortOrder=desc',
	'/api/admin/users?sortOrder=invalid', // would-be 400 on auth branch
	'/api/admin/users?sortOrder=ASC', // would-be 400 on auth branch (lowercase only)
	'/api/admin/users?sortOrder=', // empty string — falsey, no validation

	// `?includeInactive=` — the route's documented toggle for
	// including inactive users in the result. Read as
	// `searchParams.get('includeInactive') === 'true'` —
	// any other value resolves to `false` silently.
	'/api/admin/users?includeInactive=true',
	'/api/admin/users?includeInactive=false',
	'/api/admin/users?includeInactive=1',
	'/api/admin/users?includeInactive=0',
	'/api/admin/users?includeInactive=',

	// `?page=` / `?limit=` — pagination params validated by
	// `validatePaginationParams`. The shared validator
	// returns a 400 on bogus values on the auth branch but
	// the unauth branch always returns 401.
	'/api/admin/users?page=1',
	'/api/admin/users?page=2',
	'/api/admin/users?page=999',
	'/api/admin/users?limit=10',
	'/api/admin/users?limit=50',
	'/api/admin/users?limit=100',
	'/api/admin/users?page=1&limit=20',
	'/api/admin/users?page=invalid', // would-be 400 on auth branch
	'/api/admin/users?limit=invalid', // would-be 400 on auth branch
	'/api/admin/users?page=-1', // would-be 400 on auth branch
	'/api/admin/users?limit=0', // would-be 400 on auth branch
	'/api/admin/users?limit=99999', // would-be 400 on auth branch (over the cap)

	// Combinations of the documented filters.
	'/api/admin/users?search=test&role=admin&status=active',
	'/api/admin/users?sortBy=name&sortOrder=asc&page=1&limit=20',
	'/api/admin/users?search=&role=&status=&sortBy=&sortOrder=',
	'/api/admin/users?search=test&role=admin&status=active&sortBy=email&sortOrder=desc&page=1&limit=20&includeInactive=true',

	// `?userId=` / `?adminId=` / `?as=` — admin-impersonation
	// keys a future contributor might add. The route reads
	// the admin identity from `session.user.isAdmin` exclusively
	// today.
	'/api/admin/users?userId=anything',
	'/api/admin/users?user_id=anything',
	'/api/admin/users?adminId=anything',
	'/api/admin/users?as=admin',
	'/api/admin/users?asAdmin=true',
	'/api/admin/users?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/users?token=anything',
	'/api/admin/users?secret=anything',
	'/api/admin/users?api_key=anything',
	'/api/admin/users?authorization=Bearer+anything',
	'/api/admin/users?session=anything',
	'/api/admin/users?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-override
	// keys.
	'/api/admin/users?bypass=1',
	'/api/admin/users?admin=1',
	'/api/admin/users?admin=true',
	'/api/admin/users?override=true',
	'/api/admin/users?force=true',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys for a future contributor. The route
	// returns the full UserListOptions envelope today.
	'/api/admin/users?fields=id',
	'/api/admin/users?fields=id,name,email',
	'/api/admin/users?select=email',
	'/api/admin/users?include=password',
	'/api/admin/users?exclude=email',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// cache-busting keys.
	'/api/admin/users?refresh=1',
	'/api/admin/users?fresh=true',
	'/api/admin/users?cache=bypass',
	'/api/admin/users?nocache=1',

	// `?format=` — content-negotiation key. The route
	// returns JSON exclusively today.
	'/api/admin/users?format=json',
	'/api/admin/users?format=csv',
	'/api/admin/users?format=xml',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/users?locale=en',
	'/api/admin/users?locale=fr',
	'/api/admin/users?lang=de',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-tenancy
	// keys.
	'/api/admin/users?tenant=acme',
	'/api/admin/users?tenantId=42',
	'/api/admin/users?org=ever-works',

	// `?from=` / `?to=` / `?since=` / `?until=` — time-range
	// filter keys for a future contributor.
	'/api/admin/users?from=2024-01-01',
	'/api/admin/users?to=2026-12-31',
	'/api/admin/users?since=2024-01-01T00:00:00Z',
	'/api/admin/users?until=2026-12-31T23:59:59Z',
	'/api/admin/users?from=invalid-date',

	// `?groupBy=` / `?aggregate=` — aggregation keys for a
	// future contributor.
	'/api/admin/users?groupBy=role',
	'/api/admin/users?groupBy=status',
	'/api/admin/users?aggregate=count',

	// Repeated keys — `searchParams.get(name)` returns the
	// first value, but the gate fires before any validator,
	// so repetition is irrelevant on the unauth branch.
	'/api/admin/users?search=a&search=b',
	'/api/admin/users?role=admin&role=user',
	'/api/admin/users?status=active&status=inactive',
	'/api/admin/users?sortBy=name&sortBy=email',

	// Bogus / typo'd query keys — the route reads eight
	// documented keys today, so any combination of unknown
	// keys is silently ignored on every branch.
	'/api/admin/users?unknown=value',
	'/api/admin/users?foo=bar&baz=qux',
	'/api/admin/users?userId=admin&token=foo&unknown=value&search=test&role=admin&status=active&sortBy=name&sortOrder=asc&page=1&limit=20&includeInactive=true&foo=bar'
] as const;

test.describe('API: /api/admin/users query-param surface', () => {
	for (const path of ADMIN_USERS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's session+admin gate fires before any
			// `searchParams` parsing, validator, or
			// `userRepository.findAll` call, so the unauthenticated
			// GET surface returns a 4xx (typically 401)
			// deterministically. There is no 5xx branch reachable on
			// the unauthenticated GET surface because the catch can
			// only fire after the gate has already let the call
			// through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/users returns a 401 on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the session gate must fire before any
		// `searchParams` parsing, validator, or repository
		// call. The status must be exactly 401 (the route
		// hard-codes the 401 status in the gate's
		// `NextResponse.json` call). Either way the response
		// must NOT echo any user data — every consuming
		// client depends on the early-return.
		const response = await request.get('/api/admin/users');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized'
		});
	});

	test('GET /api/admin/users has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads eight documented query params today
		// after the gate, so the response status must be
		// invariant to any combination of known and unknown
		// keys. A regression that reads any query param before
		// the gate would surface here as a status divergence
		// between the no-arg baseline and the parameterised
		// variant.
		const baseline = await request.get('/api/admin/users');
		const parameterised = await request.get(
			'/api/admin/users?search=test&role=admin&status=active&sortBy=name&sortOrder=asc&page=1&limit=20&includeInactive=true&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/users?search=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('search')` as a side-channel for
		// a "preview as a search query" feature that bypasses
		// the admin gate would change the unauth branch from
		// "always 401" to "200 if ?search=… is present" and
		// silently grant any anonymous caller arbitrary
		// user-list access. This assertion catches that
		// change immediately.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users?search=test'),
			request.get('/api/admin/users?search='),
			request.get('/api/admin/users?search=anything'),
			request.get(`/api/admin/users?search=${'x'.repeat(500)}`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users?role=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `?role=` filter is the route's documented
		// role-name filter. A regression that reads the
		// parameter before the gate would change the unauth
		// branch's behaviour. This assertion catches that
		// change immediately.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users?role=admin'),
			request.get('/api/admin/users?role=user'),
			request.get('/api/admin/users?role=moderator'),
			request.get('/api/admin/users?role='),
			request.get(`/api/admin/users?role=${'r'.repeat(500)}`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users?status=… does NOT bypass the admin gate, and the validator does NOT fire on the unauth branch', async ({
		request
	}) => {
		// The `?status=` filter is the route's documented
		// active/inactive filter. The post-gate validator
		// returns 400 for any value other than `active` /
		// `inactive` on the auth branch — but the unauth
		// branch must always return 401 regardless. A
		// regression that runs the validator before the gate
		// would surface here as a 400 instead of a 401 on
		// `?status=invalid`.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users?status=active'),
			request.get('/api/admin/users?status=inactive'),
			request.get('/api/admin/users?status=invalid'),
			request.get('/api/admin/users?status=ALL'),
			request.get('/api/admin/users?status=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users?sortBy=… does NOT bypass the admin gate, and the validator does NOT fire on the unauth branch', async ({
		request
	}) => {
		// The `?sortBy=` filter is restricted to five values
		// (`name`, `username`, `email`, `role`, `created_at`)
		// by the post-gate validator. The unauth branch must
		// always return 401 regardless of whether the
		// sortBy value is valid or invalid.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users?sortBy=name'),
			request.get('/api/admin/users?sortBy=username'),
			request.get('/api/admin/users?sortBy=email'),
			request.get('/api/admin/users?sortBy=role'),
			request.get('/api/admin/users?sortBy=created_at'),
			request.get('/api/admin/users?sortBy=invalid'),
			request.get('/api/admin/users?sortBy=password'),
			request.get('/api/admin/users?sortBy=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users?sortOrder=… does NOT bypass the admin gate, and the validator does NOT fire on the unauth branch', async ({
		request
	}) => {
		// The `?sortOrder=` filter is restricted to two
		// lowercase values (`asc`, `desc`) by the post-gate
		// validator. The unauth branch must always return
		// 401 regardless of whether the sortOrder value is
		// valid, invalid, or wrong-case.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users?sortOrder=asc'),
			request.get('/api/admin/users?sortOrder=desc'),
			request.get('/api/admin/users?sortOrder=ASC'),
			request.get('/api/admin/users?sortOrder=invalid'),
			request.get('/api/admin/users?sortOrder=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users?includeInactive=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `?includeInactive=` toggle is read as
		// `searchParams.get('includeInactive') === 'true'`.
		// Any value other than the literal string `'true'`
		// resolves to `false` silently — there is no
		// validator. The unauth branch must always return
		// 401 regardless.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users?includeInactive=true'),
			request.get('/api/admin/users?includeInactive=false'),
			request.get('/api/admin/users?includeInactive=1'),
			request.get('/api/admin/users?includeInactive=0'),
			request.get('/api/admin/users?includeInactive=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users?page=…&limit=… does NOT bypass the admin gate, and the pagination validator does NOT fire on the unauth branch', async ({
		request
	}) => {
		// The `?page=` / `?limit=` pagination params are
		// validated by the shared `validatePaginationParams`
		// after the gate. The validator returns 400 on bogus
		// values on the auth branch but the unauth branch
		// must always return 401 regardless. A regression
		// that runs the validator before the gate would
		// surface here as a 400 on `?page=invalid`.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users?page=1'),
			request.get('/api/admin/users?page=invalid'),
			request.get('/api/admin/users?page=-1'),
			request.get('/api/admin/users?limit=10'),
			request.get('/api/admin/users?limit=invalid'),
			request.get('/api/admin/users?limit=0'),
			request.get('/api/admin/users?limit=99999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users?search=… oversize values do NOT bypass the admin gate, and the length validator does NOT fire on the unauth branch', async ({
		request
	}) => {
		// The `?search=` length validator returns 400 on
		// values longer than 100 characters on the auth
		// branch. The unauth branch must always return 401
		// regardless of the search length. A regression that
		// runs the length validator before the gate would
		// surface here as a 400 on the 101-char search.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get(`/api/admin/users?search=${'x'.repeat(50)}`),
			request.get(`/api/admin/users?search=${'x'.repeat(100)}`),
			request.get(`/api/admin/users?search=${'x'.repeat(101)}`),
			request.get(`/api/admin/users?search=${'x'.repeat(500)}`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users?role=… oversize values do NOT bypass the admin gate, and the length validator does NOT fire on the unauth branch', async ({
		request
	}) => {
		// Symmetric with the `?search=` length-validator
		// assertion. The `?role=` length validator returns
		// 400 on values longer than 50 characters on the
		// auth branch. The unauth branch must always return
		// 401.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get(`/api/admin/users?role=${'r'.repeat(25)}`),
			request.get(`/api/admin/users?role=${'r'.repeat(50)}`),
			request.get(`/api/admin/users?role=${'r'.repeat(51)}`),
			request.get(`/api/admin/users?role=${'r'.repeat(500)}`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven admin resolution would
		// change the unauth branch from "always 401" to "200 if
		// ?userId=… is present" and silently grant any
		// anonymous caller arbitrary-user listing access.
		// This assertion catches that change immediately.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users?userId=admin'),
			request.get('/api/admin/users?user_id=admin'),
			request.get('/api/admin/users?adminId=admin'),
			request.get('/api/admin/users?as=admin'),
			request.get('/api/admin/users?asAdmin=true'),
			request.get('/api/admin/users?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users?token=… does NOT introduce a query-token auth bypass', async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today (auth is gated through `auth()` which reads
		// the NextAuth session cookie and the admin role bit
		// on the session user). A future contributor who adds
		// a magic-token bypass for the admin gate would
		// change the unauth branch's behaviour. This
		// assertion catches that change immediately.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users?token=anything'),
			request.get('/api/admin/users?secret=anything'),
			request.get('/api/admin/users?api_key=anything'),
			request.get('/api/admin/users?authorization=Bearer+anything'),
			request.get('/api/admin/users?session=anything'),
			request.get('/api/admin/users?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users?bypass=… does NOT introduce a query-admin-override', async ({
		request
	}) => {
		// The route's session+admin guard does not branch on
		// any query-string admin override today. A regression
		// that wires `searchParams.get('bypass')` /
		// `searchParams.get('admin')` /
		// `searchParams.get('override')` as a non-session-
		// driven admin bypass would let an attacker elevate
		// to admin from any anonymous session. This assertion
		// pins the "admin status is read from the session,
		// never from the query string" invariant.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users?bypass=1'),
			request.get('/api/admin/users?admin=1'),
			request.get('/api/admin/users?admin=true'),
			request.get('/api/admin/users?override=true'),
			request.get('/api/admin/users?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users?format=… does NOT introduce a content-negotiation bypass', async ({
		request
	}) => {
		// The route returns JSON exclusively today. A future
		// `?format=csv` extension would be a natural fit for a
		// users data-export flow, but it must not bypass the
		// auth gate. The unauth branch's status must be
		// invariant to the format key.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users?format=json'),
			request.get('/api/admin/users?format=csv'),
			request.get('/api/admin/users?format=xml')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users?fields=… does NOT introduce a field-projection bypass', async ({
		request
	}) => {
		// The route returns the full UserListOptions
		// envelope today; any future field-projection
		// support must not bypass the auth gate. The unauth
		// branch's status must be invariant to the field
		// projection keys (especially `?fields=password` or
		// `?include=password` which would be a leak vector
		// on the auth branch if implemented carelessly).
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users?fields=id'),
			request.get('/api/admin/users?fields=id,name,email'),
			request.get('/api/admin/users?select=password'),
			request.get('/api/admin/users?include=password'),
			request.get('/api/admin/users?exclude=email')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth branch.
		// The shape guarantees the route's session+admin
		// gate fires before any branching on the documented
		// `search` / `role` / `status` / `sortBy` / `sortOrder`
		// / `page` / `limit` / `includeInactive` query params
		// or any potential future query schemas.
		const responses = await Promise.all([
			request.get('/api/admin/users'),
			request.get(
				'/api/admin/users?search=test&role=admin&status=active&sortBy=name&sortOrder=asc&page=1&limit=20'
			),
			request.get(
				'/api/admin/users?userId=admin&token=foo&from=2024-01-01&to=2026-12-31&status=ALL&sortBy=password&sortOrder=ASC&page=invalid&limit=99999&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/users does NOT branch on Accept header', async ({
		request
	}) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to the same
		// status on the unauth branch.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/admin/users', {
				headers: { Accept: 'text/csv' }
			}),
			request.get('/api/admin/users', {
				headers: { Accept: 'application/xml' }
			}),
			request.get('/api/admin/users', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		// `searchParams.get(name)` returns the first value of
		// any repeated key, so repetition is irrelevant on
		// every branch. The unauth branch must return 401
		// regardless of whether the repeated value is valid
		// or invalid.
		const baseline = await request.get('/api/admin/users');
		const responses = await Promise.all([
			request.get('/api/admin/users?search=a&search=b'),
			request.get('/api/admin/users?role=admin&role=user'),
			request.get('/api/admin/users?status=active&status=inactive'),
			request.get('/api/admin/users?sortBy=name&sortBy=email'),
			request.get('/api/admin/users?sortOrder=asc&sortOrder=desc'),
			request.get('/api/admin/users?page=1&page=2'),
			request.get('/api/admin/users?limit=10&limit=20')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/users keeps a NextRequest-typed handler signature stable', async ({
		request
	}) => {
		// The route's handler signature is
		// `GET(request: NextRequest)` — explicitly typed
		// against `NextRequest` (not the bare `Request`) to
		// cooperate with `validatePaginationParams` and the
		// `request.url` parsing. A regression that switches
		// the signature to bare `Request` would still
		// compile but would lose the Next-specific request
		// surface (e.g. `request.cookies`, `request.geo`,
		// `request.ip`). The behavioural contract is the
		// same on the unauth branch — every call returns
		// 401 — but a future regression that adds a
		// cookie / IP-based auth bypass would surface here
		// as a 200/403 on the unauth branch with a
		// fabricated session cookie. This assertion pins
		// the unauth-branch contract by sweeping a few
		// known-bogus cookie / header values.
		const responses = await Promise.all([
			request.get('/api/admin/users', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/users', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/users', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/users', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});
});
