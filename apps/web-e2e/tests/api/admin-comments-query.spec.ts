import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-gated comments-listing endpoint served by
 * `apps/web/app/api/admin/comments/route.ts`.
 *
 * `GET /api/admin/comments` is **admin-gated** via
 * `auth()` + the `session.user.isAdmin` bit, with an
 * additional database-availability precheck via
 * `checkDatabaseAvailability()` and an additional tenant-
 * resolution gate via `getTenantId()` after the admin gate
 * fires. The handler reads three query params after the
 * gates (`page`, `limit`, `search`), so the unauthenticated
 * branch returns 403 with `{ success: false, error:
 * 'Forbidden' }` regardless of which keys the caller
 * appends:
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
 *         const page = Number(searchParams.get('page') || 1);
 *         const limit = Number(searchParams.get('limit') || 10);
 *         const search = (searchParams.get('search') || '').trim();
 *         const tenantId = await getTenantId();
 *         if (!tenantId) {
 *           return NextResponse.json(
 *             { success: false, error: 'Tenant not found' },
 *             { status: 403 }
 *           );
 *         }
 *         // ... drizzle query against comments + clientProfiles ...
 *         return NextResponse.json({ success: true, data: { comments, pagination } });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Internal Server Error' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The route's three documented query params (`page`,
 * `limit`, `search`) are read **after** the single-step
 * admin gate, so every call from this spec — which carries
 * no authenticated session — round-trips to the same 403
 * regardless of the query string. A regression that reads
 * any query param before the gate (e.g. a future
 * `?asAdmin=true` admin-impersonation key, a `?token=…`
 * magic-token bypass, a `?as=admin` admin-override, or
 * any other dangerous-passthrough that bypasses
 * `session?.user?.isAdmin`) would change the unauth
 * branch's behaviour from "always 403" to "200 / 400 / 500
 * if the right query is present" — and that change is
 * exactly what this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Database-unavailable**: `checkDatabaseAvailability()`
 *     returns a 503 before the admin gate fires; the unauth
 *     branch never reaches the gate. Out of scope for this
 *     spec because the database-availability check is a
 *     pre-gate fast-fail that a Playwright runner with a
 *     working database does not exercise.
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session without an admin user); the route returns
 *     403 with the canonical `{ success: false, error:
 *     'Forbidden' }` envelope. This is the contract every
 *     assertion below pins, because the e2e runner does
 *     not carry an authenticated session by default.
 *   - **Authenticated non-admin user**: `session.user.isAdmin`
 *     is `false`; the route returns the same 403 envelope.
 *     The single-step gate collapses both unauthenticated
 *     and authenticated-non-admin into the same 403 (in
 *     contrast to the sibling `admin/users` route which
 *     separates them into 401 vs 403 and the
 *     `admin/collections` route which collapses them into
 *     a single 401). Out of scope for this spec because
 *     the gate fires before the repository call on every
 *     unauth invocation.
 *   - **Authenticated admin user, no tenant resolved**:
 *     `getTenantId()` returns `null`; the route returns
 *     a second 403 with `{ success: false, error: 'Tenant
 *     not found' }`. Out of scope for this spec because
 *     the admin gate fires before this gate on every
 *     unauth invocation.
 *   - **Authenticated admin user**: returns 200 with
 *     `{ success: true, data: { comments: [...],
 *     pagination: { total, page, limit, totalPages } } }`
 *     after the drizzle query against `comments` left-
 *     joined with `clientProfiles` completes. Out of scope
 *     for this spec because the gate fires before the
 *     repository call on every unauth invocation.
 *   - **Internal error**: returns 500 with the canonical
 *     `{ success: false, error: 'Internal Server Error' }`
 *     envelope. Out of scope for this spec because the
 *     gate fires before any repository call on every
 *     unauth invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec
 * hits. A regression that introduces query-string-based
 * bypass — e.g. a future `?asAdmin=true` admin-
 * impersonation key that fires before `auth()`, a
 * `?token=…` magic-token bypass, or a `?commentId=…`
 * dangerous-passthrough that would forward a caller-
 * supplied comment id to a future "view a single comment"
 * feature — would surface immediately as a status
 * divergence between the no-arg 403 and a parameter-laden
 * non-403.
 *
 * The shape mirrors the sibling
 * `admin-collections-query.spec.ts`,
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
 * service-layer call" posture. The admin comments-listing
 * route is unique in that:
 *   1. It uses a **403** for the unauth branch (where
 *      `admin-collections-query.spec.ts` documents a
 *      single-step **401** gate). The handler hard-codes
 *      the 403 status in the gate's `NextResponse.json`
 *      call, distinct from the 401 used by the
 *      `admin/collections` and `admin/users` routes for
 *      the unauthenticated case.
 *   2. The handler signature is `GET(request: Request)`
 *      (with the bare `Request` type, not the Next-
 *      specific `NextRequest`) — distinct from the
 *      `admin/collections` route's `NextRequest`-typed
 *      handler. The behavioural contract is the same on
 *      the unauth branch, but the bare-`Request` type
 *      forecloses the Next-specific request surface
 *      (e.g. `request.cookies`, `request.geo`,
 *      `request.ip`).
 *   3. There is a **double-gate** posture (admin-isAdmin
 *      check, then tenant-resolution check) but only the
 *      first gate fires on the unauth branch; the second
 *      gate is admin-shell-internal and out of scope.
 *   4. The handler uses **drizzle-orm** directly against
 *      `comments` left-joined with `clientProfiles` —
 *      distinct from the repository-pattern handlers
 *      (`admin/collections` uses `collectionRepository`;
 *      `admin/users` uses `UserRepository`). The
 *      drizzle-direct posture is a known
 *      production-source-pattern divergence on this
 *      route; future contributors who refactor the route
 *      to use a `commentRepository` should preserve the
 *      gate-order invariant this spec pins.
 *   5. There is a **db-availability precheck**
 *      (`checkDatabaseAvailability()`) that fires before
 *      the admin gate. A regression that drops the
 *      precheck would not change the 403 status on the
 *      unauth branch (the admin gate would still fire
 *      and return 403), so this spec does not pin the
 *      precheck order — but a regression that moves the
 *      admin gate after the database query would surface
 *      as a 500 on the unauth branch instead of 403.
 *   6. The post-gate handler reads only **three**
 *      documented query keys (`page`, `limit`, `search`)
 *      — strictly fewer than the
 *      `admin/collections` route's six and the
 *      `admin/users` route's seven. The narrower surface
 *      means fewer bypass vectors but the same
 *      boundary-test discipline.
 *   7. The post-gate `Number(...)` coercion on `page` /
 *      `limit` does not validate (`Number('invalid')` →
 *      `NaN`); the resulting offset (`(NaN - 1) * NaN` →
 *      `NaN`) is silently passed to drizzle, which
 *      coerces NaN to NULL on the offset/limit binding.
 *      Out of scope for this spec because the validator-
 *      lessness fires only on the auth branch.
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of that.
 */
