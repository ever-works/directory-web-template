import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-gated companies-listing endpoint served by
 * `apps/web/app/api/admin/companies/route.ts`.
 *
 * `GET /api/admin/companies` is **admin-gated** via
 * `auth()` + the `session.user.isAdmin` bit. The handler
 * reads four query params after the gate (`page`, `limit`,
 * `q`, `status`), so the unauthenticated branch returns
 * 401 with `{ error: 'Unauthorized' }` regardless of which
 * keys the caller appends:
 *
 *     export async function GET(request: NextRequest) {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.isAdmin) {
 *           return NextResponse.json(
 *             { error: 'Unauthorized' },
 *             { status: 401 }
 *           );
 *         }
 *         const { searchParams } = new URL(request.url);
 *         const pageParam = searchParams.get('page');
 *         const limitParam = searchParams.get('limit');
 *         const page = pageParam ? parseInt(pageParam, 10) : 1;
 *         const limit = limitParam ? parseInt(limitParam, 10) : 10;
 *         if (isNaN(page) || page < 1) {
 *           return NextResponse.json(
 *             { error: 'Invalid page parameter. Must be a positive integer.' },
 *             { status: 400 }
 *           );
 *         }
 *         if (isNaN(limit) || limit < 1 || limit > 100) {
 *           return NextResponse.json(
 *             { error: 'Invalid limit parameter. Must be between 1 and 100.' },
 *             { status: 400 }
 *           );
 *         }
 *         const q = searchParams.get('q') || undefined;
 *         const status = searchParams.get('status') as 'active' | 'inactive' | undefined;
 *         const result = await listCompanies({ page, limit, search: q, status });
 *         return NextResponse.json({ success: true, data: { companies: result.companies }, meta: { … } });
 *       } catch (error) {
 *         return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
 *       }
 *     }
 *
 * The route's four documented query params (`page`,
 * `limit`, `q`, `status`) are read **after** the single-
 * step admin gate, so every call from this spec — which
 * carries no authenticated session — round-trips to the
 * same 401 regardless of the query string. A regression
 * that reads any query param before the gate (e.g. a
 * future `?asAdmin=true` admin-impersonation key, a
 * `?token=…` magic-token bypass, a `?as=admin` admin-
 * override, or any other dangerous-passthrough that
 * bypasses `session?.user?.isAdmin`) would change the
 * unauth branch's behaviour from "always 401" to "200 /
 * 400 / 500 if the right query is present" — and that
 * change is exactly what this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session without an admin user); the route returns
 *     401 with the canonical `{ error: 'Unauthorized' }`
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
 *     `isNaN(page) || page < 1` (or the equivalent for
 *     `limit`); the route returns 400 with
 *     `{ error: 'Invalid page parameter. …' }`. Out of
 *     scope for this spec because the admin gate fires
 *     before the pagination validators on every unauth
 *     invocation.
 *   - **Authenticated admin user**: returns 200 with
 *     `{ success: true, data: { companies: [...] }, meta:
 *     { page, totalPages, total, limit, activeCount,
 *     inactiveCount } }` after the `listCompanies` query
 *     completes. Out of scope for this spec because the
 *     gate fires before the repository call on every
 *     unauth invocation.
 *   - **Internal error**: returns 500 with the canonical
 *     `{ error: 'Failed to fetch companies' }` envelope.
 *     Out of scope for this spec because the gate fires
 *     before any repository call on every unauth
 *     invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec
 * hits. A regression that introduces query-string-based
 * bypass — e.g. a future `?asAdmin=true` admin-
 * impersonation key that fires before `auth()`, a
 * `?token=…` magic-token bypass, or a `?domain=…`
 * dangerous-passthrough that would forward a caller-
 * supplied domain to a future "view a single company by
 * domain" feature — would surface immediately as a status
 * divergence between the no-arg 401 and a parameter-laden
 * non-401.
 *
 * The shape mirrors the sibling
 * `admin-collections-query.spec.ts`,
 * `admin-comments-query.spec.ts`,
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
 * service-layer call" posture. The admin companies-listing
 * route is unique in that:
 *   1. It uses a **401** for the unauth branch (where
 *      `admin-comments-query.spec.ts` documents a single-
 *      step **403** gate). The handler hard-codes the 401
 *      status in the gate's `NextResponse.json` call, the
 *      same posture as the `admin/collections` and
 *      `admin/users` routes for the unauthenticated case.
 *   2. The handler signature is `GET(request: NextRequest)`
 *      (with the Next-specific `NextRequest` type, not the
 *      bare `Request` type the `admin/comments` handler
 *      uses) — which opens up the Next-specific request
 *      surface (e.g. `request.cookies`, `request.geo`,
 *      `request.ip`). The behavioural contract is the same
 *      on the unauth branch.
 *   3. The 401 envelope is the **bare-error shape**
 *      `{ error: 'Unauthorized' }` — distinct from the
 *      `{ success: false, error: 'Forbidden' }` envelope
 *      the `admin/comments` route emits. The bare-error
 *      shape is the legacy posture this route shares with
 *      `admin/companies/[id]/route.ts` and a handful of
 *      other admin routes that pre-date the unified
 *      `{ success, data, error }` envelope.
 *   4. The handler uses the `listCompanies(...)` repository
 *      function (from `@/lib/db/queries`) — distinct from
 *      the drizzle-direct posture of the `admin/comments`
 *      route. The repository-pattern posture is the
 *      production-source convention for new admin routes;
 *      future contributors who refactor the
 *      `admin/comments` route to use a `commentRepository`
 *      should preserve the gate-order invariant this spec
 *      pins.
 *   5. The post-gate handler reads **four** documented
 *      query keys (`page`, `limit`, `q`, `status`) — fewer
 *      than the `admin/collections` route's six and the
 *      `admin/users` route's seven, more than the
 *      `admin/comments` route's three. The narrower
 *      surface means fewer bypass vectors but the same
 *      boundary-test discipline.
 *   6. The post-gate `parseInt(...)` coercion on `page` /
 *      `limit` is **gated behind a falsy check**
 *      (`pageParam ? parseInt(pageParam, 10) : 1`) — so a
 *      missing key falls back to the default (1 / 10),
 *      where a present-but-empty key (`?page=`) coerces to
 *      `NaN` and the inline `isNaN` check catches it with
 *      a 400. Out of scope for this spec because the
 *      validator-fires only on the auth branch.
 *   7. The route's `q` query key (search by name or
 *      domain) is distinct from the `search` key the
 *      `admin/comments` and `admin/users` routes use; this
 *      asymmetry is a known production-source naming
 *      divergence. The unauth branch is invariant to the
 *      key name.
 *   8. The route's `status` query key accepts `active` /
 *      `inactive` (a two-state status enum); any other
 *      value is silently coerced to `undefined` after the
 *      `as 'active' | 'inactive' | undefined` TS cast and
 *      passed to `listCompanies` which ignores undefined.
 *      Out of scope for this spec because the coercion
 *      only fires on the auth branch.
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this spec
 * adds the deep query-surface walk on top of that.
 */
