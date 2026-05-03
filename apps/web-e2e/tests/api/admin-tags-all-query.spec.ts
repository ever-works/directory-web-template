import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only Git-CMS tags-listing endpoint served by
 * `apps/web/app/api/admin/tags/all/route.ts`.
 *
 * `GET /api/admin/tags/all` is the **first** admin-tree
 * route the smoke layer covers that documents:
 *
 *   1. The **`getCachedItems({ lang })` Git-based CMS
 *      reader** — distinct from every other admin-tree
 *      route's database-backed posture. The `getCachedItems`
 *      helper reads from the per-locale tag list stored in
 *      the Git-based content repository (cloned from
 *      `DATA_REPOSITORY` into `.content/`); the tag list
 *      is materialised at build time and cached in-memory
 *      per-locale.
 *   2. A **`?locale=` query param with type-coercion
 *      validation** — the only documented query key on
 *      this route. The handler reads
 *      `searchParams.get('locale')`, defaults to `'en'` if
 *      the param is missing, then explicitly checks
 *      `typeof locale !== 'string'` (a defensive type
 *      narrowing that can never fire today because
 *      `searchParams.get(name)` always returns
 *      `string | null`). The dead-branch defensive check
 *      is the **first** admin-tree route the smoke layer
 *      covers that emits a 400 'Invalid locale parameter'
 *      response from a never-reachable code path.
 *   3. The **paired tags-data-route posture** — this
 *      route is the read-only Git-CMS variant of the
 *      database-backed `/api/admin/tags` listing route.
 *      Both routes use the same admin-gate posture but
 *      different data backends. Distinct from the
 *      `/api/admin/categories/all` sibling route which
 *      uses the same posture for categories.
 *
 * The handler:
 *
 *     export async function GET(request: NextRequest) {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.isAdmin) {
 *           return NextResponse.json(
 *             { success: false, error: 'Unauthorized' },
 *             { status: 401 }
 *           );
 *         }
 *         const { searchParams } = new URL(request.url);
 *         const locale = searchParams.get('locale') || 'en';
 *         if (locale && typeof locale !== 'string') {
 *           return NextResponse.json(
 *             { success: false, error: 'Invalid locale parameter' },
 *             { status: 400 }
 *           );
 *         }
 *         const { tags } = await getCachedItems({ lang: locale });
 *         return NextResponse.json({ success: true, data: tags });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Failed to fetch tags' },
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
 *     returns 401 with the canonical
 *     `{ success: false, error: 'Unauthorized' }`
 *     envelope. This is the contract every assertion
 *     below pins.
 *   - **Authenticated user, missing `isAdmin`**: same 401
 *     branch.
 *   - **Admin with valid locale**: returns 200 with
 *     `{ success: true, data: [...tags] }`. Out of scope.
 *   - **Internal error**: the catch returns 500 with
 *     `{ success: false, error: 'Failed to fetch tags' }`.
 *     Out of scope.
 *
 * The route reads zero query params before the gate.
 * Every assertion below pins the unauth branch's 401
 * status invariance regardless of which keys the caller
 * appends.
 *
 * The shape mirrors the sibling admin-gated query-smoke
 * specs (`admin-categories-query.spec.ts`,
 * `admin-collections-query.spec.ts`,
 * `admin-comments-query.spec.ts`,
 * `admin-companies-query.spec.ts`,
 * `admin-dashboard-stats-query.spec.ts`,
 * `admin-featured-items-query.spec.ts`,
 * `admin-geo-analytics-query.spec.ts`,
 * `admin-items-export-sample-query.spec.ts`,
 * `admin-items-query.spec.ts`,
 * `admin-items-stats-query.spec.ts`,
 * `admin-notifications-query.spec.ts`,
 * `admin-reports-query.spec.ts`,
 * `admin-roles-stats-query.spec.ts`,
 * `admin-settings-query.spec.ts`,
 * `admin-users-query.spec.ts`,
 * `admin-sponsor-ads-query.spec.ts` smoke specs). The
 * tags-all route is unique in that:
 *   1. It reads from a Git-based CMS (cloned from
 *      `DATA_REPOSITORY` into `.content/`) rather than
 *      from a database — distinct from every other
 *      admin-tree route's drizzle / Postgres posture.
 *   2. It accepts a single `?locale=` query param after
 *      the gate, with a defensive `typeof locale !== 'string'`
 *      narrowing that can never fire today (because
 *      `searchParams.get(...)` always returns
 *      `string | null`, and the `|| 'en'` default
 *      coerces null to a string before the typeof check).
 *      The dead-branch validator is a defensive posture
 *      against future contributors who refactor the
 *      locale resolution to read from a different source.
 *   3. The 401 envelope carries the bare `'Unauthorized'`
 *      message (NOT
 *      `'Unauthorized. Admin access required.'` /
 *      'Forbidden').
 *   4. The handler signature is `GET(request: NextRequest)`
 *      — the Next-specific request type. Distinct from
 *      the reports route's bare `Request` type.
 *   5. The route is paired with the database-backed
 *      `/api/admin/tags` listing endpoint that returns
 *      paginated tag rows with `{ tags, total, page,
 *      limit, totalPages }`. The two routes share the
 *      same admin gate but different data backends; new
 *      consumers of the tags admin surface must choose
 *      between the database-backed listing (with
 *      pagination) and the Git-CMS-backed listing (per-
 *      locale, no pagination).
 */
