import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only client-profiles-listing endpoint served by
 * `apps/web/app/api/admin/clients/route.ts`.
 *
 * `GET /api/admin/clients` is **admin-gated** via
 * `auth()` + the `session.user.isAdmin` bit. The handler
 * reads several query params after the gate (`page`,
 * `limit`, `search`, `status`, `plan`, `accountType`,
 * `provider`), so the unauthenticated branch returns 401
 * with `{ error: 'Unauthorized' }` regardless of which
 * keys the caller appends:
 *
 *     export async function GET(request: NextRequest) {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.isAdmin) {
 *           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *         }
 *         const { searchParams } = new URL(request.url);
 *         const paginationResult = validatePaginationParams(searchParams);
 *         if ('error' in paginationResult) {
 *           return NextResponse.json(
 *             { error: paginationResult.error },
 *             { status: paginationResult.status }
 *           );
 *         }
 *         const { page, limit } = paginationResult;
 *         const search = searchParams.get('search') || undefined;
 *         const status = searchParams.get('status') || undefined;
 *         const plan = searchParams.get('plan') || undefined;
 *         const accountType = searchParams.get('accountType') || undefined;
 *         const provider = searchParams.get('provider') || undefined;
 *         const result = await getClientProfiles({…});
 *         return NextResponse.json({ success: true, data: { clients: ... }, meta: {...} });
 *       } catch (error) {
 *         return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
 *       }
 *     }
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session without an admin user); the route returns
 *     401 with the bare `{ error: 'Unauthorized' }`
 *     envelope. This is the contract every assertion
 *     below pins, because the e2e runner does not carry
 *     an authenticated session by default.
 *   - **Authenticated non-admin user**: `session.user.isAdmin`
 *     is `false`; the route returns the same 401 envelope.
 *     The single-step gate collapses both unauthenticated
 *     and authenticated-non-admin into the same 401 — the
 *     same posture as the sibling `admin/comments` /
 *     `admin/companies` / `admin/users` routes (and
 *     distinct from the `admin/notifications` route's
 *     two-step `id` → 401 then `isAdmin` → 403 gate).
 *     Out of scope for this spec because the gate fires
 *     before any pagination validator on every unauth
 *     invocation.
 *   - **Authenticated admin user with invalid pagination**:
 *     `validatePaginationParams(...)` returns
 *     `{ error: 'Invalid page parameter. …', status: 400 }`
 *     (or the equivalent for `limit`); the route returns
 *     400 with the bare-error envelope. Out of scope for
 *     this spec because the admin gate fires before the
 *     pagination validator on every unauth invocation.
 *   - **Authenticated admin user**: returns 200 with
 *     `{ success: true, data: { clients: [...] }, meta: {...} }`
 *     after the `getClientProfiles({…})` query completes.
 *     Out of scope for this spec because the gate fires
 *     before the repository call on every unauth
 *     invocation.
 *   - **Internal error**: returns 500 with
 *     `{ error: 'Failed to fetch clients' }`. Out of
 *     scope for this spec because the gate fires before
 *     any repository call on every unauth invocation.
 *
 * The query-param surface walks the unauthenticated branch
 * because that is the branch every call from this spec
 * hits. A regression that introduces query-string-based
 * bypass — e.g. a future `?asAdmin=true` admin-
 * impersonation key that fires before `auth()`, a
 * `?token=…` magic-token bypass, or a `?provider=…`
 * dangerous-passthrough that would forward a caller-
 * supplied OAuth provider id to bypass the admin gate —
 * would surface immediately as a status divergence
 * between the no-arg 401 and a parameter-laden non-401.
 *
 * Distinct from sibling admin-tree query smokes:
 *
 *   1. The 401 envelope carries the bare `'Unauthorized'`
 *      message (no `'. Admin access required.'` suffix) —
 *      distinct from the `admin/categories` / `admin/users`
 *      routes' role-context-specific
 *      `'Unauthorized. Admin access required.'`
 *      message and distinct from the `admin/notifications`
 *      route's two-step gate that distinguishes 401
 *      (session-missing) from 403 (role-missing).
 *   2. The route's six query params (`page`, `limit`,
 *      `search`, `status`, `plan`, `accountType`,
 *      `provider`) are read **after** the single-step
 *      admin gate. Out of scope for this spec because
 *      the gate fires before any of them on every
 *      unauth invocation.
 *   3. The route uses the legacy `getClientProfiles({…})`
 *      query helper from `lib/db/queries` rather than a
 *      repository abstraction — distinct from the
 *      `admin/categories` route's
 *      `categoryRepository.findAllPaginated(...)`
 *      posture. The repository-pattern posture is the
 *      production-source convention for new admin
 *      routes; future contributors who refactor this
 *      route to use a `clientRepository` should
 *      preserve the gate-order invariant this spec
 *      pins.
 *   4. The route is paired with downstream sibling
 *      routes at `/api/admin/clients/[clientId]/route.ts`
 *      (per-id read / update / delete),
 *      `/api/admin/clients/advanced-search/route.ts`
 *      (search), `/api/admin/clients/bulk/route.ts`
 *      (bulk operations), `/api/admin/clients/dashboard/route.ts`
 *      (per-client dashboard), and
 *      `/api/admin/clients/stats/route.ts` (aggregate
 *      stats). The listing route is the canonical entry
 *      point; the per-id / advanced-search / bulk /
 *      dashboard / stats routes are downstream
 *      mutations or per-record reads.
 *   5. The route's `POST` branch (out of scope here —
 *      this spec is GET-only) creates a new client
 *      profile, optionally creating the underlying
 *      user record with a temporary password and
 *      synchronously syncing to Twenty CRM via
 *      `createTwentyCrmSyncServiceFromEnv()` when
 *      `TWENTY_CRM_ENABLED !== 'false'`. The CRM-sync
 *      branch is environment-flag-gated and returns
 *      its successful response regardless of CRM-sync
 *      success. Future contributors who add a `POST`
 *      smoke must defend against the CRM-sync branch
 *      with a `TWENTY_CRM_ENABLED=false` environment
 *      override.
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this spec
 * adds the deep query-surface walk on top of that.
 */
