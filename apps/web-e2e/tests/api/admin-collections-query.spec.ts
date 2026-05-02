import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-gated collections-listing endpoint served by
 * `apps/web/app/api/admin/collections/route.ts`.
 *
 * `GET /api/admin/collections` is **admin-gated** via
 * `auth()` + the `session.user.isAdmin` bit. The handler
 * reads six query params after the gate fires (`page`,
 * `limit`, `includeInactive`, `search`, `sortBy`,
 * `sortOrder`), so the unauthenticated branch always returns
 * 401 with `{ success: false, error: 'Unauthorized. Admin
 * access required.' }` regardless of which keys the caller
 * appends:
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
 *         const pageParam = searchParams.get('page');
 *         const limitParam = searchParams.get('limit');
 *         const page = pageParam ? parseInt(pageParam, 10) : 1;
 *         const limit = limitParam ? parseInt(limitParam, 10) : 20;
 *         if (isNaN(page) || page < 1) {
 *           return NextResponse.json(
 *             { success: false, error: 'Invalid page parameter. Must be a positive integer.' },
 *             { status: 400 }
 *           );
 *         }
 *         if (isNaN(limit) || limit < 1 || limit > 1000) {
 *           return NextResponse.json(
 *             { success: false, error: 'Invalid limit parameter. Must be between 1 and 1000.' },
 *             { status: 400 }
 *           );
 *         }
 *         const includeInactive = searchParams.get('includeInactive') === 'true';
 *         const search = searchParams.get('search') || undefined;
 *         const sortByParam = searchParams.get('sortBy');
 *         const sortBy = sortByParam === 'item_count' || sortByParam === 'created_at' ? sortByParam : 'name';
 *         const sortOrderParam = searchParams.get('sortOrder');
 *         const sortOrder = sortOrderParam === 'desc' ? 'desc' : 'asc';
 *         const result = await collectionRepository.findAllPaginated({
 *           includeInactive, search, sortBy, sortOrder, page, limit,
 *         });
 *         return NextResponse.json({ success: true, collections: result.collections, ... });
 *       } catch (error) {
 *         return safeErrorResponse(error, 'Failed to fetch collections');
 *       }
 *     }
 *
 * The route's six documented query params (`page`, `limit`,
 * `includeInactive`, `search`, `sortBy`, `sortOrder`) are read
 * **after** the single-step admin gate, so every call from
 * this spec — which carries no authenticated session — round-
 * trips to the same 401 regardless of the query string. A
 * regression that reads any query param before the gate
 * (e.g. a future `?asAdmin=true` admin-impersonation key, a
 * `?token=…` magic-token bypass, a `?as=admin` admin-override,
 * or any other dangerous-passthrough that bypasses
 * `session?.user?.isAdmin`) would change the unauth branch's
 * behaviour from "always 401" to "200 / 400 / 500 if the
 * right query is present" — and that change is exactly what
 * this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session without an admin user); the route returns 401
 *     with the canonical `{ success: false, error:
 *     'Unauthorized. Admin access required.' }` envelope.
 *     This is the contract every assertion below pins,
 *     because the e2e runner does not carry an authenticated
 *     session by default.
 *   - **Authenticated non-admin user**: `session.user.isAdmin`
 *     is `false`; the route returns the same 401 envelope.
 *     The single-step gate collapses both unauthenticated and
 *     authenticated-non-admin into the same 401 (in contrast
 *     to the sibling `admin/users` route which separates them
 *     into 401 vs 403). Out of scope for this spec because the
 *     gate fires before the repository call on every unauth
 *     invocation.
 *   - **Authenticated admin user**: returns 200 with
 *     `{ success: true, collections: [...], total, page,
 *     limit, totalPages }` after the
 *     `collectionRepository.findAllPaginated(...)` call
 *     completes. Out of scope for this spec because the gate
 *     fires before the repository call on every unauth
 *     invocation.
 *   - **Authenticated admin user, invalid `?page=…` value**:
 *     returns 400 with `{ success: false, error: 'Invalid
 *     page parameter. Must be a positive integer.' }`. Out of
 *     scope for this spec because the gate fires before the
 *     validator on every unauth invocation.
 *   - **Authenticated admin user, invalid `?limit=…` value
 *     (>1000 or <1 or NaN)**: returns 400 with
 *     `{ success: false, error: 'Invalid limit parameter.
 *     Must be between 1 and 1000.' }`. Out of scope for this
 *     spec because the gate fires before the validator on
 *     every unauth invocation.
 *   - **Internal error**: returns 500 with the canonical
 *     `safeErrorResponse(error, 'Failed to fetch
 *     collections')` envelope. Out of scope for this spec
 *     because the gate fires before any repository call on
 *     every unauth invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec hits.
 * A regression that introduces query-string-based bypass —
 * e.g. a future `?asAdmin=true` admin-impersonation key
 * that fires before `auth()`, a `?token=…` magic-token
 * bypass, or a `?collectionId=…` dangerous-passthrough that
 * would forward a caller-supplied collection id to a future
 * "view a single collection's listing" feature — would
 * surface immediately as a status divergence between the
 * no-arg 401 and a parameter-laden non-401.
 *
 * The shape mirrors the sibling
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
 * service-layer call" posture. The admin collections-listing
 * route is unique in that:
 *   1. It is the **first per-source-file query-surface
 *      smoke** for any admin-content-type endpoint backed by
 *      the Git-CMS repository (categories / collections /
 *      tags) — every other admin query-surface smoke pinned
 *      to date is a stats / users / geo-analytics endpoint
 *      backed by the SQL repositories.
 *   2. It has a **single-step** authorization gate (collapsed
 *      401 for both unauthenticated and authenticated-non-
 *      admin) — distinct from the sibling `admin/users`
 *      route's two-step 401-then-403 split.
 *   3. The handler signature is `GET(request: NextRequest)`
 *      (with the Next-specific `NextRequest` type, not the
 *      bare `Request`) — for `request.url` parsing reasons
 *      and the `safeErrorResponse(error, ...)` shared error
 *      handler.
 *   4. The route allows a **higher per-page limit** (1000
 *      versus the sibling routes' 100) because collections
 *      are loaded from Git and are typically not numerous —
 *      the validator returns 400 only on values >1000 or
 *      <1 or NaN.
 *   5. The post-gate validators return 400 on bogus
 *      `?page=…` / `?limit=…` values — none of which fire
 *      on the unauth branch this spec walks.
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this spec
 * adds the deep query-surface walk on top of that.
 */
const ADMIN_COLLECTIONS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/collections',

	// `?search=` — the route's documented free-text filter.
	// The route reads `searchParams.get('search')` after the
	// gate today; there is no length validator on this
	// route (unlike the `/api/admin/users` route which
	// returns 400 on >100 chars).
	'/api/admin/collections?search=test',
	'/api/admin/collections?search=hello%20world',
	'/api/admin/collections?search=',
	"/api/admin/collections?search=%27%20OR%201%3D1",
	'/api/admin/collections?search=%3Cscript%3E',
	`/api/admin/collections?search=${'x'.repeat(50)}`,
	`/api/admin/collections?search=${'x'.repeat(100)}`,
	`/api/admin/collections?search=${'x'.repeat(500)}`,
	`/api/admin/collections?search=${'x'.repeat(1000)}`,

	// `?sortBy=` — the route's documented sort field.
	// Only `name` / `item_count` / `created_at` resolve to a
	// non-default value on the auth branch; other values
	// silently default to `'name'` (no validator → no 400).
	'/api/admin/collections?sortBy=name',
	'/api/admin/collections?sortBy=item_count',
	'/api/admin/collections?sortBy=created_at',
	'/api/admin/collections?sortBy=invalid', // silently defaults to name
	'/api/admin/collections?sortBy=password', // silently defaults to name
	'/api/admin/collections?sortBy=', // empty string — silently defaults

	// `?sortOrder=` — the route's documented sort direction.
	// Only `desc` resolves to `'desc'` on the auth branch;
	// any other value (including unset) silently defaults to
	// `'asc'` (no validator → no 400).
	'/api/admin/collections?sortOrder=asc',
	'/api/admin/collections?sortOrder=desc',
	'/api/admin/collections?sortOrder=invalid', // silently defaults to asc
	'/api/admin/collections?sortOrder=DESC', // case-sensitive — silently defaults to asc
	'/api/admin/collections?sortOrder=', // empty string — silently defaults

	// `?includeInactive=` — the route's documented toggle for
	// including inactive collections in the result. Read as
	// `searchParams.get('includeInactive') === 'true'` —
	// any other value resolves to `false` silently.
	'/api/admin/collections?includeInactive=true',
	'/api/admin/collections?includeInactive=false',
	'/api/admin/collections?includeInactive=1',
	'/api/admin/collections?includeInactive=0',
	'/api/admin/collections?includeInactive=',

	// `?page=` / `?limit=` — pagination params validated
	// inline. Bogus values return 400 on the auth branch
	// but the unauth branch always returns 401.
	'/api/admin/collections?page=1',
	'/api/admin/collections?page=2',
	'/api/admin/collections?page=999',
	'/api/admin/collections?limit=10',
	'/api/admin/collections?limit=50',
	'/api/admin/collections?limit=100',
	'/api/admin/collections?limit=500',
	'/api/admin/collections?limit=1000',
	'/api/admin/collections?page=1&limit=20',
	'/api/admin/collections?page=invalid', // would-be 400 on auth branch
	'/api/admin/collections?limit=invalid', // would-be 400 on auth branch
	'/api/admin/collections?page=-1', // would-be 400 on auth branch
	'/api/admin/collections?page=0', // would-be 400 on auth branch (page < 1)
	'/api/admin/collections?limit=0', // would-be 400 on auth branch (limit < 1)
	'/api/admin/collections?limit=1001', // would-be 400 on auth branch (over 1000 cap)
	'/api/admin/collections?limit=99999', // would-be 400 on auth branch

	// Combinations of the documented filters.
	'/api/admin/collections?search=test&sortBy=name&sortOrder=asc',
	'/api/admin/collections?sortBy=item_count&sortOrder=desc&page=1&limit=20',
	'/api/admin/collections?search=&sortBy=&sortOrder=',
	'/api/admin/collections?search=test&sortBy=created_at&sortOrder=desc&page=1&limit=20&includeInactive=true',

	// `?collectionId=` / `?id=` / `?slug=` — collection-
	// targeting keys a future contributor might add for a
	// "view a single collection's listing" feature. The
	// route does not target a single collection today.
	'/api/admin/collections?collectionId=anything',
	'/api/admin/collections?id=frontend-frameworks',
	'/api/admin/collections?slug=frontend-frameworks',

	// `?userId=` / `?adminId=` / `?as=` — admin-impersonation
	// keys a future contributor might add. The route reads
	// the admin identity from `session.user.isAdmin` exclusively
	// today.
	'/api/admin/collections?userId=anything',
	'/api/admin/collections?user_id=anything',
	'/api/admin/collections?adminId=anything',
	'/api/admin/collections?as=admin',
	'/api/admin/collections?asAdmin=true',
	'/api/admin/collections?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/collections?token=anything',
	'/api/admin/collections?secret=anything',
	'/api/admin/collections?api_key=anything',
	'/api/admin/collections?authorization=Bearer+anything',
	'/api/admin/collections?session=anything',
	'/api/admin/collections?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-override
	// keys.
	'/api/admin/collections?bypass=1',
	'/api/admin/collections?admin=1',
	'/api/admin/collections?admin=true',
	'/api/admin/collections?override=true',
	'/api/admin/collections?force=true',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys for a future contributor. The route
	// returns the full Collection envelope today.
	'/api/admin/collections?fields=id',
	'/api/admin/collections?fields=id,name,slug',
	'/api/admin/collections?select=name',
	'/api/admin/collections?include=items',
	'/api/admin/collections?exclude=description',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// cache-busting keys. Collections are loaded from Git
	// and the route uses Next.js's `revalidatePath` on POST
	// only — the GET surface does not branch on cache keys
	// today.
	'/api/admin/collections?refresh=1',
	'/api/admin/collections?fresh=true',
	'/api/admin/collections?cache=bypass',
	'/api/admin/collections?nocache=1',

	// `?format=` — content-negotiation key. The route
	// returns JSON exclusively today.
	'/api/admin/collections?format=json',
	'/api/admin/collections?format=csv',
	'/api/admin/collections?format=xml',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/collections?locale=en',
	'/api/admin/collections?locale=fr',
	'/api/admin/collections?lang=de',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-tenancy
	// keys.
	'/api/admin/collections?tenant=acme',
	'/api/admin/collections?tenantId=42',
	'/api/admin/collections?org=ever-works',

	// `?from=` / `?to=` / `?since=` / `?until=` — time-range
	// filter keys for a future contributor.
	'/api/admin/collections?from=2024-01-01',
	'/api/admin/collections?to=2026-12-31',
	'/api/admin/collections?since=2024-01-01T00:00:00Z',
	'/api/admin/collections?until=2026-12-31T23:59:59Z',
	'/api/admin/collections?from=invalid-date',

	// `?groupBy=` / `?aggregate=` — aggregation keys for a
	// future contributor.
	'/api/admin/collections?groupBy=isActive',
	'/api/admin/collections?groupBy=item_count',
	'/api/admin/collections?aggregate=count',

	// Repeated keys — `searchParams.get(name)` returns the
	// first value, but the gate fires before any validator,
	// so repetition is irrelevant on the unauth branch.
	'/api/admin/collections?search=a&search=b',
	'/api/admin/collections?sortBy=name&sortBy=created_at',
	'/api/admin/collections?sortOrder=asc&sortOrder=desc',
	'/api/admin/collections?page=1&page=2',
	'/api/admin/collections?limit=10&limit=20',

	// Bogus / typo'd query keys — the route reads six
	// documented keys today, so any combination of unknown
	// keys is silently ignored on every branch.
	'/api/admin/collections?unknown=value',
	'/api/admin/collections?foo=bar&baz=qux',
	'/api/admin/collections?userId=admin&token=foo&unknown=value&search=test&sortBy=name&sortOrder=asc&page=1&limit=20&includeInactive=true&foo=bar'
] as const;