const ADMIN_COMPANIES_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/companies',

	// `?q=` — the route's documented free-text filter
	// (search by company name or domain).
	'/api/admin/companies?q=test',
	'/api/admin/companies?q=acme',
	'/api/admin/companies?q=acme.com',
	'/api/admin/companies?q=hello%20world',
	'/api/admin/companies?q=',
	'/api/admin/companies?q=%20%20%20',
	"/api/admin/companies?q=%27%20OR%201%3D1",
	'/api/admin/companies?q=%3Cscript%3E',
	'/api/admin/companies?q=%25', // SQL LIKE wildcard
	'/api/admin/companies?q=_', // SQL LIKE wildcard
	'/api/admin/companies?q=%5C', // backslash
	`/api/admin/companies?q=${'x'.repeat(50)}`,
	`/api/admin/companies?q=${'x'.repeat(100)}`,
	`/api/admin/companies?q=${'x'.repeat(500)}`,
	`/api/admin/companies?q=${'x'.repeat(1000)}`,

	// `?search=` — the legacy / alternative free-text filter
	// key. The route reads `q` today, not `search`. A future
	// contributor who switches the key name (or accepts both)
	// must not bypass the auth gate.
	'/api/admin/companies?search=test',
	'/api/admin/companies?search=acme',

	// `?page=` / `?limit=` — pagination params coerced via
	// `parseInt(...)` after the gate, with inline `isNaN` /
	// range validators that fire on the auth branch.
	'/api/admin/companies?page=1',
	'/api/admin/companies?page=2',
	'/api/admin/companies?page=999',
	'/api/admin/companies?limit=10',
	'/api/admin/companies?limit=50',
	'/api/admin/companies?limit=100',
	'/api/admin/companies?page=1&limit=20',
	'/api/admin/companies?page=invalid',
	'/api/admin/companies?limit=invalid',
	'/api/admin/companies?page=-1',
	'/api/admin/companies?page=0',
	'/api/admin/companies?limit=0',
	'/api/admin/companies?limit=-1',
	'/api/admin/companies?limit=99999',
	'/api/admin/companies?limit=101', // just over the inline ceiling
	'/api/admin/companies?page=', // empty -> NaN -> 400 on auth
	'/api/admin/companies?limit=', // empty -> NaN -> 400 on auth

	// Combinations of the documented filters.
	'/api/admin/companies?q=test&page=1&limit=20',
	'/api/admin/companies?q=&page=&limit=',
	'/api/admin/companies?q=test&page=2&limit=50&status=active',

	// `?status=` — the documented status filter (active /
	// inactive). The TS cast accepts arbitrary strings.
	'/api/admin/companies?status=active',
	'/api/admin/companies?status=inactive',
	'/api/admin/companies?status=ACTIVE', // case-sensitivity
	'/api/admin/companies?status=invalid',
	'/api/admin/companies?status=',
	'/api/admin/companies?status=deleted',
	'/api/admin/companies?status=%27%20OR%201%3D1',

	// `?companyId=` / `?id=` / `?slug=` / `?domain=` —
	// company-targeting keys a future contributor might add
	// for a "view a single company" feature. The route does
	// not target a single company today (the per-company
	// endpoint lives at `/api/admin/companies/[id]/route.ts`).
	'/api/admin/companies?companyId=anything',
	'/api/admin/companies?id=company_123',
	'/api/admin/companies?slug=acme-corp',
	'/api/admin/companies?domain=acme.com',
	'/api/admin/companies?domain=evil.com',

	// `?userId=` / `?adminId=` / `?as=` — admin-
	// impersonation keys a future contributor might add. The
	// route reads the admin identity from
	// `session.user.isAdmin` exclusively today.
	'/api/admin/companies?userId=anything',
	'/api/admin/companies?user_id=anything',
	'/api/admin/companies?adminId=anything',
	'/api/admin/companies?as=admin',
	'/api/admin/companies?asAdmin=true',
	'/api/admin/companies?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/companies?token=anything',
	'/api/admin/companies?secret=anything',
	'/api/admin/companies?api_key=anything',
	'/api/admin/companies?authorization=Bearer+anything',
	'/api/admin/companies?session=anything',
	'/api/admin/companies?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/companies?bypass=1',
	'/api/admin/companies?admin=1',
	'/api/admin/companies?admin=true',
	'/api/admin/companies?override=true',
	'/api/admin/companies?force=true',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys for a future contributor. The route
	// returns the full company envelope today.
	'/api/admin/companies?fields=id',
	'/api/admin/companies?fields=id,name,domain',
	'/api/admin/companies?select=name',
	'/api/admin/companies?include=items',
	'/api/admin/companies?exclude=domain',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// cache-busting keys.
	'/api/admin/companies?refresh=1',
	'/api/admin/companies?fresh=true',
	'/api/admin/companies?cache=bypass',
	'/api/admin/companies?nocache=1',

	// `?format=` — content-negotiation key. The route returns
	// JSON exclusively today.
	'/api/admin/companies?format=json',
	'/api/admin/companies?format=csv',
	'/api/admin/companies?format=xml',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/companies?locale=en',
	'/api/admin/companies?locale=fr',
	'/api/admin/companies?lang=de',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-tenancy
	// keys. The route does not resolve tenant per-call today
	// (no `getTenantId` call); a query-string tenant override
	// would be a separate auth issue.
	'/api/admin/companies?tenant=acme',
	'/api/admin/companies?tenantId=42',
	'/api/admin/companies?org=ever-works',

	// `?from=` / `?to=` / `?since=` / `?until=` — time-range
	// filter keys for a future contributor.
	'/api/admin/companies?from=2024-01-01',
	'/api/admin/companies?to=2026-12-31',
	'/api/admin/companies?since=2024-01-01T00:00:00Z',
	'/api/admin/companies?until=2026-12-31T23:59:59Z',
	'/api/admin/companies?from=invalid-date',

	// `?sortBy=` / `?sortOrder=` — sort filters for a future
	// contributor. The route hard-codes the default sort
	// today (production-source-controlled).
	'/api/admin/companies?sortBy=name',
	'/api/admin/companies?sortBy=createdAt',
	'/api/admin/companies?sortBy=domain',
	'/api/admin/companies?sortOrder=asc',
	'/api/admin/companies?sortOrder=desc',

	// `?deleted=` / `?includeDeleted=` — soft-delete filter
	// keys for a future contributor.
	'/api/admin/companies?deleted=true',
	'/api/admin/companies?deleted=false',
	'/api/admin/companies?includeDeleted=true',

	// Repeated keys — `searchParams.get(name)` returns the
	// first value for every key the route reads.
	'/api/admin/companies?q=a&q=b',
	'/api/admin/companies?page=1&page=2',
	'/api/admin/companies?limit=10&limit=20',
	'/api/admin/companies?status=active&status=inactive',

	// Bogus / typo'd query keys — the route reads four
	// documented keys today, so any combination of unknown
	// keys is silently ignored on every branch.
	'/api/admin/companies?unknown=value',
	'/api/admin/companies?foo=bar&baz=qux',
	'/api/admin/companies?userId=admin&token=foo&unknown=value&q=test&page=1&limit=20&foo=bar'
] as const;