const ADMIN_CLIENTS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/clients',

	// `?page=` / `?limit=` — pagination params validated
	// after the gate via `validatePaginationParams(...)`.
	'/api/admin/clients?page=1',
	'/api/admin/clients?page=2',
	'/api/admin/clients?limit=10',
	'/api/admin/clients?limit=100',
	'/api/admin/clients?page=1&limit=10',
	'/api/admin/clients?page=invalid',
	'/api/admin/clients?limit=invalid',
	'/api/admin/clients?page=-1',
	'/api/admin/clients?limit=0',
	'/api/admin/clients?limit=200',

	// `?search=` — name / email substring filter.
	'/api/admin/clients?search=john',
	'/api/admin/clients?search=acme',
	'/api/admin/clients?search=',

	// `?status=` — known and unknown values.
	'/api/admin/clients?status=active',
	'/api/admin/clients?status=inactive',
	'/api/admin/clients?status=suspended',
	'/api/admin/clients?status=trial',
	'/api/admin/clients?status=anything',

	// `?plan=` — known and unknown values.
	'/api/admin/clients?plan=free',
	'/api/admin/clients?plan=standard',
	'/api/admin/clients?plan=premium',
	'/api/admin/clients?plan=anything',

	// `?accountType=` — known and unknown values.
	'/api/admin/clients?accountType=individual',
	'/api/admin/clients?accountType=business',
	'/api/admin/clients?accountType=enterprise',
	'/api/admin/clients?accountType=anything',

	// `?provider=` — auth provider filter; never used
	// before the gate today.
	'/api/admin/clients?provider=google',
	'/api/admin/clients?provider=github',
	'/api/admin/clients?provider=credentials',

	// `?asAdmin=` / `?as=` — admin-impersonation keys a
	// future contributor might add. The route reads
	// admin status from `session.user.isAdmin`
	// exclusively today.
	'/api/admin/clients?asAdmin=true',
	'/api/admin/clients?as=admin',
	'/api/admin/clients?asUser=true',
	'/api/admin/clients?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/clients?token=anything',
	'/api/admin/clients?secret=anything',
	'/api/admin/clients?api_key=anything',
	'/api/admin/clients?authorization=Bearer+anything',
	'/api/admin/clients?session=anything',
	'/api/admin/clients?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/clients?bypass=1',
	'/api/admin/clients?admin=1',
	'/api/admin/clients?admin=true',
	'/api/admin/clients?override=true',
	'/api/admin/clients?force=true',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-
	// tenancy keys.
	'/api/admin/clients?tenant=acme',
	'/api/admin/clients?tenantId=42',
	'/api/admin/clients?org=ever-works',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys.
	'/api/admin/clients?fields=id',
	'/api/admin/clients?fields=id,email,plan',
	'/api/admin/clients?select=email',
	'/api/admin/clients?include=user',

	// `?refresh=` / `?cache=` — cache-busting keys.
	'/api/admin/clients?refresh=1',
	'/api/admin/clients?fresh=true',
	'/api/admin/clients?cache=bypass',
	'/api/admin/clients?nocache=1',

	// `?orderBy=` / `?sortBy=` — order-targeting keys.
	'/api/admin/clients?orderBy=joinedAt',
	'/api/admin/clients?orderBy=updatedAt',
	'/api/admin/clients?sortBy=plan',
	'/api/admin/clients?sortOrder=asc',
	'/api/admin/clients?sortOrder=desc',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/clients?locale=en',
	'/api/admin/clients?locale=fr',
	'/api/admin/clients?lang=de',

	// Repeated keys.
	'/api/admin/clients?page=1&page=2',
	'/api/admin/clients?status=active&status=inactive',

	// Bogus / typo'd query keys.
	'/api/admin/clients?unknown=value',
	'/api/admin/clients?foo=bar&baz=qux',
	'/api/admin/clients?asAdmin=true&token=foo&unknown=value&page=1&search=admin&foo=bar'
] as const;