const ADMIN_TAGS_ALL_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/tags/all',

	// `?locale=` — the only documented query param.
	'/api/admin/tags/all?locale=en',
	'/api/admin/tags/all?locale=fr',
	'/api/admin/tags/all?locale=es',
	'/api/admin/tags/all?locale=de',
	'/api/admin/tags/all?locale=ar',
	'/api/admin/tags/all?locale=zh',
	'/api/admin/tags/all?locale=invalid',
	'/api/admin/tags/all?locale=',

	// Locale-related variations.
	'/api/admin/tags/all?lang=en',
	'/api/admin/tags/all?language=en',
	'/api/admin/tags/all?l=en',

	// `?page=` / `?limit=` — pagination keys for a
	// future contributor (the route does not paginate
	// today; the Git-CMS posture returns the full per-
	// locale tag list).
	'/api/admin/tags/all?page=1',
	'/api/admin/tags/all?limit=10',
	'/api/admin/tags/all?page=1&limit=20',

	// `?status=` / `?active=` — filter keys for a future
	// contributor.
	'/api/admin/tags/all?status=active',
	'/api/admin/tags/all?active=true',
	'/api/admin/tags/all?active=false',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys.
	'/api/admin/tags/all?fields=id',
	'/api/admin/tags/all?fields=id,name',
	'/api/admin/tags/all?select=name',
	'/api/admin/tags/all?include=count',

	// `?refresh=` / `?force=` / `?cache=` — cache-
	// busting keys (notable for this route because the
	// Git-CMS reader has its own in-memory cache that
	// could be invalidated via a future query key).
	'/api/admin/tags/all?refresh=1',
	'/api/admin/tags/all?fresh=true',
	'/api/admin/tags/all?cache=bypass',
	'/api/admin/tags/all?nocache=1',

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys.
	'/api/admin/tags/all?userId=anything',
	'/api/admin/tags/all?user_id=anything',
	'/api/admin/tags/all?adminId=anything',
	'/api/admin/tags/all?as=admin',
	'/api/admin/tags/all?asUser=true',
	'/api/admin/tags/all?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/tags/all?token=anything',
	'/api/admin/tags/all?secret=anything',
	'/api/admin/tags/all?api_key=anything',
	'/api/admin/tags/all?authorization=Bearer+anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/tags/all?bypass=1',
	'/api/admin/tags/all?admin=1',
	'/api/admin/tags/all?override=true',
	'/api/admin/tags/all?force=true',

	// `?tenant=` / `?tenantId=` — multi-tenancy keys.
	'/api/admin/tags/all?tenant=acme',
	'/api/admin/tags/all?tenantId=42',

	// `?repo=` / `?branch=` / `?commit=` — Git-CMS-
	// targeting keys for a future contributor (the
	// route reads from the per-environment-cloned
	// `.content/` directory today, but a future
	// per-tenant or per-branch override would be a
	// security-sensitive vector).
	'/api/admin/tags/all?repo=anything',
	'/api/admin/tags/all?branch=main',
	'/api/admin/tags/all?commit=abc123',

	// Repeated keys.
	'/api/admin/tags/all?locale=en&locale=fr',
	'/api/admin/tags/all?locale=&locale=en',

	// Bogus / typo'd query keys.
	'/api/admin/tags/all?unknown=value',
	'/api/admin/tags/all?foo=bar&baz=qux',
	'/api/admin/tags/all?userId=admin&token=foo&unknown=value&locale=en&foo=bar'
] as const;