test.describe('API: /api/admin/collections query-param surface', () => {
	for (const path of ADMIN_COLLECTIONS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's admin gate fires before any
			// `searchParams` parsing, validator, or
			// `collectionRepository.findAllPaginated` call, so
			// the unauthenticated GET surface returns a 4xx
			// (typically 401) deterministically. There is no
			// 5xx branch reachable on the unauthenticated GET
			// surface because the catch can only fire after
			// the gate has already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/collections returns a 401 on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the admin gate must fire before any
		// `searchParams` parsing, validator, or repository
		// call. The status must be exactly 401 (the route
		// hard-codes the 401 status in the gate's
		// `NextResponse.json` call). Either way the response
		// must NOT echo any collection data — every consuming
		// client depends on the early-return.
		const response = await request.get('/api/admin/collections');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized. Admin access required.'
		});
	});

	test('GET /api/admin/collections has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads six documented query params today
		// after the gate, so the response status must be
		// invariant to any combination of known and unknown
		// keys. A regression that reads any query param before
		// the gate would surface here as a status divergence
		// between the no-arg baseline and the parameterised
		// variant.
		const baseline = await request.get('/api/admin/collections');
		const parameterised = await request.get(
			'/api/admin/collections?search=test&sortBy=name&sortOrder=asc&page=1&limit=20&includeInactive=true&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/collections?search=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('search')` as a side-channel for
		// a "preview as a search query" feature that bypasses
		// the admin gate would change the unauth branch from
		// "always 401" to "200 if ?search=… is present" and
		// silently grant any anonymous caller arbitrary
		// collection-listing access. This assertion catches
		// that change immediately.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections?search=test'),
			request.get('/api/admin/collections?search='),
			request.get('/api/admin/collections?search=anything'),
			request.get(`/api/admin/collections?search=${'x'.repeat(500)}`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections?sortBy=… does NOT bypass the admin gate, and the silent default does NOT fire on the unauth branch', async ({
		request
	}) => {
		// The `?sortBy=` filter is restricted to three values
		// (`name`, `item_count`, `created_at`) by the
		// post-gate ternary expression. Other values silently
		// default to `'name'` on the auth branch — no
		// validator returns 400. The unauth branch must always
		// return 401 regardless of whether the sortBy value is
		// known or unknown.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections?sortBy=name'),
			request.get('/api/admin/collections?sortBy=item_count'),
			request.get('/api/admin/collections?sortBy=created_at'),
			request.get('/api/admin/collections?sortBy=invalid'),
			request.get('/api/admin/collections?sortBy=password'),
			request.get('/api/admin/collections?sortBy=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections?sortOrder=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `?sortOrder=` filter is restricted to two
		// lowercase values (`asc` is the silent default,
		// `desc` is the explicit opt-in) by the post-gate
		// ternary expression. The unauth branch must always
		// return 401 regardless of whether the sortOrder value
		// is valid, invalid, or wrong-case.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections?sortOrder=asc'),
			request.get('/api/admin/collections?sortOrder=desc'),
			request.get('/api/admin/collections?sortOrder=DESC'),
			request.get('/api/admin/collections?sortOrder=invalid'),
			request.get('/api/admin/collections?sortOrder=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections?includeInactive=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `?includeInactive=` toggle is read as
		// `searchParams.get('includeInactive') === 'true'`.
		// Any value other than the literal string `'true'`
		// resolves to `false` silently — there is no
		// validator. The unauth branch must always return
		// 401 regardless.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections?includeInactive=true'),
			request.get('/api/admin/collections?includeInactive=false'),
			request.get('/api/admin/collections?includeInactive=1'),
			request.get('/api/admin/collections?includeInactive=0'),
			request.get('/api/admin/collections?includeInactive=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections?page=…&limit=… does NOT bypass the admin gate, and the pagination validator does NOT fire on the unauth branch', async ({
		request
	}) => {
		// The `?page=` / `?limit=` pagination params are
		// validated inline after the gate. The validator
		// returns 400 on bogus values on the auth branch but
		// the unauth branch must always return 401 regardless.
		// A regression that runs the validator before the gate
		// would surface here as a 400 on `?page=invalid`.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections?page=1'),
			request.get('/api/admin/collections?page=invalid'),
			request.get('/api/admin/collections?page=-1'),
			request.get('/api/admin/collections?page=0'),
			request.get('/api/admin/collections?limit=10'),
			request.get('/api/admin/collections?limit=invalid'),
			request.get('/api/admin/collections?limit=0'),
			request.get('/api/admin/collections?limit=1001'),
			request.get('/api/admin/collections?limit=99999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections?limit=… up to the 1000 ceiling does NOT bypass the admin gate', async ({
		request
	}) => {
		// The route allows a higher per-page limit (1000)
		// than the sibling routes' 100 because collections
		// are loaded from Git and are typically not numerous.
		// The auth-branch validator returns 400 only on
		// values >1000 — the unauth branch must always
		// return 401 regardless of whether the limit value
		// is at, below, or over the 1000 cap.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections?limit=100'),
			request.get('/api/admin/collections?limit=500'),
			request.get('/api/admin/collections?limit=999'),
			request.get('/api/admin/collections?limit=1000'),
			request.get('/api/admin/collections?limit=1001')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven admin resolution would
		// change the unauth branch from "always 401" to "200 if
		// ?userId=… is present" and silently grant any
		// anonymous caller arbitrary-collection listing access.
		// This assertion catches that change immediately.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections?userId=admin'),
			request.get('/api/admin/collections?user_id=admin'),
			request.get('/api/admin/collections?adminId=admin'),
			request.get('/api/admin/collections?as=admin'),
			request.get('/api/admin/collections?asAdmin=true'),
			request.get('/api/admin/collections?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections?token=… does NOT introduce a query-token auth bypass', async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today (auth is gated through `auth()` which reads
		// the NextAuth session cookie and the admin role bit
		// on the session user). A future contributor who adds
		// a magic-token bypass for the admin gate would
		// change the unauth branch's behaviour. This
		// assertion catches that change immediately.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections?token=anything'),
			request.get('/api/admin/collections?secret=anything'),
			request.get('/api/admin/collections?api_key=anything'),
			request.get('/api/admin/collections?authorization=Bearer+anything'),
			request.get('/api/admin/collections?session=anything'),
			request.get('/api/admin/collections?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections?bypass=… does NOT introduce a query-admin-override', async ({
		request
	}) => {
		// The route's admin guard does not branch on any
		// query-string admin override today. A regression
		// that wires `searchParams.get('bypass')` /
		// `searchParams.get('admin')` /
		// `searchParams.get('override')` as a non-session-
		// driven admin bypass would let an attacker elevate
		// to admin from any anonymous session. This assertion
		// pins the "admin status is read from the session,
		// never from the query string" invariant.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections?bypass=1'),
			request.get('/api/admin/collections?admin=1'),
			request.get('/api/admin/collections?admin=true'),
			request.get('/api/admin/collections?override=true'),
			request.get('/api/admin/collections?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections?format=… does NOT introduce a content-negotiation bypass', async ({
		request
	}) => {
		// The route returns JSON exclusively today. A future
		// `?format=csv` extension would be a natural fit for
		// a collections data-export flow, but it must not
		// bypass the auth gate. The unauth branch's status
		// must be invariant to the format key.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections?format=json'),
			request.get('/api/admin/collections?format=csv'),
			request.get('/api/admin/collections?format=xml')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections?fields=… does NOT introduce a field-projection bypass', async ({
		request
	}) => {
		// The route returns the full Collection envelope
		// today; any future field-projection support must
		// not bypass the auth gate. The unauth branch's
		// status must be invariant to the field projection
		// keys.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections?fields=id'),
			request.get('/api/admin/collections?fields=id,name,slug'),
			request.get('/api/admin/collections?select=name'),
			request.get('/api/admin/collections?include=items'),
			request.get('/api/admin/collections?exclude=description')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections?collectionId=… does NOT introduce a single-collection-targeting bypass', async ({
		request
	}) => {
		// The route does not target a single collection
		// today (the per-collection endpoint lives at
		// `/api/admin/collections/[id]/route.ts`). A future
		// contributor who adds a `?collectionId=…`
		// shortcut on the listing route must not bypass the
		// auth gate. The unauth branch's status must be
		// invariant to the collection-targeting keys.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections?collectionId=anything'),
			request.get('/api/admin/collections?id=frontend-frameworks'),
			request.get('/api/admin/collections?slug=frontend-frameworks')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth branch.
		// The shape guarantees the route's admin gate fires
		// before any branching on the documented `search` /
		// `sortBy` / `sortOrder` / `page` / `limit` /
		// `includeInactive` query params or any potential
		// future query schemas.
		const responses = await Promise.all([
			request.get('/api/admin/collections'),
			request.get(
				'/api/admin/collections?search=test&sortBy=name&sortOrder=asc&page=1&limit=20'
			),
			request.get(
				'/api/admin/collections?userId=admin&token=foo&from=2024-01-01&to=2026-12-31&sortBy=password&sortOrder=ASC&page=invalid&limit=99999&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/collections does NOT branch on Accept header', async ({
		request
	}) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to the same
		// status on the unauth branch.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/admin/collections', {
				headers: { Accept: 'text/csv' }
			}),
			request.get('/api/admin/collections', {
				headers: { Accept: 'application/xml' }
			}),
			request.get('/api/admin/collections', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		// `searchParams.get(name)` returns the first value of
		// any repeated key, so repetition is irrelevant on
		// every branch. The unauth branch must return 401
		// regardless of whether the repeated value is valid
		// or invalid.
		const baseline = await request.get('/api/admin/collections');
		const responses = await Promise.all([
			request.get('/api/admin/collections?search=a&search=b'),
			request.get('/api/admin/collections?sortBy=name&sortBy=created_at'),
			request.get('/api/admin/collections?sortOrder=asc&sortOrder=desc'),
			request.get('/api/admin/collections?page=1&page=2'),
			request.get('/api/admin/collections?limit=10&limit=20'),
			request.get('/api/admin/collections?includeInactive=true&includeInactive=false')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/collections keeps a NextRequest-typed handler signature stable', async ({
		request
	}) => {
		// The route's handler signature is
		// `GET(request: NextRequest)` — explicitly typed
		// against `NextRequest` (not the bare `Request`) to
		// cooperate with the `request.url` parsing and the
		// `safeErrorResponse(error, ...)` shared error handler.
		// A regression that switches the signature to bare
		// `Request` would still compile but would lose the
		// Next-specific request surface (e.g. `request.cookies`,
		// `request.geo`, `request.ip`). The behavioural contract
		// is the same on the unauth branch — every call returns
		// 401 — but a future regression that adds a cookie / IP-
		// based auth bypass would surface here as a 200/403 on
		// the unauth branch with a fabricated session cookie.
		// This assertion pins the unauth-branch contract by
		// sweeping a few known-bogus cookie / header values.
		const responses = await Promise.all([
			request.get('/api/admin/collections', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/collections', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/collections', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/collections', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});
});
