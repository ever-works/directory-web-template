import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only advanced-client-search endpoint served by
 * `apps/web/app/api/admin/clients/advanced-search/route.ts`.
 *
 * `GET /api/admin/clients/advanced-search` is the **first**
 * admin-tree route the smoke layer covers that documents
 * the unique combination of FOUR distinct contracts:
 *
 *   1. The **bare `{ error: '...' }` envelope** on the
 *      unauthenticated 401 branch — NOT the canonical
 *      `{ success: false, error: '...' }` shape every
 *      other admin-tree route's gate emits, and NOT the
 *      role-context-specific
 *      `'Unauthorized. Admin access required.'` message
 *      the categories-git / items-import / items-import-
 *      validate routes emit. The bare-envelope posture
 *      mirrors the categories-git route (the
 *      [`admin-categories-git-query.spec.ts`](./admin-categories-git-query.spec.ts)
 *      smoke spec covers) but with a bare `'Unauthorized'`
 *      message rather than the role-context suffix.
 *   2. A **richer-than-most query-param surface**
 *      (`?page=` / `?limit=` / `?search=` / `?status=` /
 *      `?plan=` / `?accountType=` / `?provider=` /
 *      `?sortBy=` / `?sortOrder=` / `?createdAfter=` /
 *      `?createdBefore=` / `?updatedAfter=` /
 *      `?updatedBefore=` plus the swagger-documented
 *      numeric / boolean filters) — the admin-tree
 *      route with the **largest** documented query-param
 *      surface. Every key is parsed AFTER the gate and
 *      the unauth branch must therefore be invariant to
 *      the entire combinatorial surface.
 *   3. The **`Number()` / `Number.isFinite()` /
 *      `Math.floor()` / `Math.min(Math.max(…, 1), 100)`
 *      pagination clamp posture** — distinct from the
 *      admin-roles route's
 *      `validatePaginationParams(searchParams)` helper
 *      and from the admin-categories route's
 *      Zod-schema-validated pagination posture. The
 *      route's clamp accepts every parseable integer
 *      (including negative / zero / non-integer
 *      values via the floor + clamp pipeline) and
 *      defaults silently rather than emitting a 400.
 *   4. A **`parseDate(v)` helper** that normalises
 *      `?createdAfter=` / `?createdBefore=` /
 *      `?updatedAfter=` / `?updatedBefore=` via
 *      `new Date(v)` + `Number.isNaN(d.getTime())`
 *      pinning — distinct from every other admin-tree
 *      route's date-param posture. The unauth branch
 *      must ignore the entire date-range surface
 *      regardless of malformed-date payloads.
 *
 * The handler:
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
 *         // pagination / search / status / plan / accountType
 *         // / provider / sortBy / sortOrder / date-range
 *         // params parsed AFTER the gate.
 *         const result = await advancedClientSearch({ ... });
 *         return NextResponse.json(result);
 *       } catch (error) {
 *         return NextResponse.json(
 *           { error: 'Failed to perform advanced search' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns null;
 *     `!session?.user?.isAdmin` is true; the route
 *     returns 401 with the **bare** `{ error: 'Unauthorized' }`
 *     envelope (NO `success` key). This is the contract
 *     every assertion below pins.
 *   - **Authenticated user, missing `isAdmin`**: same 401
 *     branch, same bare envelope.
 *   - **Admin with valid params**: returns 200 with the
 *     `advancedClientSearch` repository result. Out of
 *     scope.
 *   - **Internal error**: the catch returns 500 with
 *     `{ error: 'Failed to perform advanced search' }`
 *     (also bare-envelope shape). Out of scope.
 *
 * The route reads zero query params before the gate.
 * Every assertion below pins the unauth branch's 401
 * status invariance regardless of which keys the caller
 * appends.
 *
 * The shape mirrors the sibling admin-gated query-smoke
 * specs (`admin-categories-query.spec.ts`,
 * `admin-categories-all-query.spec.ts`,
 * `admin-categories-git-query.spec.ts`,
 * `admin-clients-query.spec.ts`,
 * `admin-clients-stats-query.spec.ts`,
 * `admin-clients-dashboard-query.spec.ts`,
 * `admin-collections-query.spec.ts`,
 * `admin-comments-query.spec.ts`,
 * `admin-companies-query.spec.ts`,
 * `admin-dashboard-stats-query.spec.ts`,
 * `admin-featured-items-query.spec.ts`,
 * `admin-geo-analytics-query.spec.ts`,
 * `admin-items-export-sample-query.spec.ts`,
 * `admin-items-query.spec.ts`,
 * `admin-items-stats-query.spec.ts`,
 * `admin-location-index-query.spec.ts`,
 * `admin-navigation-query.spec.ts`,
 * `admin-notifications-query.spec.ts`,
 * `admin-reports-query.spec.ts`,
 * `admin-roles-stats-query.spec.ts`,
 * `admin-settings-query.spec.ts`,
 * `admin-sponsor-ads-query.spec.ts`,
 * `admin-tags-query.spec.ts`,
 * `admin-tags-all-query.spec.ts`,
 * `admin-users-query.spec.ts`,
 * `admin-users-stats-query.spec.ts` smoke specs). The
 * advanced-search route is unique in that:
 *   1. It emits the **bare** `{ error: 'Unauthorized' }`
 *      envelope on 401 (NO `success` key) — distinct
 *      from every admin-tree route EXCEPT the
 *      categories-git / settings routes which use
 *      different bare-envelope variants.
 *   2. It has the **largest** documented query-param
 *      surface in the admin tree (13+ keys plus
 *      pagination), all parsed AFTER the gate.
 *   3. It uses an **inline** pagination clamp (`Number()`
 *      → `Number.isFinite()` → `Math.floor()` →
 *      `Math.min(Math.max(…, 1), 100)`) rather than the
 *      shared `validatePaginationParams()` helper.
 *   4. It exposes **four distinct date-range filters**
 *      (`createdAfter` / `createdBefore` /
 *      `updatedAfter` / `updatedBefore`) via a shared
 *      `parseDate(v)` helper that silently ignores
 *      `NaN`-valued `Date` objects rather than emitting
 *      a 400.
 *   5. The route's name is the only admin-tree route
 *      that documents an "advanced" prefix — distinct
 *      from the bare `/api/admin/clients` listing
 *      route's posture.
 */
const ADMIN_CLIENTS_ADVANCED_SEARCH_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/clients/advanced-search',

	// `?page=` / `?limit=` — the documented pagination
	// keys. The route uses an inline clamp rather than
	// the shared `validatePaginationParams()` helper.
	'/api/admin/clients/advanced-search?page=1',
	'/api/admin/clients/advanced-search?page=0',
	'/api/admin/clients/advanced-search?page=-1',
	'/api/admin/clients/advanced-search?page=999999',
	'/api/admin/clients/advanced-search?page=abc',
	'/api/admin/clients/advanced-search?page=',
	'/api/admin/clients/advanced-search?page=1.5',
	'/api/admin/clients/advanced-search?limit=10',
	'/api/admin/clients/advanced-search?limit=100',
	'/api/admin/clients/advanced-search?limit=999',
	'/api/admin/clients/advanced-search?limit=0',
	'/api/admin/clients/advanced-search?limit=-1',
	'/api/admin/clients/advanced-search?limit=abc',
	'/api/admin/clients/advanced-search?page=2&limit=20',

	// `?search=` — the general-search-term key.
	'/api/admin/clients/advanced-search?search=john',
	'/api/admin/clients/advanced-search?search=',
	'/api/admin/clients/advanced-search?search=%20',
	'/api/admin/clients/advanced-search?search=john%40example.com',
	'/api/admin/clients/advanced-search?search=%27%20OR%201%3D1',
	'/api/admin/clients/advanced-search?search=' + encodeURIComponent('a'.repeat(200)),

	// `?status=` — the swagger-enum'd status filter.
	'/api/admin/clients/advanced-search?status=active',
	'/api/admin/clients/advanced-search?status=inactive',
	'/api/admin/clients/advanced-search?status=suspended',
	'/api/admin/clients/advanced-search?status=trial',
	'/api/admin/clients/advanced-search?status=invalid',
	'/api/admin/clients/advanced-search?status=',

	// `?plan=` — the subscription-plan filter.
	'/api/admin/clients/advanced-search?plan=free',
	'/api/admin/clients/advanced-search?plan=standard',
	'/api/admin/clients/advanced-search?plan=premium',
	'/api/admin/clients/advanced-search?plan=enterprise',
	'/api/admin/clients/advanced-search?plan=',

	// `?accountType=` / `?provider=` — the auth-source
	// filters.
	'/api/admin/clients/advanced-search?accountType=email',
	'/api/admin/clients/advanced-search?accountType=oauth',
	'/api/admin/clients/advanced-search?provider=google',
	'/api/admin/clients/advanced-search?provider=github',
	'/api/admin/clients/advanced-search?provider=facebook',
	'/api/admin/clients/advanced-search?provider=twitter',
	'/api/admin/clients/advanced-search?provider=microsoft',

	// `?sortBy=` / `?sortOrder=` — the sort surface.
	'/api/admin/clients/advanced-search?sortBy=createdAt',
	'/api/admin/clients/advanced-search?sortBy=updatedAt',
	'/api/admin/clients/advanced-search?sortBy=name',
	'/api/admin/clients/advanced-search?sortBy=email',
	'/api/admin/clients/advanced-search?sortBy=company',
	'/api/admin/clients/advanced-search?sortBy=totalSubmissions',
	'/api/admin/clients/advanced-search?sortBy=invalid',
	'/api/admin/clients/advanced-search?sortOrder=asc',
	'/api/admin/clients/advanced-search?sortOrder=desc',
	'/api/admin/clients/advanced-search?sortOrder=invalid',

	// `?createdAfter=` / `?createdBefore=` /
	// `?updatedAfter=` / `?updatedBefore=` — the four
	// date-range filters. The `parseDate(v)` helper
	// silently ignores NaN-valued Date objects.
	'/api/admin/clients/advanced-search?createdAfter=2024-01-01',
	'/api/admin/clients/advanced-search?createdAfter=2024-01-01T00:00:00Z',
	'/api/admin/clients/advanced-search?createdAfter=invalid',
	'/api/admin/clients/advanced-search?createdAfter=',
	'/api/admin/clients/advanced-search?createdBefore=2025-12-31',
	'/api/admin/clients/advanced-search?updatedAfter=2024-06-01',
	'/api/admin/clients/advanced-search?updatedBefore=2025-06-01',
	'/api/admin/clients/advanced-search?createdAfter=2024-01-01&createdBefore=2024-12-31',

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys.
	'/api/admin/clients/advanced-search?userId=anything',
	'/api/admin/clients/advanced-search?user_id=anything',
	'/api/admin/clients/advanced-search?adminId=anything',
	'/api/admin/clients/advanced-search?as=admin',
	'/api/admin/clients/advanced-search?asUser=true',
	'/api/admin/clients/advanced-search?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/clients/advanced-search?token=anything',
	'/api/admin/clients/advanced-search?secret=anything',
	'/api/admin/clients/advanced-search?api_key=anything',
	'/api/admin/clients/advanced-search?authorization=Bearer+anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/clients/advanced-search?bypass=1',
	'/api/admin/clients/advanced-search?admin=1',
	'/api/admin/clients/advanced-search?override=true',
	'/api/admin/clients/advanced-search?force=true',

	// `?tenant=` / `?tenantId=` — multi-tenancy keys.
	'/api/admin/clients/advanced-search?tenant=acme',
	'/api/admin/clients/advanced-search?tenantId=42',

	// Repeated keys.
	'/api/admin/clients/advanced-search?status=active&status=inactive',
	'/api/admin/clients/advanced-search?sortBy=name&sortBy=email',
	'/api/admin/clients/advanced-search?page=1&page=2',

	// Bogus / typo'd query keys.
	'/api/admin/clients/advanced-search?unknown=value',
	'/api/admin/clients/advanced-search?foo=bar&baz=qux',
	'/api/admin/clients/advanced-search?status=active&plan=premium&search=john&sortBy=name&sortOrder=asc&unknown=value'
] as const;

test.describe('API: /api/admin/clients/advanced-search query-param surface', () => {
	for (const path of ADMIN_CLIENTS_ADVANCED_SEARCH_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's admin gate fires before any
			// `searchParams` parsing or `advancedClientSearch`
			// repository call, so the unauthenticated GET
			// surface returns a 4xx (specifically 401)
			// deterministically.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/clients/advanced-search returns a 401 with the bare { error } envelope on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the gate
		// (`!session?.user?.isAdmin`) returns 401 with
		// the **bare** `{ error: 'Unauthorized' }`
		// envelope (NO `success` key) — distinct from
		// every other admin-tree route's canonical
		// `{ success: false, error: 'Unauthorized' }`
		// shape.
		const response = await request.get('/api/admin/clients/advanced-search');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			error: 'Unauthorized'
		});
	});

	test('GET /api/admin/clients/advanced-search 401 envelope does NOT include a success key', async ({
		request
	}) => {
		// The bare-envelope posture is a deliberate
		// production-source choice. A regression that
		// switches to the canonical
		// `{ success: false, error: 'Unauthorized' }`
		// shape would be caught here as a positive-
		// shape assertion failure.
		const response = await request.get('/api/admin/clients/advanced-search');
		const body = await response.json();

		expect(body).not.toHaveProperty('success');
		expect(Object.keys(body)).toEqual(['error']);
	});

	test('GET /api/admin/clients/advanced-search has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads 13+ documented query params
		// AFTER the gate. The unauth branch's status
		// must be invariant to any combination of known
		// and unknown keys.
		const baseline = await request.get('/api/admin/clients/advanced-search');
		const parameterised = await request.get(
			'/api/admin/clients/advanced-search?page=1&limit=20&search=john&status=active&plan=premium&accountType=oauth&provider=google&sortBy=name&sortOrder=asc&createdAfter=2024-01-01&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/clients/advanced-search?page=… & ?limit=… do NOT bypass the admin gate', async ({
		request
	}) => {
		// The pagination params are parsed AFTER the
		// gate via the inline `Number()` /
		// `Number.isFinite()` / `Math.floor()` /
		// `Math.min(Math.max(…, 1), 100)` clamp. A
		// regression that reads pagination before the
		// gate would change the unauth branch from
		// "always 401" to "400 if pagination is
		// invalid".
		const baseline = await request.get('/api/admin/clients/advanced-search');
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search?page=1'),
			request.get('/api/admin/clients/advanced-search?page=-1'),
			request.get('/api/admin/clients/advanced-search?page=abc'),
			request.get('/api/admin/clients/advanced-search?page=999999'),
			request.get('/api/admin/clients/advanced-search?limit=10'),
			request.get('/api/admin/clients/advanced-search?limit=999'),
			request.get('/api/admin/clients/advanced-search?limit=0'),
			request.get('/api/admin/clients/advanced-search?limit=-1')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/advanced-search?status=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/advanced-search');
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search?status=active'),
			request.get('/api/admin/clients/advanced-search?status=inactive'),
			request.get('/api/admin/clients/advanced-search?status=suspended'),
			request.get('/api/admin/clients/advanced-search?status=trial'),
			request.get('/api/admin/clients/advanced-search?status=invalid'),
			request.get('/api/admin/clients/advanced-search?status=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/advanced-search?plan=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/advanced-search');
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search?plan=free'),
			request.get('/api/admin/clients/advanced-search?plan=standard'),
			request.get('/api/admin/clients/advanced-search?plan=premium'),
			request.get('/api/admin/clients/advanced-search?plan=enterprise'),
			request.get('/api/admin/clients/advanced-search?plan=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/advanced-search?provider=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The provider key targets the OAuth-provider
		// filter (google / github / facebook / twitter
		// / microsoft) — a future contributor who reads
		// `searchParams.get('provider')` as an auth-
		// source override would break the gate.
		const baseline = await request.get('/api/admin/clients/advanced-search');
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search?provider=google'),
			request.get('/api/admin/clients/advanced-search?provider=github'),
			request.get('/api/admin/clients/advanced-search?provider=facebook'),
			request.get('/api/admin/clients/advanced-search?provider=twitter'),
			request.get('/api/admin/clients/advanced-search?provider=microsoft')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/advanced-search?sortBy=… & ?sortOrder=… do NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/advanced-search');
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search?sortBy=createdAt'),
			request.get('/api/admin/clients/advanced-search?sortBy=updatedAt'),
			request.get('/api/admin/clients/advanced-search?sortBy=name'),
			request.get('/api/admin/clients/advanced-search?sortBy=email'),
			request.get('/api/admin/clients/advanced-search?sortBy=company'),
			request.get('/api/admin/clients/advanced-search?sortBy=totalSubmissions'),
			request.get('/api/admin/clients/advanced-search?sortBy=invalid'),
			request.get('/api/admin/clients/advanced-search?sortOrder=asc'),
			request.get('/api/admin/clients/advanced-search?sortOrder=desc'),
			request.get('/api/admin/clients/advanced-search?sortOrder=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/advanced-search?createdAfter=… & friends do NOT bypass the admin gate', async ({
		request
	}) => {
		// The four date-range filters
		// (`createdAfter` / `createdBefore` /
		// `updatedAfter` / `updatedBefore`) flow
		// through the `parseDate(v)` helper that
		// silently returns `undefined` for NaN-valued
		// `Date` objects rather than emitting a 400.
		// A regression that branches on date-parsing
		// failures (e.g. emits a 400 for malformed
		// `createdAfter`) before the gate would change
		// the unauth branch's status.
		const baseline = await request.get('/api/admin/clients/advanced-search');
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search?createdAfter=2024-01-01'),
			request.get('/api/admin/clients/advanced-search?createdAfter=invalid'),
			request.get('/api/admin/clients/advanced-search?createdAfter='),
			request.get('/api/admin/clients/advanced-search?createdBefore=2024-12-31'),
			request.get('/api/admin/clients/advanced-search?updatedAfter=2024-06-01'),
			request.get('/api/admin/clients/advanced-search?updatedBefore=2025-06-01'),
			request.get(
				'/api/admin/clients/advanced-search?createdAfter=2024-01-01&createdBefore=2024-12-31'
			)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/advanced-search?search=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `search` key feeds the
		// `advancedClientSearch` repository's general
		// search-term filter. The unauth branch must
		// be invariant to SQL-injection-shaped payloads,
		// long payloads, and special-character
		// payloads — every payload below MUST hit the
		// gate before reaching the repository call.
		const baseline = await request.get('/api/admin/clients/advanced-search');
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search?search=john'),
			request.get('/api/admin/clients/advanced-search?search='),
			request.get('/api/admin/clients/advanced-search?search=%27%20OR%201%3D1'),
			request.get('/api/admin/clients/advanced-search?search=' + encodeURIComponent('a'.repeat(500)))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/advanced-search?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback
		// for `auth()`'s session-driven user resolution
		// would change the unauth branch from "always
		// 401" to "200 if ?userId=… is present".
		const baseline = await request.get('/api/admin/clients/advanced-search');
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search?userId=admin'),
			request.get('/api/admin/clients/advanced-search?user_id=admin'),
			request.get('/api/admin/clients/advanced-search?adminId=admin'),
			request.get('/api/admin/clients/advanced-search?as=admin'),
			request.get('/api/admin/clients/advanced-search?asUser=true'),
			request.get('/api/admin/clients/advanced-search?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/advanced-search?token=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/advanced-search');
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search?token=anything'),
			request.get('/api/admin/clients/advanced-search?secret=anything'),
			request.get('/api/admin/clients/advanced-search?api_key=anything'),
			request.get('/api/admin/clients/advanced-search?authorization=Bearer+anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/advanced-search?bypass=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/advanced-search');
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search?bypass=1'),
			request.get('/api/admin/clients/advanced-search?admin=1'),
			request.get('/api/admin/clients/advanced-search?override=true'),
			request.get('/api/admin/clients/advanced-search?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/advanced-search keeps the response status stable across param permutations', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search'),
			request.get('/api/admin/clients/advanced-search?page=1&limit=10&status=active'),
			request.get(
				'/api/admin/clients/advanced-search?page=2&limit=50&search=john&status=inactive&plan=premium&accountType=oauth&provider=google&sortBy=email&sortOrder=desc&createdAfter=2024-01-01&createdBefore=2024-12-31&updatedAfter=2024-06-01&updatedBefore=2025-06-01&unknown=value&token=foo&bypass=1'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/clients/advanced-search does NOT branch on Accept header', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/advanced-search');
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/admin/clients/advanced-search', {
				headers: { Accept: 'text/csv' }
			}),
			request.get('/api/admin/clients/advanced-search', {
				headers: { Accept: 'application/xml' }
			}),
			request.get('/api/admin/clients/advanced-search', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/advanced-search repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/clients/advanced-search');
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search?status=active&status=inactive'),
			request.get('/api/admin/clients/advanced-search?sortBy=name&sortBy=email'),
			request.get('/api/admin/clients/advanced-search?page=1&page=2')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/clients/advanced-search keeps a NextRequest-typed handler signature stable under cookie / IP side channels', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get('/api/admin/clients/advanced-search', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/clients/advanced-search', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/clients/advanced-search', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/clients/advanced-search', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/clients/advanced-search response message is the bare "Unauthorized" (NOT "Forbidden", NOT role-context-specific suffix)', async ({
		request
	}) => {
		// The 401 envelope carries the bare
		// `'Unauthorized'` message — distinct from the
		// admin-categories-git / items-import / items-
		// import-validate routes'
		// `'Unauthorized. Admin access required.'`
		// message and the reports route's
		// `'Forbidden'` message. A regression that
		// switches to either alternative would surface
		// here as a body-divergence assertion failure.
		const response = await request.get('/api/admin/clients/advanced-search');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Forbidden');
		expect(body.error).not.toBe('Unauthorized. Admin access required.');
	});
});