test.describe('API: /api/admin/tags/all query-param surface', () => {
	for (const path of ADMIN_TAGS_ALL_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's admin gate fires before any
			// `searchParams` parsing or Git-CMS read, so the
			// unauthenticated GET surface returns a 4xx
			// (specifically 401) deterministically.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/tags/all returns a 401 with the canonical { success, error } envelope on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the gate
		// (`!session?.user?.isAdmin`) returns 401 with
		// the canonical `{ success: false, error: 'Unauthorized' }`
		// envelope (the bare `'Unauthorized'` message,
		// NOT `'Unauthorized. Admin access required.'`,
		// NOT `'Forbidden'`).
		const response = await request.get('/api/admin/tags/all');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized'
		});
	});

	test('GET /api/admin/tags/all has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads ONE documented query param
		// (`locale`) AFTER the gate. The unauth branch's
		// status must be invariant to any combination of
		// known and unknown keys.
		const baseline = await request.get('/api/admin/tags/all');
		const parameterised = await request.get(
			'/api/admin/tags/all?locale=fr&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/tags/all?locale=… does NOT bypass the admin gate', async ({ request }) => {
		// The `?locale=` param is parsed AFTER the gate.
		// A regression that reads the locale before the
		// gate (e.g. to short-circuit on an invalid
		// locale value) would change the unauth branch
		// from "always 401" to "400 if locale is
		// invalid" — and that change is what this
		// assertion catches.
		const baseline = await request.get('/api/admin/tags/all');
		const responses = await Promise.all([
			request.get('/api/admin/tags/all?locale=en'),
			request.get('/api/admin/tags/all?locale=fr'),
			request.get('/api/admin/tags/all?locale=es'),
			request.get('/api/admin/tags/all?locale=de'),
			request.get('/api/admin/tags/all?locale=ar'),
			request.get('/api/admin/tags/all?locale=zh'),
			request.get('/api/admin/tags/all?locale=invalid'),
			request.get('/api/admin/tags/all?locale=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags/all?userId=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven user resolution would
		// change the unauth branch from "always 401" to
		// "200 if ?userId=… is present".
		const baseline = await request.get('/api/admin/tags/all');
		const responses = await Promise.all([
			request.get('/api/admin/tags/all?userId=admin'),
			request.get('/api/admin/tags/all?user_id=admin'),
			request.get('/api/admin/tags/all?adminId=admin'),
			request.get('/api/admin/tags/all?as=admin'),
			request.get('/api/admin/tags/all?asUser=true'),
			request.get('/api/admin/tags/all?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags/all?token=… does NOT bypass the admin gate', async ({ request }) => {
		const baseline = await request.get('/api/admin/tags/all');
		const responses = await Promise.all([
			request.get('/api/admin/tags/all?token=anything'),
			request.get('/api/admin/tags/all?secret=anything'),
			request.get('/api/admin/tags/all?api_key=anything'),
			request.get('/api/admin/tags/all?authorization=Bearer+anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags/all?bypass=… does NOT bypass the admin gate', async ({ request }) => {
		const baseline = await request.get('/api/admin/tags/all');
		const responses = await Promise.all([
			request.get('/api/admin/tags/all?bypass=1'),
			request.get('/api/admin/tags/all?admin=1'),
			request.get('/api/admin/tags/all?override=true'),
			request.get('/api/admin/tags/all?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags/all?repo=…&branch=…&commit=… does NOT introduce a Git-CMS-source bypass', async ({
		request
	}) => {
		// The route reads from the per-environment-cloned
		// `.content/` directory today via the
		// `getCachedItems({ lang })` helper. A future
		// contributor who exposes Git-CMS-source
		// configuration via query params (`?repo=…` /
		// `?branch=…` / `?commit=…`) must not bypass the
		// admin gate. The unauth branch's status must be
		// invariant to the Git-CMS-targeting keys.
		const baseline = await request.get('/api/admin/tags/all');
		const responses = await Promise.all([
			request.get('/api/admin/tags/all?repo=anything'),
			request.get('/api/admin/tags/all?branch=main'),
			request.get('/api/admin/tags/all?commit=abc123')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags/all?refresh=… does NOT introduce a cache-bust bypass', async ({
		request
	}) => {
		// The Git-CMS-backed `getCachedItems({ lang })`
		// helper has its own in-memory cache that could be
		// invalidated via a future query key. Any cache-
		// busting key must not bypass the admin gate.
		const baseline = await request.get('/api/admin/tags/all');
		const responses = await Promise.all([
			request.get('/api/admin/tags/all?refresh=1'),
			request.get('/api/admin/tags/all?fresh=true'),
			request.get('/api/admin/tags/all?cache=bypass'),
			request.get('/api/admin/tags/all?nocache=1')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags/all keeps the response status stable across param permutations', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get('/api/admin/tags/all'),
			request.get('/api/admin/tags/all?locale=en&refresh=1'),
			request.get(
				'/api/admin/tags/all?userId=admin&token=foo&locale=invalid&unknown=bar&refresh=1&bypass=1'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/tags/all does NOT branch on Accept header', async ({ request }) => {
		const baseline = await request.get('/api/admin/tags/all');
		const responses = await Promise.all([
			request.get('/api/admin/tags/all', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/tags/all', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/tags/all', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/tags/all', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags/all repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/tags/all');
		const responses = await Promise.all([
			request.get('/api/admin/tags/all?locale=en&locale=fr'),
			request.get('/api/admin/tags/all?locale=&locale=en')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags/all keeps a NextRequest-typed handler signature stable under cookie / IP side channels', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get('/api/admin/tags/all', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/tags/all', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/tags/all', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/tags/all', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/tags/all response message is the bare "Unauthorized" (NOT "Forbidden", NOT role-context-specific suffix)', async ({
		request
	}) => {
		// The 401 envelope carries the bare
		// `'Unauthorized'` message — distinct from the
		// admin-categories route's
		// `'Unauthorized. Admin access required.'`
		// message and the reports route's `'Forbidden'`
		// message. A regression that switches to either
		// alternative would surface here as a body-
		// divergence assertion failure.
		const response = await request.get('/api/admin/tags/all');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Forbidden');
		expect(body.error).not.toBe('Unauthorized. Admin access required.');
	});
});
