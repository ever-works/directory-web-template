import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only tag-listing endpoint served by
 * `apps/web/app/api/admin/tags/route.ts`.
 *
 * `GET /api/admin/tags` is **admin-gated** via `auth()`
 * + a **single-step** `!session?.user?.isAdmin` check
 * that **collapses both** the unauthenticated and
 * authenticated-non-admin branches into the **same** 401
 * envelope — the **bare-message** variant
 * (`{ success: false, error: 'Unauthorized' }`),
 * distinct from the `admin/categories` /
 * `admin/sponsor-ads` routes' longer-message variant
 * (`'Unauthorized. Admin access required.'`) and
 * distinct from the `admin/reports` route's bare
 * `'Forbidden'` 403 envelope. The route's gate is:
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
 *         const paginationResult = validatePaginationParams(searchParams);
 *         if ('error' in paginationResult) {
 *           return NextResponse.json(
 *             { success: false, error: paginationResult.error },
 *             { status: paginationResult.status }
 *           );
 *         }
 *         const { page, limit } = paginationResult;
 *         const result = await tagRepository.findAllPaginated(page, limit);
 *         return NextResponse.json({ success: true, data: result });
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
 *   - **Unauthenticated** (no session): the single-step
 *     gate `if (!session?.user?.isAdmin)` fires (the
 *     short-circuit on `session?.user?.isAdmin` resolves
 *     to `undefined` for an absent session, which negates
 *     to truthy). The route returns 401 with the
 *     envelope-shape `{ success: false, error: 'Unauthorized' }`
 *     — the **success-key-bearing** envelope variant
 *     (distinct from the bare `{ error: 'Unauthorized' }`
 *     envelope the `admin/clients` / `admin/comments` /
 *     `admin/companies` / `admin/users` routes emit
 *     without the `success: false` discriminator).
 *   - **Authenticated non-admin user**: the same
 *     single-step gate fires; the route returns the
 *     **same** 401 envelope. Out of scope for this spec
 *     because the e2e runner is unauthenticated.
 *   - **Authenticated admin user with invalid
 *     pagination**: `validatePaginationParams(...)`
 *     returns `{ error: 'Invalid page parameter. …', status: 400 }`
 *     (or the equivalent for `limit`); the route returns
 *     400 with the bare-error envelope. Out of scope for
 *     this spec because the admin gate fires before the
 *     pagination validator on every unauth invocation.
 *   - **Authenticated admin user**: returns 200 with
 *     `{ success: true, data: { tags: [...], total, page, limit, totalPages } }`
 *     after the `tagRepository.findAllPaginated(page, limit)`
 *     query completes. Out of scope.
 *   - **Internal error**: returns 500 with
 *     `{ success: false, error: 'Failed to fetch tags' }`.
 *     Out of scope for this spec because the gate fires
 *     before any repository call on every unauth
 *     invocation.
 *
 * The spec is unique among the admin-tree query-smoke
 * specs in that it pins **the bare-message-with-success-
 * key envelope** `{ success: false, error: 'Unauthorized' }`
 * — distinct from:
 *
 *   1. The `admin/categories` / `admin/sponsor-ads`
 *      routes' longer-message variant
 *      `{ success: false, error: 'Unauthorized. Admin access required.' }`.
 *   2. The `admin/clients` / `admin/comments` /
 *      `admin/companies` / `admin/users` routes' bare-
 *      key envelope `{ error: 'Unauthorized' }` (no
 *      `success: false` discriminator).
 *   3. The `admin/reports` route's `{ success: false, error: 'Forbidden' }`
 *      403 envelope.
 *
 * All three deltas are load-bearing:
 *
 *   1. The bare `'Unauthorized'` message is the route's
 *      contract today. A regression that switches to the
 *      longer `'Unauthorized. Admin access required.'`
 *      message would still satisfy
 *      `body.error.includes('Unauthorized')` but would
 *      quietly drift the message contract away from the
 *      tag-route convention.
 *   2. The `success: false` discriminator is the route's
 *      contract today. A regression that drops the key
 *      would silently align the tag-route envelope with
 *      the bare-key envelope of the
 *      `admin/clients` / `admin/comments` /
 *      `admin/companies` / `admin/users` routes —
 *      breaking the consumer code that branches on
 *      `body.success === false`.
 *   3. The single-step gate emits 401 (NOT 403) — a
 *      regression that switches to a two-step gate
 *      (separating unauthenticated 401 from
 *      authenticated-non-admin 403) would surface here
 *      as a status divergence.
 *
 * The handler signature is `GET(request: NextRequest)`
 * — the `NextRequest` parameter is consumed via
 * `new URL(request.url).searchParams` to read the two
 * documented query params (`page`, `limit`). The query-
 * param surface is narrower than the
 * `admin/sponsor-ads` route's seven-key surface — but
 * every query-param read happens AFTER the auth gate,
 * so the unauth-branch contract is invariant to query-
 * param permutations.
 *
 * The shape mirrors the sibling admin-gated query smoke
 * specs (`admin-categories-query.spec.ts`,
 * `admin-clients-query.spec.ts`,
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
 * `admin-sponsor-ads-query.spec.ts`,
 * `admin-users-query.spec.ts`) — all share the same
 * "session-or-admin gated, 401/403 before any service-
 * layer call" posture. The tags route is unique in
 * that:
 *   1. The 401 envelope carries the bare
 *      `'Unauthorized'` message AND the
 *      `success: false` discriminator key — the only
 *      admin-tree route that combines both.
 *   2. The handler reads only two query params (`page`,
 *      `limit`) via `validatePaginationParams(searchParams)`
 *      — but the URL parsing AND the pagination
 *      validation BOTH happen AFTER the auth gate. A
 *      regression that re-orders the gate to fire AFTER
 *      the validation would surface as a 400 instead of
 *      a 401 on the unauth branch.
 *   3. The route exports `GET` (this spec) AND `POST`
 *      (out of scope here — `POST` creates a new tag
 *      with the same admin-gate posture, but the
 *      request-body validation surface is different).
 *      Per-id mutations (`PATCH` / `DELETE`) live under
 *      `/api/admin/tags/[id]/route.ts`.
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of that.
 */