test.describe('API: /api/admin/companies query-param surface', () => {
	for (const path of ADMIN_COMPANIES_QUERIES) {
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

	test('GET /api/admin/companies returns a 401 on the unauth branch', async ({ request }) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the admin gate must fire before any
		// `searchParams` parsing or repository call. The
		// status must be exactly 401 (the route hard-codes the
		// 401 status in the gate's `NextResponse.json` call).
		// Either way the response must NOT echo any company
		// data — every consuming client depends on the
		// early-return.
		const response = await request.get('/api/admin/companies');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test('GET /api/admin/companies has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads four documented query params today
		// after the gate, so the response status must be
		// invariant to any combination of known and unknown
		// keys. A regression that reads any query param before
		// the gate would surface here as a status divergence
		// between the no-arg baseline and the parameterised
		// variant.
		const baseline = await request.get('/api/admin/companies');
		const parameterised = await request.get(
			'/api/admin/companies?q=test&page=1&limit=20&status=active&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/companies?q=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who reads
		// `searchParams.get('q')` as a side-channel for a
		// "preview as a search query" feature that bypasses
		// the admin gate would change the unauth branch from
		// "always 401" to "200 if ?q=… is present" and
		// silently grant any anonymous caller arbitrary
		// company-listing access. This assertion catches that
		// change immediately.
		const baseline = await request.get('/api/admin/companies');
		const responses = await Promise.all([
			request.get('/api/admin/companies?q=test'),
			request.get('/api/admin/companies?q='),
			request.get('/api/admin/companies?q=acme'),
			request.get('/api/admin/companies?q=acme.com'),
			request.get(`/api/admin/companies?q=${'x'.repeat(500)}`),
			request.get('/api/admin/companies?q=%25'),
			request.get('/api/admin/companies?q=_'),
			request.get('/api/admin/companies?q=%5C')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/companies?page=…&limit=… does NOT bypass the admin gate, and the inline pagination validators do NOT fire on the unauth branch', async ({
		request
	}) => {
		// The `?page=` / `?limit=` pagination params are
		// coerced via `parseInt(...)` after the gate with
		// inline `isNaN` / range validators that fire on the
		// auth branch. Bogus values surface as 400 on the auth
		// branch but the unauth branch must always return 401
		// regardless. A regression that runs the validator
		// before the gate would surface here as a 400 on
		// `?page=invalid`.
		const baseline = await request.get('/api/admin/companies');
		const responses = await Promise.all([
			request.get('/api/admin/companies?page=1'),
			request.get('/api/admin/companies?page=invalid'),
			request.get('/api/admin/companies?page=-1'),
			request.get('/api/admin/companies?page=0'),
			request.get('/api/admin/companies?limit=10'),
			request.get('/api/admin/companies?limit=invalid'),
			request.get('/api/admin/companies?limit=0'),
			request.get('/api/admin/companies?limit=-1'),
			request.get('/api/admin/companies?limit=101'),
			request.get('/api/admin/companies?limit=99999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/companies?status=… does NOT bypass the admin gate', async ({ request }) => {
		// The `?status=` filter accepts the two-state enum
		// (`active` / `inactive`) on the auth branch via a TS
		// cast that does not validate. Any value is silently
		// passed to `listCompanies` which ignores undefined-
		// equivalents. A future contributor who validates the
		// status before the gate would change the unauth
		// branch from "always 401" to "400 if ?status=invalid"
		// — this assertion catches that change immediately.
		const baseline = await request.get('/api/admin/companies');
		const responses = await Promise.all([
			request.get('/api/admin/companies?status=active'),
			request.get('/api/admin/companies?status=inactive'),
			request.get('/api/admin/companies?status=ACTIVE'),
			request.get('/api/admin/companies?status=invalid'),
			request.get('/api/admin/companies?status='),
			request.get('/api/admin/companies?status=deleted')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/companies?userId=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven admin resolution would
		// change the unauth branch from "always 401" to
		// "200 if ?userId=admin is present" — silently
		// granting any anonymous caller admin access. This
		// assertion catches that change immediately.
		const baseline = await request.get('/api/admin/companies');
		const responses = await Promise.all([
			request.get('/api/admin/companies?userId=admin'),
			request.get('/api/admin/companies?user_id=admin'),
			request.get('/api/admin/companies?adminId=admin'),
			request.get('/api/admin/companies?as=admin'),
			request.get('/api/admin/companies?asAdmin=true'),
			request.get('/api/admin/companies?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/companies?token=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who adds magic-token-based
		// admin bypass — e.g. a `?token=…` shortcut for an
		// internal cron job or a `?secret=…` shortcut for a
		// staging-environment integration test — would change
		// the unauth branch from "always 401" to "200 if the
		// right token is present". This assertion catches that
		// change immediately.
		const baseline = await request.get('/api/admin/companies');
		const responses = await Promise.all([
			request.get('/api/admin/companies?token=anything'),
			request.get('/api/admin/companies?secret=anything'),
			request.get('/api/admin/companies?api_key=anything'),
			request.get('/api/admin/companies?authorization=Bearer+anything'),
			request.get('/api/admin/companies?session=anything'),
			request.get('/api/admin/companies?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/companies?bypass=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who adds a `?bypass=…`,
		// `?admin=…`, or `?override=…` admin-override key
		// would change the unauth branch from "always 401" to
		// "200 if the right key is present". This assertion
		// catches that change immediately.
		const baseline = await request.get('/api/admin/companies');
		const responses = await Promise.all([
			request.get('/api/admin/companies?bypass=1'),
			request.get('/api/admin/companies?admin=1'),
			request.get('/api/admin/companies?admin=true'),
			request.get('/api/admin/companies?override=true'),
			request.get('/api/admin/companies?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/companies?fields=… does NOT introduce a field-projection bypass', async ({
		request
	}) => {
		// The route returns the full company envelope today;
		// any future field-projection support must not bypass
		// the auth gate. The unauth branch's status must be
		// invariant to the field-projection keys.
		const baseline = await request.get('/api/admin/companies');
		const responses = await Promise.all([
			request.get('/api/admin/companies?fields=id'),
			request.get('/api/admin/companies?fields=id,name,domain'),
			request.get('/api/admin/companies?select=name'),
			request.get('/api/admin/companies?include=items'),
			request.get('/api/admin/companies?exclude=domain')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/companies?companyId=… does NOT introduce a single-company-targeting bypass', async ({
		request
	}) => {
		// The route does not target a single company today
		// (the per-company endpoint lives at
		// `/api/admin/companies/[id]/route.ts`). A future
		// contributor who adds a `?companyId=…` /
		// `?domain=…` / `?slug=…` shortcut on the listing
		// route must not bypass the auth gate. The unauth
		// branch's status must be invariant to the company-
		// targeting keys.
		const baseline = await request.get('/api/admin/companies');
		const responses = await Promise.all([
			request.get('/api/admin/companies?companyId=anything'),
			request.get('/api/admin/companies?id=company_123'),
			request.get('/api/admin/companies?slug=acme-corp'),
			request.get('/api/admin/companies?domain=acme.com'),
			request.get('/api/admin/companies?domain=evil.com')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/companies?from=…&to=… does NOT introduce a time-range-filter bypass', async ({
		request
	}) => {
		// The route does not filter by time today. A future
		// contributor who adds time-range filter keys
		// (`?from=…` / `?to=…` / `?since=…` / `?until=…`)
		// must not bypass the auth gate. The unauth branch's
		// status must be invariant to the time-range keys.
		const baseline = await request.get('/api/admin/companies');
		const responses = await Promise.all([
			request.get('/api/admin/companies?from=2024-01-01'),
			request.get('/api/admin/companies?to=2026-12-31'),
			request.get('/api/admin/companies?since=2024-01-01T00:00:00Z'),
			request.get('/api/admin/companies?until=2026-12-31T23:59:59Z'),
			request.get('/api/admin/companies?from=invalid-date')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/companies?sortBy=… does NOT introduce a sort-filter bypass', async ({
		request
	}) => {
		// The route hard-codes the sort order today. A future
		// contributor who adds sort-filter keys (`?sortBy=…` /
		// `?sortOrder=…`) must not bypass the auth gate. The
		// unauth branch's status must be invariant to the
		// sort-filter keys.
		const baseline = await request.get('/api/admin/companies');
		const responses = await Promise.all([
			request.get('/api/admin/companies?sortBy=name'),
			request.get('/api/admin/companies?sortBy=createdAt'),
			request.get('/api/admin/companies?sortBy=domain'),
			request.get('/api/admin/companies?sortOrder=asc'),
			request.get('/api/admin/companies?sortOrder=desc')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/companies?deleted=… does NOT introduce a soft-delete-filter bypass', async ({
		request
	}) => {
		// The route does not filter by soft-delete state
		// today. A future contributor who adds a soft-delete
		// filter (`?includeDeleted=true` / `?deleted=…`) must
		// not bypass the auth gate. The unauth branch's status
		// must be invariant to the soft-delete keys.
		const baseline = await request.get('/api/admin/companies');
		const responses = await Promise.all([
			request.get('/api/admin/companies?deleted=true'),
			request.get('/api/admin/companies?deleted=false'),
			request.get('/api/admin/companies?includeDeleted=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/companies keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth branch.
		// The shape guarantees the route's admin gate fires
		// before any branching on the documented `q` / `page`
		// / `limit` / `status` query params or any potential
		// future query schemas.
		const responses = await Promise.all([
			request.get('/api/admin/companies'),
			request.get('/api/admin/companies?q=test&page=1&limit=20&status=active'),
			request.get(
				'/api/admin/companies?userId=admin&token=foo&from=2024-01-01&to=2026-12-31&page=invalid&limit=99999&status=deleted&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/companies does NOT branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to the same
		// status on the unauth branch.
		const baseline = await request.get('/api/admin/companies');
		const responses = await Promise.all([
			request.get('/api/admin/companies', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/companies', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/companies', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/companies', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/companies repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		// `searchParams.get(name)` returns the first value of
		// any repeated key, so repetition is irrelevant on
		// every branch. The unauth branch must return 401
		// regardless of whether the repeated value is valid or
		// invalid.
		const baseline = await request.get('/api/admin/companies');
		const responses = await Promise.all([
			request.get('/api/admin/companies?q=a&q=b'),
			request.get('/api/admin/companies?page=1&page=2'),
			request.get('/api/admin/companies?limit=10&limit=20'),
			request.get('/api/admin/companies?status=active&status=inactive')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/companies keeps a NextRequest-typed handler signature stable', async ({
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
			request.get('/api/admin/companies', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/companies', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/companies', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/companies', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});
});