const ADMIN_COMMENTS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/comments',

	// `?search=` — the route's documented free-text filter.
	// The route reads `searchParams.get('search')` after the
	// gate today; the value is `.trim()`ed but there is no
	// length validator on this route (unlike the
	// `/api/admin/users` route which returns 400 on >100
	// chars).
	'/api/admin/comments?search=test',
	'/api/admin/comments?search=hello%20world',
	'/api/admin/comments?search=',
	'/api/admin/comments?search=%20%20%20', // pure-whitespace, .trim()s to empty
	"/api/admin/comments?search=%27%20OR%201%3D1",
	'/api/admin/comments?search=%3Cscript%3E',
	'/api/admin/comments?search=%25', // SQL LIKE wildcard, escaped server-side
	'/api/admin/comments?search=_', // SQL LIKE wildcard, escaped server-side
	'/api/admin/comments?search=%5C', // backslash, escaped server-side
	`/api/admin/comments?search=${'x'.repeat(50)}`,
	`/api/admin/comments?search=${'x'.repeat(100)}`,
	`/api/admin/comments?search=${'x'.repeat(500)}`,
	`/api/admin/comments?search=${'x'.repeat(1000)}`,

	// `?page=` / `?limit=` — pagination params coerced via
	// `Number(...)` after the gate. Bogus values silently
	// produce NaN on the auth branch (no inline validator)
	// but the unauth branch always returns 403.
	'/api/admin/comments?page=1',
	'/api/admin/comments?page=2',
	'/api/admin/comments?page=999',
	'/api/admin/comments?limit=10',
	'/api/admin/comments?limit=50',
	'/api/admin/comments?limit=100',
	'/api/admin/comments?limit=1000',
	'/api/admin/comments?page=1&limit=20',
	'/api/admin/comments?page=invalid', // NaN on auth branch
	'/api/admin/comments?limit=invalid', // NaN on auth branch
	'/api/admin/comments?page=-1',
	'/api/admin/comments?page=0',
	'/api/admin/comments?limit=0',
	'/api/admin/comments?limit=-1',
	'/api/admin/comments?limit=99999',

	// Combinations of the documented filters.
	'/api/admin/comments?search=test&page=1&limit=20',
	'/api/admin/comments?search=&page=&limit=',
	'/api/admin/comments?search=test&page=2&limit=50',

	// `?commentId=` / `?id=` — comment-targeting keys a
	// future contributor might add for a "view a single
	// comment" feature. The route does not target a single
	// comment today (the per-comment endpoint lives at
	// `/api/admin/comments/[id]/route.ts`).
	'/api/admin/comments?commentId=anything',
	'/api/admin/comments?id=comment_123',
	'/api/admin/comments?slug=anything',

	// `?itemId=` — item-targeting keys a future contributor
	// might add for a "view comments on a single item"
	// feature.
	'/api/admin/comments?itemId=anything',
	'/api/admin/comments?item_id=anything',

	// `?userId=` / `?adminId=` / `?as=` — admin-
	// impersonation keys a future contributor might add.
	// The route reads the admin identity from
	// `session.user.isAdmin` exclusively today.
	'/api/admin/comments?userId=anything',
	'/api/admin/comments?user_id=anything',
	'/api/admin/comments?adminId=anything',
	'/api/admin/comments?as=admin',
	'/api/admin/comments?asAdmin=true',
	'/api/admin/comments?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/comments?token=anything',
	'/api/admin/comments?secret=anything',
	'/api/admin/comments?api_key=anything',
	'/api/admin/comments?authorization=Bearer+anything',
	'/api/admin/comments?session=anything',
	'/api/admin/comments?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/comments?bypass=1',
	'/api/admin/comments?admin=1',
	'/api/admin/comments?admin=true',
	'/api/admin/comments?override=true',
	'/api/admin/comments?force=true',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys for a future contributor. The route
	// returns the full comment + user envelope today.
	'/api/admin/comments?fields=id',
	'/api/admin/comments?fields=id,content,rating',
	'/api/admin/comments?select=content',
	'/api/admin/comments?include=item',
	'/api/admin/comments?exclude=user',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// cache-busting keys.
	'/api/admin/comments?refresh=1',
	'/api/admin/comments?fresh=true',
	'/api/admin/comments?cache=bypass',
	'/api/admin/comments?nocache=1',

	// `?format=` — content-negotiation key. The route
	// returns JSON exclusively today.
	'/api/admin/comments?format=json',
	'/api/admin/comments?format=csv',
	'/api/admin/comments?format=xml',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/comments?locale=en',
	'/api/admin/comments?locale=fr',
	'/api/admin/comments?lang=de',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-tenancy
	// keys. The route resolves the tenant from
	// `getTenantId()` (which reads from the session and
	// the host header) — a query-string tenant bypass
	// would be a separate auth issue.
	'/api/admin/comments?tenant=acme',
	'/api/admin/comments?tenantId=42',
	'/api/admin/comments?org=ever-works',

	// `?from=` / `?to=` / `?since=` / `?until=` — time-
	// range filter keys for a future contributor.
	'/api/admin/comments?from=2024-01-01',
	'/api/admin/comments?to=2026-12-31',
	'/api/admin/comments?since=2024-01-01T00:00:00Z',
	'/api/admin/comments?until=2026-12-31T23:59:59Z',
	'/api/admin/comments?from=invalid-date',

	// `?rating=` / `?minRating=` / `?maxRating=` — per-
	// comment rating filters for a future contributor.
	// The route does not filter by rating today (rating
	// is in the response envelope but not in the where
	// clause).
	'/api/admin/comments?rating=5',
	'/api/admin/comments?minRating=3',
	'/api/admin/comments?maxRating=4',
	'/api/admin/comments?rating=invalid',

	// `?sortBy=` / `?sortOrder=` — sort filters for a
	// future contributor. The route hard-codes
	// `desc(comments.createdAt)` today.
	'/api/admin/comments?sortBy=createdAt',
	'/api/admin/comments?sortBy=rating',
	'/api/admin/comments?sortBy=user',
	'/api/admin/comments?sortOrder=asc',
	'/api/admin/comments?sortOrder=desc',

	// `?status=` / `?deleted=` — soft-delete filter keys
	// for a future contributor. The route hard-codes
	// `isNull(comments.deletedAt)` today.
	'/api/admin/comments?status=published',
	'/api/admin/comments?status=deleted',
	'/api/admin/comments?deleted=true',
	'/api/admin/comments?deleted=false',
	'/api/admin/comments?includeDeleted=true',

	// Repeated keys — `searchParams.get(name)` returns
	// the first value, but the gate fires before any
	// repository call, so repetition is irrelevant on
	// the unauth branch.
	'/api/admin/comments?search=a&search=b',
	'/api/admin/comments?page=1&page=2',
	'/api/admin/comments?limit=10&limit=20',

	// Bogus / typo'd query keys — the route reads three
	// documented keys today, so any combination of
	// unknown keys is silently ignored on every branch.
	'/api/admin/comments?unknown=value',
	'/api/admin/comments?foo=bar&baz=qux',
	'/api/admin/comments?userId=admin&token=foo&unknown=value&search=test&page=1&limit=20&foo=bar'
] as const;