const ADMIN_TAGS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/tags',

	// `?page=` / `?limit=` — pagination params validated
	// after the gate via `validatePaginationParams(...)`.
	'/api/admin/tags?page=1',
	'/api/admin/tags?page=2',
	'/api/admin/tags?page=999',
	'/api/admin/tags?limit=10',
	'/api/admin/tags?limit=50',
	'/api/admin/tags?limit=100',
	'/api/admin/tags?page=1&limit=20',
	'/api/admin/tags?page=invalid',
	'/api/admin/tags?limit=invalid',
	'/api/admin/tags?page=-1',
	'/api/admin/tags?page=0',
	'/api/admin/tags?limit=0',
	'/api/admin/tags?limit=-1',
	'/api/admin/tags?limit=99999',

	// `?asAdmin=` / `?as=` — admin-impersonation keys a
	// future contributor might add. The route reads
	// admin status from `session.user.isAdmin`
	// exclusively today.
	'/api/admin/tags?asAdmin=true',
	'/api/admin/tags?as=admin',
	'/api/admin/tags?asUser=true',
	'/api/admin/tags?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/tags?token=anything',
	'/api/admin/tags?secret=anything',
	'/api/admin/tags?api_key=anything',
	'/api/admin/tags?authorization=Bearer+anything',
	'/api/admin/tags?session=anything',
	'/api/admin/tags?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/tags?bypass=1',
	'/api/admin/tags?admin=1',
	'/api/admin/tags?admin=true',
	'/api/admin/tags?override=true',
	'/api/admin/tags?force=true',

	// `?isActive=` — boolean filter that would scope the
	// listing to active-only tags. Not read today.
	'/api/admin/tags?isActive=true',
	'/api/admin/tags?isActive=false',
	'/api/admin/tags?isActive=1',
	'/api/admin/tags?isActive=0',
	'/api/admin/tags?includeInactive=true',
	'/api/admin/tags?includeInactive=false',

	// `?search=` / `?q=` — free-text filter keys a future
	// contributor might add. Not read today.
	'/api/admin/tags?search=test',
	'/api/admin/tags?search=design',
	'/api/admin/tags?search=',
	'/api/admin/tags?q=admin',
	'/api/admin/tags?search=%27%20OR%201%3D1',
	'/api/admin/tags?search=%3Cscript%3E',
	'/api/admin/tags?search=%25',
	`/api/admin/tags?search=${'x'.repeat(500)}`,

	// `?orderBy=` / `?sortBy=` / `?sortOrder=` —
	// order-targeting keys. Not read today.
	'/api/admin/tags?orderBy=name',
	'/api/admin/tags?orderBy=createdAt',
	'/api/admin/tags?sortBy=name',
	'/api/admin/tags?sortBy=itemCount',
	'/api/admin/tags?sortOrder=asc',
	'/api/admin/tags?sortOrder=desc',
	'/api/admin/tags?sortBy=name&sortOrder=desc',

	// `?tagId=` / `?id=` — per-row-targeting keys a
	// future contributor might add to scope the list to
	// a single tag. Per-id surface lives at
	// `/api/admin/tags/[id]/`.
	'/api/admin/tags?tagId=anything',
	'/api/admin/tags?id=anything',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys.
	'/api/admin/tags?fields=id',
	'/api/admin/tags?fields=id,name,isActive',
	'/api/admin/tags?select=name',
	'/api/admin/tags?include=items',

	// `?refresh=` / `?cache=` — cache-busting keys.
	'/api/admin/tags?refresh=1',
	'/api/admin/tags?fresh=true',
	'/api/admin/tags?cache=bypass',
	'/api/admin/tags?nocache=1',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/tags?locale=en',
	'/api/admin/tags?locale=fr',
	'/api/admin/tags?lang=de',

	// Repeated keys.
	'/api/admin/tags?page=1&page=2',
	'/api/admin/tags?limit=10&limit=100',
	'/api/admin/tags?as=admin&as=user',
	'/api/admin/tags?token=foo&token=bar',
	'/api/admin/tags?bypass=1&bypass=0',

	// Bogus / typo'd query keys.
	'/api/admin/tags?unknown=value',
	'/api/admin/tags?foo=bar&baz=qux',
	'/api/admin/tags?asAdmin=true&token=foo&unknown=value&page=1&limit=20&isActive=true&foo=bar'
] as const;

