import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only map-provider configuration-status endpoint
 * served by `apps/web/app/api/admin/settings/map-status/route.ts`.
 *
 * `GET /api/admin/settings/map-status` is **admin-gated**
 * via a **single-step `getCachedApiSession()` chain** that
 * collapses both unauthenticated and authenticated-non-
 * admin branches into the same 401 envelope:
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
 *         const mapboxConfigured = Boolean(
 *           process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
 *         );
 *         const googleConfigured = Boolean(
 *           process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 *         );
 *         const mapStatus = {
 *           mapbox: { isConfigured: mapboxConfigured, ... },
 *           google: { isConfigured: googleConfigured, ... }
 *         };
 *         return NextResponse.json(
 *           { status: mapStatus },
 *           { status: 200 }
 *         );
 *       } catch (error) {
 *         return NextResponse.json(
 *           { error: 'Failed to fetch map status' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The gate's shape is **distinct** from every other
 * admin-tree route smoke-covered to date:
 *
 *   - **`admin/settings/map-status` (this route)**: uses
 *     `getCachedApiSession(req)` (a request-scoped wrapper
 *     around `auth()`) — the **only** admin-tree route
 *     the smoke layer covers that uses this wrapper
 *     rather than the bare `auth()` call. Distinct from
 *     the sibling `admin/settings` route, which uses
 *     bare `auth()`.
 *   - **`admin/clients/stats`**: bare `auth()` + two-step
 *     gate (`if (!session)` → 401 / `if (!session.user.isAdmin)`
 *     → 403).
 *   - **`admin/roles/stats`**: bare `auth()` + two-step
 *     gate (`if (!session?.user)` → 401 / `if (!session.user.isAdmin)`
 *     → 403).
 *   - **`admin/items/stats`**: bare `auth()` + single-step
 *     gate (`if (!session?.user?.isAdmin)` → 401) — same
 *     gate-collapse posture as this route but different
 *     session-resolver.
 *   - **`admin/users/stats`**: routes through the
 *     three-step `checkAdminAuth()` helper.
 *
 * The `getCachedApiSession(req)` wrapper short-circuits
 * the per-request `auth()` resolver via a per-request
 * cache so the route handler can be re-entered cheaply
 * by the React Query hooks the admin dashboard uses to
 * poll the map-status endpoint. A regression that swaps
 * the wrapper for bare `auth()` would not change the
 * unauth-branch envelope (both return 401 with bare
 * `'Unauthorized'`), but would change the gate's
 * cache-hit cost — out of scope for this spec.
 *
 * The handler signature is the **request-bearing**
 * `GET(req: NextRequest)` form (necessary because
 * `getCachedApiSession` requires the `NextRequest` to
 * key the per-request cache) — distinct from the bare
 * `GET()` signature most admin-stats routes use. There
 * is therefore a `req` reference inside the handler,
 * but the handler does **not** read `req.url`,
 * `req.cookies`, `req.geo`, `req.ip`, `req.nextUrl`, or
 * `req.headers` for any branching purpose. A regression
 * that adds a `searchParams`-driven branch (e.g.
 * `?provider=mapbox` to scope the response to a single
 * provider) would silently widen the contract.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated** (no session, or session with
 *     no `user`, or session with `user.isAdmin=false`):
 *     the single-step gate fires; the route returns 401
 *     with `{ error: 'Unauthorized' }`. This is the
 *     contract every assertion below pins, because the
 *     e2e runner does not carry an authenticated admin
 *     session by default.
 *   - **Authenticated admin user**: the gate passes; the
 *     route returns 200 with
 *     `{ status: { mapbox: { isConfigured, isPreviewAvailable, name }, google: { ... } } }`.
 *     Out of scope.
 *   - **Internal error**: the catch returns 500 with
 *     `{ error: 'Failed to fetch map status' }`. Out of
 *     scope.
 *
 * The 401 envelope deliberately lacks the `success: false`
 * key every other admin-tree route smoke-covered to date
 * emits — the route emits the **bare `{ error }`** form
 * rather than the canonical
 * `{ success: false, error }` envelope. A regression that
 * adopts the canonical envelope would change the
 * client-side error-handling contract for every consumer
 * of the map-status admin dashboard widget.
 */
const ADMIN_SETTINGS_MAP_STATUS_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/settings/map-status',

	// `?provider=` — drill-down keys the response shape
	// (`{ mapbox: …, google: … }`) might tempt a future
	// contributor to scope to a single provider.
	'/api/admin/settings/map-status?provider=mapbox',
	'/api/admin/settings/map-status?provider=google',
	'/api/admin/settings/map-status?provider=invalid',
	'/api/admin/settings/map-status?provider=',
	'/api/admin/settings/map-status?provider=MAPBOX',

	// `?include=` / `?fields=` / `?select=` / `?exclude=`
	// — content-projection keys for the
	// `mapbox` / `google` sub-objects.
	'/api/admin/settings/map-status?include=mapbox',
	'/api/admin/settings/map-status?include=google',
	'/api/admin/settings/map-status?fields=isConfigured',
	'/api/admin/settings/map-status?select=isPreviewAvailable',
	'/api/admin/settings/map-status?exclude=name',

	// `?isAdmin=` — boolean filter that would scope the
	// response (a future contributor might mis-wire this
	// as an admin override).
	'/api/admin/settings/map-status?isAdmin=true',
	'/api/admin/settings/map-status?isAdmin=false',
	'/api/admin/settings/map-status?isAdmin=1',
	'/api/admin/settings/map-status?isAdmin=0',

	// `?userId=` / `?adminId=` / `?as=` —
	// impersonation keys.
	'/api/admin/settings/map-status?userId=anything',
	'/api/admin/settings/map-status?user_id=anything',
	'/api/admin/settings/map-status?adminId=anything',
	'/api/admin/settings/map-status?as=admin',
	'/api/admin/settings/map-status?asUser=true',
	'/api/admin/settings/map-status?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/settings/map-status?token=anything',
	'/api/admin/settings/map-status?secret=anything',
	'/api/admin/settings/map-status?api_key=anything',
	'/api/admin/settings/map-status?authorization=Bearer+anything',
	'/api/admin/settings/map-status?session=anything',
	'/api/admin/settings/map-status?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/settings/map-status?bypass=1',
	'/api/admin/settings/map-status?admin=1',
	'/api/admin/settings/map-status?admin=true',
	'/api/admin/settings/map-status?override=true',
	'/api/admin/settings/map-status?force=true',

	// `?refresh=` / `?cache=` — cache-busting keys
	// (relevant because `getCachedApiSession` is itself
	// a per-request cache wrapper).
	'/api/admin/settings/map-status?refresh=1',
	'/api/admin/settings/map-status?fresh=true',
	'/api/admin/settings/map-status?cache=bypass',
	'/api/admin/settings/map-status?nocache=1',

	// `?locale=` / `?lang=` — i18n keys (the route
	// returns provider names like `'Mapbox'` / `'Google Maps'`
	// which are presentation strings; a future contributor
	// might add per-locale name resolution).
	'/api/admin/settings/map-status?locale=en',
	'/api/admin/settings/map-status?locale=fr',
	'/api/admin/settings/map-status?lang=de',

	// `?key=` / `?reveal=` / `?showKeys=` — keys that
	// would tempt a future contributor to expose the
	// actual `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` /
	// `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` values rather
	// than the boolean status — a regression that would
	// leak the publishable map keys via the admin
	// dashboard's polling traffic.
	'/api/admin/settings/map-status?reveal=true',
	'/api/admin/settings/map-status?showKeys=1',
	'/api/admin/settings/map-status?showSecrets=true',
	'/api/admin/settings/map-status?includeKeys=true',

	// Repeated keys.
	'/api/admin/settings/map-status?as=admin&as=user',
	'/api/admin/settings/map-status?token=foo&token=bar',
	'/api/admin/settings/map-status?bypass=1&bypass=0',
	'/api/admin/settings/map-status?provider=mapbox&provider=google',

	// Bogus / typo'd query keys.
	'/api/admin/settings/map-status?unknown=value',
	'/api/admin/settings/map-status?foo=bar&baz=qux',
	'/api/admin/settings/map-status?userId=admin&token=foo&unknown=value&provider=mapbox&isAdmin=true&include=mapbox&reveal=true&foo=bar'
] as const;

test.describe('API: /api/admin/settings/map-status query-param surface', () => {
	for (const path of ADMIN_SETTINGS_MAP_STATUS_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's single-step gate fires before
			// any `process.env.*` read, so there is no
			// way for any query-param permutation to reach
			// the env-var read or the response builder on
			// the unauth branch. A 500 is reachable only
			// if the catch fires after the gate has let
			// the call through (e.g. `getCachedApiSession`
			// itself throws), which never happens on the
			// unauth branch in the e2e runtime.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/settings/map-status returns 401 with the bare-error envelope on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the single-step gate
		// `if (!session?.user?.isAdmin)` fires, returning
		// 401 with the **bare `{ error: 'Unauthorized' }`
		// envelope** — distinct from the
		// `{ success: false, error: 'Unauthorized' }`
		// envelope every other admin-tree route smoke-
		// covered to date emits, and distinct from the
		// catch's `'Failed to fetch map status'` message
		// (a route-specific catch envelope).
		const response = await request.get('/api/admin/settings/map-status');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			error: 'Unauthorized'
		});
		// A regression that adopts the canonical
		// `{ success, error }` envelope would change the
		// admin-dashboard's error-handling contract.
		expect(body.success).toBeUndefined();
	});

	test('GET /api/admin/settings/map-status has a stable status across query permutations', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/settings/map-status');
		const parameterised = await request.get(
			'/api/admin/settings/map-status?provider=mapbox&include=mapbox&isAdmin=true&userId=admin&token=anything&reveal=true&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/settings/map-status?provider=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The success response shape is
		// `{ status: { mapbox, google } }`. A future
		// contributor who reads
		// `searchParams.get('provider')` to scope the
		// response to a single provider would change the
		// unauth-branch contract.
		const baseline = await request.get('/api/admin/settings/map-status');
		const responses = await Promise.all([
			request.get('/api/admin/settings/map-status?provider=mapbox'),
			request.get('/api/admin/settings/map-status?provider=google'),
			request.get('/api/admin/settings/map-status?provider=invalid'),
			request.get('/api/admin/settings/map-status?provider='),
			request.get('/api/admin/settings/map-status?provider=MAPBOX')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings/map-status?include=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/settings/map-status');
		const responses = await Promise.all([
			request.get('/api/admin/settings/map-status?include=mapbox'),
			request.get('/api/admin/settings/map-status?include=google'),
			request.get('/api/admin/settings/map-status?fields=isConfigured'),
			request.get('/api/admin/settings/map-status?select=isPreviewAvailable'),
			request.get('/api/admin/settings/map-status?exclude=name')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings/map-status?isAdmin=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('isAdmin')` as a fallback
		// for `session.user.isAdmin` would change the
		// unauth branch from "always 401" to "200 if
		// ?isAdmin=true is present" — silently exposing
		// the per-environment map-provider configuration
		// status to any anonymous caller.
		const baseline = await request.get('/api/admin/settings/map-status');
		const responses = await Promise.all([
			request.get('/api/admin/settings/map-status?isAdmin=true'),
			request.get('/api/admin/settings/map-status?isAdmin=false'),
			request.get('/api/admin/settings/map-status?isAdmin=1'),
			request.get('/api/admin/settings/map-status?isAdmin=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings/map-status?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/settings/map-status');
		const responses = await Promise.all([
			request.get('/api/admin/settings/map-status?userId=admin'),
			request.get('/api/admin/settings/map-status?user_id=admin'),
			request.get('/api/admin/settings/map-status?adminId=admin'),
			request.get('/api/admin/settings/map-status?as=admin'),
			request.get('/api/admin/settings/map-status?asUser=true'),
			request.get('/api/admin/settings/map-status?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings/map-status?token=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who adds magic-token-based
		// admin bypass would change the unauth branch
		// from "always 401" to "200 if the right token
		// is present".
		const baseline = await request.get('/api/admin/settings/map-status');
		const responses = await Promise.all([
			request.get('/api/admin/settings/map-status?token=anything'),
			request.get('/api/admin/settings/map-status?secret=anything'),
			request.get('/api/admin/settings/map-status?api_key=anything'),
			request.get('/api/admin/settings/map-status?authorization=Bearer+anything'),
			request.get('/api/admin/settings/map-status?session=anything'),
			request.get('/api/admin/settings/map-status?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings/map-status?bypass=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/settings/map-status');
		const responses = await Promise.all([
			request.get('/api/admin/settings/map-status?bypass=1'),
			request.get('/api/admin/settings/map-status?admin=1'),
			request.get('/api/admin/settings/map-status?admin=true'),
			request.get('/api/admin/settings/map-status?override=true'),
			request.get('/api/admin/settings/map-status?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings/map-status?reveal=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The route deliberately exposes only boolean
		// `isConfigured` flags rather than the actual
		// `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` /
		// `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` values —
		// even though the keys are publishable
		// (`NEXT_PUBLIC_*`) and reachable from any
		// client bundle the web app ships, leaking them
		// through an unauth admin-only endpoint would
		// be a per-environment-config disclosure
		// regression. A future contributor who reads
		// `searchParams.get('reveal')` to flip the
		// response shape from booleans to actual values
		// would change the unauth-branch contract.
		const baseline = await request.get('/api/admin/settings/map-status');
		const responses = await Promise.all([
			request.get('/api/admin/settings/map-status?reveal=true'),
			request.get('/api/admin/settings/map-status?showKeys=1'),
			request.get('/api/admin/settings/map-status?showSecrets=true'),
			request.get('/api/admin/settings/map-status?includeKeys=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings/map-status does NOT branch on Accept header', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/settings/map-status');
		const responses = await Promise.all([
			request.get('/api/admin/settings/map-status', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/admin/settings/map-status', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/settings/map-status', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/settings/map-status', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/settings/map-status does NOT leak per-env map-key values on the unauth branch', async ({
		request
	}) => {
		// The 401 envelope must NOT contain any
		// substring that resembles a Mapbox public
		// access token (`pk.*`) or a Google Maps API
		// key (typically `AIza*`). The unauth branch
		// returns the bare `{ error: 'Unauthorized' }`
		// envelope and never reads
		// `process.env.NEXT_PUBLIC_*`, so a regression
		// that surfaces the env-var read into the
		// unauth response would be caught here.
		const response = await request.get('/api/admin/settings/map-status');
		const text = await response.text();

		expect(text).not.toMatch(/pk\.[A-Za-z0-9_-]{20,}/);
		expect(text).not.toMatch(/AIza[A-Za-z0-9_-]{30,}/);
		expect(text).not.toContain('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN');
		expect(text).not.toContain('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
	});

	test('GET /api/admin/settings/map-status keeps the response status stable across param permutations', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get('/api/admin/settings/map-status'),
			request.get(
				'/api/admin/settings/map-status?provider=mapbox&include=google&isAdmin=true&userId=admin&token=foo&reveal=true'
			),
			request.get(
				'/api/admin/settings/map-status?provider=invalid&include=invalid&isAdmin=invalid&userId=admin&token=foo&reveal=invalid&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/settings/map-status repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/settings/map-status');
		const responses = await Promise.all([
			request.get('/api/admin/settings/map-status?as=admin&as=user'),
			request.get('/api/admin/settings/map-status?token=foo&token=bar'),
			request.get('/api/admin/settings/map-status?bypass=1&bypass=0'),
			request.get('/api/admin/settings/map-status?provider=mapbox&provider=google')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