test.describe('API: /api/admin/clients query-param surface', () => {
	for (const path of ADMIN_CLIENTS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's single-step admin gate fires
			// before any repository call. The unauth branch
			// returns 401 deterministically. There is no 5xx
			// branch reachable on the unauthenticated GET
			// surface because the catch can only fire after
			// the gate has already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/clients returns a 401 on the unauth branch', async ({ request }) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the single-step
		// `session?.user?.isAdmin` gate must fire before
		// any pagination validator. The status must be
		// exactly 401 (not 403).
		const response = await request.get('/api/admin/clients');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test('GET /api/admin/clients has a stable status across query permutations', async ({
		request
	}) => {
		// The route's six query params are read after the
		// single-step admin gate, so the response status
		// must be invariant to any combination of known
		// and unknown keys on the unauth branch.
		const baseline = await request.get('/api/admin/clients');
		const parameterised = await request.get(
			'/api/admin/clients?page=1&limit=10&search=admin&status=active&plan=free&accountType=business&provider=google&asAdmin=true&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/clients?asAdmin=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('asAdmin')` as a fallback for
		// `session?.user?.isAdmin` would change the
		// unauth branch from "always 401" to "200 if
		// ?asAdmin=true is present" — silently granting
		// any anonymous caller admin-level client-profile
		// visibility.
		const baseline = await request.get('/api/admin/clients');
		const responses = await Promise.all([
			request.get('/api/admin/clients?asAdmin=true'),
			request.get('/api/admin/clients?as=admin'),
			request.get('/api/admin/clients?asUser=true'),
			request.get('/api/admin/clients?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients?token=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who adds magic-token-based
		// admin bypass — e.g. a `?token=…` shortcut for
		// an internal CRM sync job, a `?secret=…`
		// shortcut for a staging-environment integration
		// test, or a `?authorization=Bearer …` header-
		// mirroring key — would change the unauth branch
		// from "always 401" to "200 if the right token
		// is present".
		const baseline = await request.get('/api/admin/clients');
		const responses = await Promise.all([
			request.get('/api/admin/clients?token=anything'),
			request.get('/api/admin/clients?secret=anything'),
			request.get('/api/admin/clients?api_key=anything'),
			request.get('/api/admin/clients?authorization=Bearer+anything'),
			request.get('/api/admin/clients?session=anything'),
			request.get('/api/admin/clients?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients?bypass=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who adds a `?bypass=…`,
		// `?admin=…`, or `?override=…` admin-override key
		// would change the unauth branch from "always 401"
		// to "200 if the right key is present".
		const baseline = await request.get('/api/admin/clients');
		const responses = await Promise.all([
			request.get('/api/admin/clients?bypass=1'),
			request.get('/api/admin/clients?admin=1'),
			request.get('/api/admin/clients?admin=true'),
			request.get('/api/admin/clients?override=true'),
			request.get('/api/admin/clients?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients?status=… does NOT introduce a status-filter bypass', async ({
		request
	}) => {
		// The route reads `?status=` after the gate today.
		// A future contributor who reads it before the
		// gate (e.g. as part of a multi-tenant resolver)
		// must not bypass the admin gate.
		const baseline = await request.get('/api/admin/clients');
		const responses = await Promise.all([
			request.get('/api/admin/clients?status=active'),
			request.get('/api/admin/clients?status=inactive'),
			request.get('/api/admin/clients?status=suspended'),
			request.get('/api/admin/clients?status=trial'),
			request.get('/api/admin/clients?status=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients?provider=… does NOT introduce a provider-filter bypass', async ({
		request
	}) => {
		// The route reads `?provider=` after the gate
		// today. A future contributor who passes the
		// caller-supplied provider id to a per-provider
		// service before the gate (e.g. to load a
		// per-provider client list optimistically) must
		// not bypass the admin gate.
		const baseline = await request.get('/api/admin/clients');
		const responses = await Promise.all([
			request.get('/api/admin/clients?provider=google'),
			request.get('/api/admin/clients?provider=github'),
			request.get('/api/admin/clients?provider=credentials'),
			request.get('/api/admin/clients?provider=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which
		// must round-trip to the same status on the unauth
		// branch.
		const responses = await Promise.all([
			request.get('/api/admin/clients'),
			request.get('/api/admin/clients?page=1&limit=10'),
			request.get(
				'/api/admin/clients?asAdmin=true&token=foo&page=invalid&status=active&plan=free&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/clients does NOT branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types
		// today; every Accept header must round-trip to
		// the same status on the unauth branch.
		const baseline = await request.get('/api/admin/clients');
		const responses = await Promise.all([
			request.get('/api/admin/clients', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/clients', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/clients', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/clients', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		// `searchParams.get(name)` returns the first
		// value of any repeated key, so repetition is
		// irrelevant on every branch. The unauth branch
		// must return 401 regardless of whether the
		// repeated value is valid or invalid.
		const baseline = await request.get('/api/admin/clients');
		const responses = await Promise.all([
			request.get('/api/admin/clients?page=1&page=2'),
			request.get('/api/admin/clients?status=active&status=inactive'),
			request.get('/api/admin/clients?plan=free&plan=premium')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients response message does NOT echo the role-context-specific suffix', async ({
		request
	}) => {
		// The 401 envelope carries the bare
		// `'Unauthorized'` message (no
		// `'. Admin access required.'` suffix) — distinct
		// from the `admin/categories` / `admin/users`
		// routes' role-context-specific
		// `'Unauthorized. Admin access required.'`
		// message. A regression that switches to the
		// role-context-specific suffix would surface
		// here.
		const response = await request.get('/api/admin/clients');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Unauthorized. Admin access required.');
		expect(body.error).not.toBe('Forbidden');
	});
});