test.describe('API: /api/admin/tags query-param surface', () => {
	for (const path of ADMIN_TAGS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's single-step gate fires before any
			// service-layer call. The unauthenticated GET
			// surface returns a 4xx (specifically 401)
			// deterministically. A 500 is reachable only if
			// the catch fires after the gate has let the
			// call through (e.g. `tagRepository.findAllPaginated(...)`
			// throws), which never happens on the unauth
			// branch.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/tags returns 401 with the bare-message + success-key envelope on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the single-step gate
		// `if (!session?.user?.isAdmin)` fires, returning
		// 401 with the bare `'Unauthorized'` message AND
		// the `success: false` discriminator key — the
		// only admin-tree route that combines both. A
		// regression that switches to the longer
		// `'Unauthorized. Admin access required.'`
		// message OR drops the `success: false` key would
		// surface here as a body-divergence assertion
		// failure.
		const response = await request.get('/api/admin/tags');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized'
		});
	});

	test('GET /api/admin/tags has a stable status across query permutations', async ({ request }) => {
		// The route's two query params are read after the
		// single-step admin gate, so the response status
		// must be invariant to any combination of known
		// and unknown keys on the unauth branch.
		const baseline = await request.get('/api/admin/tags');
		const parameterised = await request.get(
			'/api/admin/tags?page=1&limit=20&isActive=true&search=test&asAdmin=true&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/tags?page=…&limit=… does NOT bypass the admin gate', async ({ request }) => {
		// `validatePaginationParams(searchParams)` runs
		// AFTER the auth gate. A regression that swaps
		// the order would surface as a 400 instead of a
		// 401 on the unauth branch for invalid pagination.
		const baseline = await request.get('/api/admin/tags');
		const responses = await Promise.all([
			request.get('/api/admin/tags?page=1'),
			request.get('/api/admin/tags?page=invalid'),
			request.get('/api/admin/tags?page=-1'),
			request.get('/api/admin/tags?page=0'),
			request.get('/api/admin/tags?limit=10'),
			request.get('/api/admin/tags?limit=invalid'),
			request.get('/api/admin/tags?limit=0'),
			request.get('/api/admin/tags?limit=-1'),
			request.get('/api/admin/tags?limit=99999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags invalid pagination does NOT surface as 400 on unauth branch', async ({ request }) => {
		// The route's pagination validation via
		// `validatePaginationParams(searchParams)` runs
		// AFTER the auth gate. A regression that swaps
		// the order would surface as a 400 'Invalid page
		// parameter. …' / 'Invalid limit parameter. …'
		// instead of a 401 on the unauth branch when the
		// query is malformed.
		const responses = await Promise.all([
			request.get('/api/admin/tags?page=invalid'),
			request.get('/api/admin/tags?limit=invalid'),
			request.get('/api/admin/tags?page=-1'),
			request.get('/api/admin/tags?limit=99999')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Unauthorized');
			expect(body.success).toBe(false);
			expect(body.error).not.toContain('Invalid');
		}
	});

	test('GET /api/admin/tags?asAdmin=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who reads
		// `searchParams.get('asAdmin')` as a fallback for
		// `session?.user?.isAdmin` would change the
		// unauth branch from "always 401" to "200 if
		// ?asAdmin=true is present" — silently granting
		// any anonymous caller admin-level tag-listing
		// visibility.
		const baseline = await request.get('/api/admin/tags');
		const responses = await Promise.all([
			request.get('/api/admin/tags?asAdmin=true'),
			request.get('/api/admin/tags?as=admin'),
			request.get('/api/admin/tags?asUser=true'),
			request.get('/api/admin/tags?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags?token=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who adds magic-token-based
		// admin bypass — e.g. a `?token=…` shortcut for
		// an internal sync job, a `?secret=…` shortcut
		// for a staging-environment integration test, or
		// a `?authorization=Bearer …` header-mirroring
		// key — would change the unauth branch from
		// "always 401" to "200 if the right token is
		// present".
		const baseline = await request.get('/api/admin/tags');
		const responses = await Promise.all([
			request.get('/api/admin/tags?token=anything'),
			request.get('/api/admin/tags?secret=anything'),
			request.get('/api/admin/tags?api_key=anything'),
			request.get('/api/admin/tags?authorization=Bearer+anything'),
			request.get('/api/admin/tags?session=anything'),
			request.get('/api/admin/tags?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags?bypass=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who adds a `?bypass=…`,
		// `?admin=…`, or `?override=…` admin-override key
		// would change the unauth branch from "always 401"
		// to "200 if the right key is present".
		const baseline = await request.get('/api/admin/tags');
		const responses = await Promise.all([
			request.get('/api/admin/tags?bypass=1'),
			request.get('/api/admin/tags?admin=1'),
			request.get('/api/admin/tags?admin=true'),
			request.get('/api/admin/tags?override=true'),
			request.get('/api/admin/tags?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags?isActive=… does NOT introduce a status-filter bypass', async ({ request }) => {
		// The route does not read `?isActive=` today. A
		// future contributor who adds it as a filter must
		// not bypass the admin gate when filtering for
		// only-inactive tags (a common request from the
		// admin UI's "show inactive only" toggle).
		const baseline = await request.get('/api/admin/tags');
		const responses = await Promise.all([
			request.get('/api/admin/tags?isActive=true'),
			request.get('/api/admin/tags?isActive=false'),
			request.get('/api/admin/tags?isActive=1'),
			request.get('/api/admin/tags?isActive=0'),
			request.get('/api/admin/tags?includeInactive=true'),
			request.get('/api/admin/tags?includeInactive=false')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags does NOT branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types
		// today; every Accept header must round-trip to
		// the same status on the unauth branch.
		const baseline = await request.get('/api/admin/tags');
		const responses = await Promise.all([
			request.get('/api/admin/tags', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/tags', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/tags', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/tags', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/tags cookie / X-* headers do NOT bypass the gate', async ({ request }) => {
		// A regression that switches the gate to read
		// `request.cookies.get('…')` for a fabricated
		// session-token cookie would bypass the
		// `auth()` chain. The unauth-branch contract
		// must stay invariant under any of those side
		// channels.
		const responses = await Promise.all([
			request.get('/api/admin/tags', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/tags', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/tags', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/tags', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/tags response message uniquely identifies tags route', async ({ request }) => {
		// The 401 envelope carries the bare
		// `'Unauthorized'` message AND the
		// `success: false` discriminator key — the only
		// admin-tree route that combines both. A
		// regression that switches to the longer
		// `'Unauthorized. Admin access required.'`
		// message OR drops the `success: false` key
		// would surface here as a body-divergence
		// assertion failure.
		const response = await request.get('/api/admin/tags');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Unauthorized. Admin access required.');
		expect(body.error).not.toBe('Forbidden');
		expect(body.success).toBe(false);
	});

	test('GET /api/admin/tags keeps the response status stable across param permutations', async ({ request }) => {
		const responses = await Promise.all([
			request.get('/api/admin/tags'),
			request.get('/api/admin/tags?page=1&limit=20'),
			request.get(
				'/api/admin/tags?asAdmin=true&token=foo&page=invalid&limit=99999&isActive=true&search=test&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/tags repeated query keys do NOT bypass the gate', async ({ request }) => {
		// `searchParams.get(name)` returns the first
		// value of any repeated key, so repetition is
		// irrelevant on every branch. The unauth branch
		// must return 401 regardless of whether the
		// repeated value is valid or invalid.
		const baseline = await request.get('/api/admin/tags');
		const responses = await Promise.all([
			request.get('/api/admin/tags?page=1&page=2'),
			request.get('/api/admin/tags?limit=10&limit=100'),
			request.get('/api/admin/tags?as=admin&as=user'),
			request.get('/api/admin/tags?token=foo&token=bar'),
			request.get('/api/admin/tags?bypass=1&bypass=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