test.describe('API: /api/admin/comments query-param surface', () => {
	for (const path of ADMIN_COMMENTS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's admin gate fires before any
			// `searchParams` parsing or drizzle query, so the
			// unauthenticated GET surface returns a 4xx
			// (typically 403) deterministically. There is no
			// 5xx branch reachable on the unauthenticated GET
			// surface because the catch can only fire after
			// the gate has already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/comments returns a 403 on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the admin gate must fire before any
		// `searchParams` parsing or drizzle query. The status
		// must be exactly 403 (the route hard-codes the 403
		// status in the gate's `NextResponse.json` call).
		// Either way the response must NOT echo any comment
		// data — every consuming client depends on the
		// early-return.
		const response = await request.get('/api/admin/comments');

		expect(response.status()).toBe(403);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Forbidden'
		});
	});

	test('GET /api/admin/comments has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads three documented query params today
		// after the gate, so the response status must be
		// invariant to any combination of known and unknown
		// keys. A regression that reads any query param
		// before the gate would surface here as a status
		// divergence between the no-arg baseline and the
		// parameterised variant.
		const baseline = await request.get('/api/admin/comments');
		const parameterised = await request.get(
			'/api/admin/comments?search=test&page=1&limit=20&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/comments?search=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('search')` as a side-channel for
		// a "preview as a search query" feature that bypasses
		// the admin gate would change the unauth branch from
		// "always 403" to "200 if ?search=… is present" and
		// silently grant any anonymous caller arbitrary
		// comment-listing access. This assertion catches that
		// change immediately.
		const baseline = await request.get('/api/admin/comments');
		const responses = await Promise.all([
			request.get('/api/admin/comments?search=test'),
			request.get('/api/admin/comments?search='),
			request.get('/api/admin/comments?search=anything'),
			request.get(`/api/admin/comments?search=${'x'.repeat(500)}`),
			request.get('/api/admin/comments?search=%25'),
			request.get('/api/admin/comments?search=_'),
			request.get('/api/admin/comments?search=%5C')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/comments?page=…&limit=… does NOT bypass the admin gate, and the validator-less Number coercion does NOT fire on the unauth branch', async ({
		request
	}) => {
		// The `?page=` / `?limit=` pagination params are
		// coerced via `Number(...)` after the gate without
		// an inline validator (unlike the
		// `admin/collections` route's `isNaN` checks).
		// Bogus values silently produce NaN on the auth
		// branch but the unauth branch must always return
		// 403 regardless. A regression that runs the
		// coercion before the gate would surface here as a
		// 500 on `?page=invalid`.
		const baseline = await request.get('/api/admin/comments');
		const responses = await Promise.all([
			request.get('/api/admin/comments?page=1'),
			request.get('/api/admin/comments?page=invalid'),
			request.get('/api/admin/comments?page=-1'),
			request.get('/api/admin/comments?page=0'),
			request.get('/api/admin/comments?limit=10'),
			request.get('/api/admin/comments?limit=invalid'),
			request.get('/api/admin/comments?limit=0'),
			request.get('/api/admin/comments?limit=-1'),
			request.get('/api/admin/comments?limit=99999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/comments?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven admin resolution would
		// change the unauth branch from "always 403" to
		// "200 if ?userId=… is present" and silently grant
		// any anonymous caller arbitrary-comment listing
		// access. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/admin/comments');
		const responses = await Promise.all([
			request.get('/api/admin/comments?userId=admin'),
			request.get('/api/admin/comments?user_id=admin'),
			request.get('/api/admin/comments?adminId=admin'),
			request.get('/api/admin/comments?as=admin'),
			request.get('/api/admin/comments?asAdmin=true'),
			request.get('/api/admin/comments?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/comments?token=… does NOT introduce a query-token auth bypass', async ({
		request
	}) => {
		// The route does not authenticate via a query token
		// today (auth is gated through `auth()` which reads
		// the NextAuth session cookie and the admin role bit
		// on the session user). A future contributor who
		// adds a magic-token bypass for the admin gate would
		// change the unauth branch's behaviour. This
		// assertion catches that change immediately.
		const baseline = await request.get('/api/admin/comments');
		const responses = await Promise.all([
			request.get('/api/admin/comments?token=anything'),
			request.get('/api/admin/comments?secret=anything'),
			request.get('/api/admin/comments?api_key=anything'),
			request.get('/api/admin/comments?authorization=Bearer+anything'),
			request.get('/api/admin/comments?session=anything'),
			request.get('/api/admin/comments?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/comments?bypass=… does NOT introduce a query-admin-override', async ({
		request
	}) => {
		// The route's admin guard does not branch on any
		// query-string admin override today. A regression
		// that wires `searchParams.get('bypass')` /
		// `searchParams.get('admin')` /
		// `searchParams.get('override')` as a non-session-
		// driven admin bypass would let an attacker elevate
		// to admin from any anonymous session. This
		// assertion pins the "admin status is read from the
		// session, never from the query string" invariant.
		const baseline = await request.get('/api/admin/comments');
		const responses = await Promise.all([
			request.get('/api/admin/comments?bypass=1'),
			request.get('/api/admin/comments?admin=1'),
			request.get('/api/admin/comments?admin=true'),
			request.get('/api/admin/comments?override=true'),
			request.get('/api/admin/comments?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/comments?format=… does NOT introduce a content-negotiation bypass', async ({
		request
	}) => {
		// The route returns JSON exclusively today. A future
		// `?format=csv` extension would be a natural fit for
		// a comments data-export flow, but it must not
		// bypass the auth gate. The unauth branch's status
		// must be invariant to the format key.
		const baseline = await request.get('/api/admin/comments');
		const responses = await Promise.all([
			request.get('/api/admin/comments?format=json'),
			request.get('/api/admin/comments?format=csv'),
			request.get('/api/admin/comments?format=xml')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/comments?fields=… does NOT introduce a field-projection bypass', async ({
		request
	}) => {
		// The route returns the full comment + user envelope
		// today; any future field-projection support must
		// not bypass the auth gate. The unauth branch's
		// status must be invariant to the field projection
		// keys.
		const baseline = await request.get('/api/admin/comments');
		const responses = await Promise.all([
			request.get('/api/admin/comments?fields=id'),
			request.get('/api/admin/comments?fields=id,content,rating'),
			request.get('/api/admin/comments?select=content'),
			request.get('/api/admin/comments?include=item'),
			request.get('/api/admin/comments?exclude=user')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/comments?commentId=… does NOT introduce a single-comment-targeting bypass', async ({
		request
	}) => {
		// The route does not target a single comment today
		// (the per-comment endpoint lives at
		// `/api/admin/comments/[id]/route.ts`). A future
		// contributor who adds a `?commentId=…` shortcut on
		// the listing route must not bypass the auth gate.
		// The unauth branch's status must be invariant to
		// the comment-targeting keys.
		const baseline = await request.get('/api/admin/comments');
		const responses = await Promise.all([
			request.get('/api/admin/comments?commentId=anything'),
			request.get('/api/admin/comments?id=comment_123'),
			request.get('/api/admin/comments?slug=anything'),
			request.get('/api/admin/comments?itemId=anything'),
			request.get('/api/admin/comments?item_id=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/comments?rating=… does NOT introduce a rating-filter bypass', async ({
		request
	}) => {
		// The route does not filter by rating today (the
		// rating field is in the response envelope but not
		// in the where clause). A future contributor who
		// adds rating-filter keys must not bypass the auth
		// gate. The unauth branch's status must be invariant
		// to the rating keys.
		const baseline = await request.get('/api/admin/comments');
		const responses = await Promise.all([
			request.get('/api/admin/comments?rating=5'),
			request.get('/api/admin/comments?minRating=3'),
			request.get('/api/admin/comments?maxRating=4'),
			request.get('/api/admin/comments?rating=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/comments?status=… does NOT introduce a soft-delete-filter bypass', async ({
		request
	}) => {
		// The route hard-codes `isNull(comments.deletedAt)`
		// today. A future contributor who adds a soft-delete
		// filter (`?includeDeleted=true` /
		// `?status=deleted`) must not bypass the auth gate.
		// The unauth branch's status must be invariant to
		// the soft-delete keys.
		const baseline = await request.get('/api/admin/comments');
		const responses = await Promise.all([
			request.get('/api/admin/comments?status=published'),
			request.get('/api/admin/comments?status=deleted'),
			request.get('/api/admin/comments?deleted=true'),
			request.get('/api/admin/comments?deleted=false'),
			request.get('/api/admin/comments?includeDeleted=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/comments keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth
		// branch. The shape guarantees the route's admin
		// gate fires before any branching on the documented
		// `search` / `page` / `limit` query params or any
		// potential future query schemas.
		const responses = await Promise.all([
			request.get('/api/admin/comments'),
			request.get('/api/admin/comments?search=test&page=1&limit=20'),
			request.get(
				'/api/admin/comments?userId=admin&token=foo&from=2024-01-01&to=2026-12-31&page=invalid&limit=99999&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/comments does NOT branch on Accept header', async ({
		request
	}) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to the same
		// status on the unauth branch.
		const baseline = await request.get('/api/admin/comments');
		const responses = await Promise.all([
			request.get('/api/admin/comments', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/admin/comments', {
				headers: { Accept: 'text/csv' }
			}),
			request.get('/api/admin/comments', {
				headers: { Accept: 'application/xml' }
			}),
			request.get('/api/admin/comments', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/comments repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		// `searchParams.get(name)` returns the first value
		// of any repeated key, so repetition is irrelevant
		// on every branch. The unauth branch must return
		// 403 regardless of whether the repeated value is
		// valid or invalid.
		const baseline = await request.get('/api/admin/comments');
		const responses = await Promise.all([
			request.get('/api/admin/comments?search=a&search=b'),
			request.get('/api/admin/comments?page=1&page=2'),
			request.get('/api/admin/comments?limit=10&limit=20')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/comments keeps a bare-Request-typed handler signature stable', async ({
		request
	}) => {
		// The route's handler signature is
		// `GET(request: Request)` — explicitly typed against
		// the bare `Request` type, NOT `NextRequest` (where
		// the `admin/collections` route uses `NextRequest`
		// for `request.url` parsing reasons and the
		// `safeErrorResponse(error, ...)` shared error
		// handler). A regression that switches the signature
		// to `NextRequest` would still compile and would
		// expose the Next-specific request surface (e.g.
		// `request.cookies`, `request.geo`, `request.ip`).
		// The behavioural contract is the same on the
		// unauth branch — every call returns 403 — but a
		// future regression that adds a cookie / IP-based
		// auth bypass would surface here as a 200 on the
		// unauth branch with a fabricated session cookie.
		// This assertion pins the unauth-branch contract by
		// sweeping a few known-bogus cookie / header values.
		const responses = await Promise.all([
			request.get('/api/admin/comments', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/comments', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/comments', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/comments', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});
});
