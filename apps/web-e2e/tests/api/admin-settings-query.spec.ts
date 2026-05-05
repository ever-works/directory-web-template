import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only settings-fetching endpoint served by
 * `apps/web/app/api/admin/settings/route.ts`.
 *
 * `GET /api/admin/settings` is the **first** admin-tree
 * route the smoke layer covers that documents:
 *
 *   1. The **`getCachedApiSession(req)` cached-session
 *      helper** — a custom variant of `auth()` that
 *      caches the session lookup per-request to avoid
 *      duplicate cookie-based auth calls within the same
 *      request lifecycle. Distinct from every other
 *      admin-tree route's bare `auth()` posture.
 *   2. A **bare `{ error: '...' }` envelope** (NOT the
 *      `{ success: false, error: '...' }` shape every
 *      other admin-tree route emits). The 401 response
 *      body is `{ error: 'Unauthorized' }` — a single-
 *      key envelope without the `success` discriminant.
 *      A regression that switches to the canonical
 *      `success: false` envelope would change the
 *      consuming-client contract; a regression that
 *      switches the bare envelope to a `success: true`
 *      shape on the unauth branch would silently
 *      indicate success on a 401 response.
 *
 * The handler:
 *
 *     export async function GET(req: NextRequest) {
 *       try {
 *         const session = await getCachedApiSession(req);
 *         if (!session?.user?.isAdmin) {
 *           return NextResponse.json(
 *             { error: 'Unauthorized' },
 *             { status: 401 }
 *           );
 *         }
 *         const config = configManager.getConfig();
 *         const settings = config.settings || {};
 *         return NextResponse.json({ settings }, { status: 200 });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { error: 'Failed to fetch settings' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The route reads zero query params today — the handler
 * body is a session check, then a config read, then a
 * `NextResponse.json({ settings })` echo. A regression
 * that introduces query-param branching (e.g. a future
 * `?section=…` filter that scopes the response to a
 * single section) must not bypass the admin gate.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `getCachedApiSession()`
 *     returns a session without `isAdmin`; the route
 *     returns 401 with the bare
 *     `{ error: 'Unauthorized' }` envelope.
 *   - **Authenticated user, missing `isAdmin`**: same
 *     401 branch.
 *   - **Admin**: returns 200 with `{ settings }`. Out of
 *     scope.
 *   - **Internal error**: the catch returns 500 with
 *     `{ error: 'Failed to fetch settings' }`. Out of
 *     scope.
 *
 * The spec mirrors the sibling admin-gated query-smoke
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
 * `admin-users-query.spec.ts` smoke specs) but the
 * settings-route is unique in that:
 *   1. It uses `getCachedApiSession(req)` instead of
 *      `auth()` — same gate semantics, different cache
 *      contract.
 *   2. It emits the bare `{ error }` envelope instead of
 *      `{ success: false, error }`.
 *   3. The handler reads zero query params today.
 *   4. The 401 message is the bare `'Unauthorized'`
 *      (NOT `'Forbidden'`, NOT `'Unauthorized. Admin
 *      access required.'`).
 *   5. The route reads from `configManager.getConfig()`
 *      (a YAML-config-file-backed singleton) rather
 *      than from a database. The config-manager posture
 *      means the response on the auth branch is a
 *      synchronous file-read, distinct from every other
 *      admin-tree route's async DB query.
 *   6. The route's PATCH counterpart (used by the
 *      settings page's per-control mutations) is gated
 *      identically. Both share the same
 *      `getCachedApiSession` + `isAdmin` gate ordering,
 *      but PATCH adds a `key`-required body validation
 *      after the gate.
 */
const ADMIN_SETTINGS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/settings',

	// `?section=` / `?key=` — filter keys for a future
	// contributor.
	'/api/admin/settings?section=general',
	'/api/admin/settings?section=homepage',
	'/api/admin/settings?section=header',
	'/api/admin/settings?section=footer',
	'/api/admin/settings?section=monetization',
	'/api/admin/settings?section=invalid',
	'/api/admin/settings?section=',
	'/api/admin/settings?key=enabled',
	'/api/admin/settings?key=anything',
	'/api/admin/settings?keys=a,b,c',

	// `?expand=` / `?include=` / `?fields=` — content-
	// projection keys.
	'/api/admin/settings?expand=true',
	'/api/admin/settings?include=meta',
	'/api/admin/settings?fields=settings.general',
	'/api/admin/settings?select=enabled',

	// `?refresh=` / `?force=` / `?cache=` — cache-busting
	// keys.
	'/api/admin/settings?refresh=1',
	'/api/admin/settings?fresh=true',
	'/api/admin/settings?cache=bypass',
	'/api/admin/settings?nocache=1',

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys.
	'/api/admin/settings?userId=anything',
	'/api/admin/settings?user_id=anything',
	'/api/admin/settings?adminId=anything',
	'/api/admin/settings?as=admin',
	'/api/admin/settings?asUser=true',
	'/api/admin/settings?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/settings?token=anything',
	'/api/admin/settings?secret=anything',
	'/api/admin/settings?api_key=anything',
	'/api/admin/settings?authorization=Bearer+anything',
	'/api/admin/settings?session=anything',
	'/api/admin/settings?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/settings?bypass=1',
	'/api/admin/settings?admin=1',
	'/api/admin/settings?admin=true',
	'/api/admin/settings?override=true',
	'/api/admin/settings?force=true',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-
	// tenancy keys.
	'/api/admin/settings?tenant=acme',
	'/api/admin/settings?tenantId=42',
	'/api/admin/settings?org=ever-works',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/settings?locale=en',
	'/api/admin/settings?locale=fr',
	'/api/admin/settings?lang=de',

	// Repeated keys.
	'/api/admin/settings?section=general&section=homepage',
	'/api/admin/settings?key=a&key=b',

	// Bogus / typo'd query keys.
	'/api/admin/settings?unknown=value',
	'/api/admin/settings?foo=bar&baz=qux',
	'/api/admin/settings?userId=admin&token=foo&unknown=value&section=general&foo=bar'
] as const;

test.describe('API: /api/admin/settings query-param surface', () => {
	for (const path of ADMIN_SETTINGS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's admin gate fires before any
			// `searchParams` parsing or config read, so the
			// unauthenticated GET surface returns a 4xx
			// (specifically 401) deterministically.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/settings returns a 401 with a BARE { error } envelope on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the gate
		// (`!session?.user?.isAdmin`) returns 401 with
		// the BARE `{ error: 'Unauthorized' }` envelope —
		// distinct from the canonical
		// `{ success: false, error: ... }` shape every
		// other admin-tree route emits. A regression that
		// switches to the canonical envelope would change
		// the consuming-client contract; a regression
		// that switches the bare envelope to a
		// `{ success: true, ... }` shape on the unauth
		// branch would silently indicate success on a 401
		// response.
		const response = await request.get('/api/admin/settings');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			error: 'Unauthorized'
		});

		// Also pin the negative shape: the body must NOT
		// include a `success` key (which every other
		// admin-tree route emits).
		expect(body.success).toBeUndefined();
	});

	test('GET /api/admin/settings has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads zero query params today, so the
		// response status must be invariant to any
		// combination of known and unknown keys on the
		// unauth branch. A regression that introduces
		// query-param branching before the gate (e.g. a
		// `?section=…` filter that runs the config read
		// before the auth check) would surface here as a
		// status divergence.
		const baseline = await request.get('/api/admin/settings');
		const parameterised = await request.get(
			'/api/admin/settings?section=general&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/settings?section=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who reads
		// `searchParams.get('section')` BEFORE the gate
		// (e.g. to short-circuit the response when the
		// section name is invalid) would surface here as
		// a status divergence between the no-arg 401 and
		// a parameter-laden 400.
		const baseline = await request.get('/api/admin/settings');
		const responses = await Promise.all([
			request.get('/api/admin/settings?section=general'),
			request.get('/api/admin/settings?section=homepage'),
			request.get('/api/admin/settings?section=header'),
			request.get('/api/admin/settings?section=footer'),
			request.get('/api/admin/settings?section=monetization'),
			request.get('/api/admin/settings?section=invalid'),
			request.get('/api/admin/settings?section=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `getCachedApiSession()`'s session-driven user
		// resolution would change the unauth branch from
		// "always 401" to "200 if ?userId=… is present".
		const baseline = await request.get('/api/admin/settings');
		const responses = await Promise.all([
			request.get('/api/admin/settings?userId=admin'),
			request.get('/api/admin/settings?user_id=admin'),
			request.get('/api/admin/settings?adminId=admin'),
			request.get('/api/admin/settings?as=admin'),
			request.get('/api/admin/settings?asUser=true'),
			request.get('/api/admin/settings?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings?token=… does NOT bypass the admin gate', async ({ request }) => {
		const baseline = await request.get('/api/admin/settings');
		const responses = await Promise.all([
			request.get('/api/admin/settings?token=anything'),
			request.get('/api/admin/settings?secret=anything'),
			request.get('/api/admin/settings?api_key=anything'),
			request.get('/api/admin/settings?authorization=Bearer+anything'),
			request.get('/api/admin/settings?session=anything'),
			request.get('/api/admin/settings?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings?bypass=… does NOT bypass the admin gate', async ({ request }) => {
		const baseline = await request.get('/api/admin/settings');
		const responses = await Promise.all([
			request.get('/api/admin/settings?bypass=1'),
			request.get('/api/admin/settings?admin=1'),
			request.get('/api/admin/settings?admin=true'),
			request.get('/api/admin/settings?override=true'),
			request.get('/api/admin/settings?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings?refresh=… does NOT introduce a cache-bust bypass', async ({
		request
	}) => {
		// A future contributor who adds a cache-bust key
		// (`?refresh=1` / `?nocache=1` / `?cache=bypass`)
		// must not bypass the admin gate.
		const baseline = await request.get('/api/admin/settings');
		const responses = await Promise.all([
			request.get('/api/admin/settings?refresh=1'),
			request.get('/api/admin/settings?fresh=true'),
			request.get('/api/admin/settings?cache=bypass'),
			request.get('/api/admin/settings?nocache=1')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth
		// branch.
		const responses = await Promise.all([
			request.get('/api/admin/settings'),
			request.get('/api/admin/settings?section=general&refresh=1'),
			request.get(
				'/api/admin/settings?userId=admin&token=foo&section=invalid&unknown=bar&refresh=1&bypass=1'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/settings does NOT branch on Accept header', async ({ request }) => {
		const baseline = await request.get('/api/admin/settings');
		const responses = await Promise.all([
			request.get('/api/admin/settings', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/settings', { headers: { Accept: 'text/yaml' } }),
			request.get('/api/admin/settings', { headers: { Accept: 'application/x-yaml' } }),
			request.get('/api/admin/settings', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/settings');
		const responses = await Promise.all([
			request.get('/api/admin/settings?section=general&section=homepage'),
			request.get('/api/admin/settings?key=a&key=b')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings keeps a NextRequest-typed handler signature stable under cookie / IP side channels', async ({
		request
	}) => {
		// The route's handler signature is
		// `GET(req: NextRequest)` — explicitly typed
		// against the Next-specific `NextRequest` type.
		// `getCachedApiSession(req)` reads cookies from
		// the request directly. A future regression that
		// adds a fallback session lookup (e.g. via an
		// `X-Forwarded-User` header) would change the
		// unauth branch's contract.
		const responses = await Promise.all([
			request.get('/api/admin/settings', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/settings', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/settings', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/settings', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			}),
			request.get('/api/admin/settings', {
				headers: { 'X-Forwarded-User': 'admin' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/settings response message is exactly "Unauthorized" (NOT "Forbidden", NOT role-context-specific suffix)', async ({
		request
	}) => {
		// The 401 envelope carries the bare
		// `'Unauthorized'` message — distinct from the
		// admin-gated routes' role-context-specific
		// `'Unauthorized. Admin access required.'`
		// message and distinct from the reports route's
		// bare `'Forbidden'` message. A regression that
		// switches to either alternative would surface
		// here as a body-divergence assertion failure.
		const response = await request.get('/api/admin/settings');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Forbidden');
		expect(body.error).not.toBe('Unauthorized. Admin access required.');
	});
});
