import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only Twenty CRM configuration endpoint served by
 * `apps/web/app/api/admin/twenty-crm/config/route.ts`.
 *
 * `GET /api/admin/twenty-crm/config` is **admin-gated**
 * via a **single-step `auth()` chain** that collapses
 * both unauthenticated and authenticated-non-admin
 * branches into the same 401 envelope:
 *
 *     export async function GET() {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.isAdmin) {
 *           return NextResponse.json(
 *             { success: false, error: 'Unauthorized. Admin access required.' },
 *             { status: 401 }
 *           );
 *         }
 *         const config = await configRepository.getConfig();
 *         return NextResponse.json({ success: true, data: config });
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Failed to retrieve configuration' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The route is the **first** admin-tree route the smoke
 * layer covers that documents the distinct
 * **`'Unauthorized. Admin access required.'` error
 * message** — distinct from every other admin-tree
 * route smoke-covered to date:
 *
 *   - **`admin/twenty-crm/config` (this route)**: bare
 *     `auth()` + single-step gate + canonical envelope
 *     **with a route-specific
 *     `'Unauthorized. Admin access required.'`** error
 *     string.
 *   - **`admin/sponsor-ads`**: same purpose-built
 *     `'Unauthorized. Admin access required.'` string
 *     but emits it from a different handler shape.
 *   - **`admin/clients`** / **`admin/comments`** /
 *     **`admin/companies`** / **`admin/users`**: bare
 *     `auth()` + single-step gate + canonical envelope
 *     with the **bare `'Unauthorized'`** error string.
 *   - **`admin/reports`**: bare `auth()` + single-step
 *     gate that emits **`'Forbidden'`** at status 403
 *     rather than `'Unauthorized'` at 401.
 *   - **`admin/settings/map-status`**: uses
 *     `getCachedApiSession(req)` rather than bare
 *     `auth()`, plus the bare `{ error }` envelope (no
 *     `success: false` key).
 *
 * The handler signature is the bare `GET()` (no
 * `request` parameter) — narrowing the request surface
 * to zero. There is no way for a future contributor to
 * silently leak a query-param-driven bypass without
 * also widening the handler signature to take a
 * `NextRequest`.
 *
 * The success branch returns a **masked** Twenty CRM
 * configuration object: the `apiKey` field is masked
 * by the repository to `****<last4>` (only the final 4
 * characters of the API key are exposed). This is the
 * **first** admin-tree route the smoke layer covers
 * that documents a per-config-secret-disclosure
 * contract — even on the unauth branch (which never
 * reads the config) the spec pins that the response
 * body does NOT contain the unmasked API key surface.
 *
 * The route's authorization contract is the load-
 * bearing invariant this spec pins:
 *
 *   - **Unauthenticated** (no session, or session with
 *     no `user`, or session with `user.isAdmin=false`):
 *     the single-step gate fires; the route returns
 *     401 with
 *     `{ success: false, error: 'Unauthorized. Admin access required.' }`.
 *     This is the contract every assertion below pins,
 *     because the e2e runner does not carry an
 *     authenticated admin session by default.
 *   - **Authenticated admin user**: the gate passes; the
 *     route returns 200 with
 *     `{ success: true, data: { id, baseUrl, apiKey: '****<last4>', enabled, syncMode, updatedBy, updatedAt } }`.
 *     Out of scope.
 *   - **Internal error**: the catch returns 500 with
 *     `{ success: false, error: 'Failed to retrieve configuration' }`.
 *     Out of scope.
 *
 * The POST handler at the same route uses a **different
 * gate**: `if (!session?.user?.isAdmin || !session.user.id)`
 * (an extra `!session.user.id` check that the GET gate
 * does not do). Out of scope for this GET query smoke.
 */
const ADMIN_TWENTY_CRM_CONFIG_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/twenty-crm/config',

	// `?include=` / `?fields=` / `?select=` /
	// `?exclude=` — content-projection keys for the
	// config sub-fields (`baseUrl`, `apiKey`, `enabled`,
	// `syncMode`, `updatedBy`, `updatedAt`).
	'/api/admin/twenty-crm/config?include=apiKey',
	'/api/admin/twenty-crm/config?include=baseUrl',
	'/api/admin/twenty-crm/config?include=syncMode',
	'/api/admin/twenty-crm/config?fields=apiKey',
	'/api/admin/twenty-crm/config?select=enabled',
	'/api/admin/twenty-crm/config?exclude=apiKey',

	// `?syncMode=` — enum filter (`disabled`,
	// `platform`, `direct_crm`).
	'/api/admin/twenty-crm/config?syncMode=disabled',
	'/api/admin/twenty-crm/config?syncMode=platform',
	'/api/admin/twenty-crm/config?syncMode=direct_crm',
	'/api/admin/twenty-crm/config?syncMode=invalid',
	'/api/admin/twenty-crm/config?syncMode=',

	// `?reveal=` / `?unmask=` / `?showApiKey=` —
	// disclosure keys that would tempt a future
	// contributor to expose the unmasked Twenty CRM
	// API key. The handler today returns the masked
	// `****<last4>` form unconditionally; a regression
	// that adds a query-driven unmask flag would be a
	// per-tenant credential-disclosure regression.
	'/api/admin/twenty-crm/config?reveal=true',
	'/api/admin/twenty-crm/config?unmask=true',
	'/api/admin/twenty-crm/config?showApiKey=1',
	'/api/admin/twenty-crm/config?showSecrets=true',
	'/api/admin/twenty-crm/config?includeSecrets=true',

	// `?isAdmin=` — boolean filter that would scope the
	// response (a future contributor might mis-wire
	// this as an admin override).
	'/api/admin/twenty-crm/config?isAdmin=true',
	'/api/admin/twenty-crm/config?isAdmin=false',
	'/api/admin/twenty-crm/config?isAdmin=1',
	'/api/admin/twenty-crm/config?isAdmin=0',

	// `?userId=` / `?adminId=` / `?as=` —
	// impersonation keys.
	'/api/admin/twenty-crm/config?userId=anything',
	'/api/admin/twenty-crm/config?user_id=anything',
	'/api/admin/twenty-crm/config?adminId=anything',
	'/api/admin/twenty-crm/config?as=admin',
	'/api/admin/twenty-crm/config?asUser=true',
	'/api/admin/twenty-crm/config?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/twenty-crm/config?token=anything',
	'/api/admin/twenty-crm/config?secret=anything',
	'/api/admin/twenty-crm/config?api_key=anything',
	'/api/admin/twenty-crm/config?authorization=Bearer+anything',
	'/api/admin/twenty-crm/config?session=anything',
	'/api/admin/twenty-crm/config?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/twenty-crm/config?bypass=1',
	'/api/admin/twenty-crm/config?admin=1',
	'/api/admin/twenty-crm/config?admin=true',
	'/api/admin/twenty-crm/config?override=true',
	'/api/admin/twenty-crm/config?force=true',

	// `?refresh=` / `?cache=` — cache-busting keys.
	'/api/admin/twenty-crm/config?refresh=1',
	'/api/admin/twenty-crm/config?fresh=true',
	'/api/admin/twenty-crm/config?cache=bypass',
	'/api/admin/twenty-crm/config?nocache=1',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/twenty-crm/config?locale=en',
	'/api/admin/twenty-crm/config?locale=fr',
	'/api/admin/twenty-crm/config?lang=de',

	// Repeated keys.
	'/api/admin/twenty-crm/config?as=admin&as=user',
	'/api/admin/twenty-crm/config?token=foo&token=bar',
	'/api/admin/twenty-crm/config?bypass=1&bypass=0',
	'/api/admin/twenty-crm/config?reveal=true&reveal=false',

	// Bogus / typo'd query keys.
	'/api/admin/twenty-crm/config?unknown=value',
	'/api/admin/twenty-crm/config?foo=bar&baz=qux',
	'/api/admin/twenty-crm/config?userId=admin&token=foo&unknown=value&isAdmin=true&reveal=true&syncMode=platform&include=apiKey&foo=bar'
] as const;

test.describe('API: /api/admin/twenty-crm/config query-param surface', () => {
	for (const path of ADMIN_TWENTY_CRM_CONFIG_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's single-step gate fires before
			// any `configRepository.getConfig()` call,
			// and the handler signature is the bare
			// `GET()` (no `request` parameter), so there
			// is no `searchParams` surface inside the
			// handler at all. The unauthenticated GET
			// surface returns a 4xx (specifically 401)
			// deterministically. A 500 is reachable only
			// if the catch fires after the gate has let
			// the call through, which never happens on
			// the unauth branch.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/twenty-crm/config returns 401 with the route-specific Unauthorized envelope', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the single-step gate
		// `if (!session?.user?.isAdmin)` fires,
		// returning 401 with the **route-specific
		// `'Unauthorized. Admin access required.'`**
		// message — distinct from the bare
		// `'Unauthorized'` message every other
		// admin-tree route smoke-covered to date emits
		// (except `admin/sponsor-ads`, which uses the
		// same purpose-built string), and distinct from
		// the `'Forbidden'` message the
		// `admin/reports` and `admin/clients/stats`
		// routes' second-step gates emit.
		const response = await request.get('/api/admin/twenty-crm/config');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized. Admin access required.'
		});
	});

	test('GET /api/admin/twenty-crm/config has a stable status across query permutations', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/twenty-crm/config');
		const parameterised = await request.get(
			'/api/admin/twenty-crm/config?syncMode=platform&include=apiKey&isAdmin=true&userId=admin&token=anything&reveal=true&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/twenty-crm/config?syncMode=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The success response includes the `syncMode`
		// enum value (`disabled` / `platform` /
		// `direct_crm`). A future contributor who
		// reads `searchParams.get('syncMode')` to scope
		// the response to a specific mode would change
		// the unauth-branch contract.
		const baseline = await request.get('/api/admin/twenty-crm/config');
		const responses = await Promise.all([
			request.get('/api/admin/twenty-crm/config?syncMode=disabled'),
			request.get('/api/admin/twenty-crm/config?syncMode=platform'),
			request.get('/api/admin/twenty-crm/config?syncMode=direct_crm'),
			request.get('/api/admin/twenty-crm/config?syncMode=invalid'),
			request.get('/api/admin/twenty-crm/config?syncMode=')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/twenty-crm/config?reveal=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The success response masks the `apiKey` field
		// to `****<last4>`. A future contributor who
		// reads `searchParams.get('reveal')` to flip
		// the response shape from masked to unmasked
		// would change the unauth-branch contract AND
		// introduce a per-tenant credential-disclosure
		// regression.
		const baseline = await request.get('/api/admin/twenty-crm/config');
		const responses = await Promise.all([
			request.get('/api/admin/twenty-crm/config?reveal=true'),
			request.get('/api/admin/twenty-crm/config?unmask=true'),
			request.get('/api/admin/twenty-crm/config?showApiKey=1'),
			request.get('/api/admin/twenty-crm/config?showSecrets=true'),
			request.get('/api/admin/twenty-crm/config?includeSecrets=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/twenty-crm/config?isAdmin=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/twenty-crm/config');
		const responses = await Promise.all([
			request.get('/api/admin/twenty-crm/config?isAdmin=true'),
			request.get('/api/admin/twenty-crm/config?isAdmin=false'),
			request.get('/api/admin/twenty-crm/config?isAdmin=1'),
			request.get('/api/admin/twenty-crm/config?isAdmin=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/twenty-crm/config?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/twenty-crm/config');
		const responses = await Promise.all([
			request.get('/api/admin/twenty-crm/config?userId=admin'),
			request.get('/api/admin/twenty-crm/config?user_id=admin'),
			request.get('/api/admin/twenty-crm/config?adminId=admin'),
			request.get('/api/admin/twenty-crm/config?as=admin'),
			request.get('/api/admin/twenty-crm/config?asUser=true'),
			request.get('/api/admin/twenty-crm/config?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/twenty-crm/config?token=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/twenty-crm/config');
		const responses = await Promise.all([
			request.get('/api/admin/twenty-crm/config?token=anything'),
			request.get('/api/admin/twenty-crm/config?secret=anything'),
			request.get('/api/admin/twenty-crm/config?api_key=anything'),
			request.get('/api/admin/twenty-crm/config?authorization=Bearer+anything'),
			request.get('/api/admin/twenty-crm/config?session=anything'),
			request.get('/api/admin/twenty-crm/config?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/twenty-crm/config?bypass=… does NOT bypass the admin gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/twenty-crm/config');
		const responses = await Promise.all([
			request.get('/api/admin/twenty-crm/config?bypass=1'),
			request.get('/api/admin/twenty-crm/config?admin=1'),
			request.get('/api/admin/twenty-crm/config?admin=true'),
			request.get('/api/admin/twenty-crm/config?override=true'),
			request.get('/api/admin/twenty-crm/config?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/twenty-crm/config does NOT branch on Accept header', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/twenty-crm/config');
		const responses = await Promise.all([
			request.get('/api/admin/twenty-crm/config', { headers: { Accept: 'application/json' } }),
			request.get('/api/admin/twenty-crm/config', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/twenty-crm/config', { headers: { Accept: 'application/xml' } }),
			request.get('/api/admin/twenty-crm/config', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/twenty-crm/config does NOT leak Twenty CRM credential surface on the unauth branch', async ({
		request
	}) => {
		// The 401 envelope must NOT contain any
		// substring that resembles the
		// `TWENTY_CRM_API_KEY`, `TWENTY_CRM_BASE_URL`,
		// or any actual Twenty CRM credential. The
		// unauth branch returns the canonical
		// `{ success: false, error }` envelope and
		// never reads the config repository, so a
		// regression that surfaces the env-var or DB
		// values into the unauth response would be
		// caught here.
		const response = await request.get('/api/admin/twenty-crm/config');
		const text = await response.text();

		expect(text).not.toContain('TWENTY_CRM_API_KEY');
		expect(text).not.toContain('TWENTY_CRM_BASE_URL');
		expect(text).not.toContain('apiKey');
		expect(text).not.toContain('baseUrl');
		expect(text).not.toContain('syncMode');
		// A regression that reveals the config object
		// shape on the unauth branch would change this
		// assertion.
		expect(text).not.toMatch(/\*{4}[A-Za-z0-9]{4}/);
	});

	test('GET /api/admin/twenty-crm/config keeps the response status stable across param permutations', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get('/api/admin/twenty-crm/config'),
			request.get(
				'/api/admin/twenty-crm/config?syncMode=platform&include=apiKey&isAdmin=true&userId=admin&token=foo&reveal=true'
			),
			request.get(
				'/api/admin/twenty-crm/config?syncMode=invalid&include=invalid&isAdmin=invalid&userId=admin&token=foo&reveal=invalid&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/twenty-crm/config repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		const baseline = await request.get('/api/admin/twenty-crm/config');
		const responses = await Promise.all([
			request.get('/api/admin/twenty-crm/config?as=admin&as=user'),
			request.get('/api/admin/twenty-crm/config?token=foo&token=bar'),
			request.get('/api/admin/twenty-crm/config?bypass=1&bypass=0'),
			request.get('/api/admin/twenty-crm/config?reveal=true&reveal=false')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/twenty-crm/config error message does NOT echo any other admin-tree route signature', async ({
		request
	}) => {
		// The 401 envelope carries the route-specific
		// `'Unauthorized. Admin access required.'`
		// message — distinct from `'Unauthorized'`
		// (the bare admin-tree string), `'Forbidden'`
		// (the second-step gate's 403 string),
		// `'Failed to retrieve configuration'` (the
		// catch-block's route-specific message),
		// `'User ID not found'` (the
		// `checkAdminAuth()`-routed siblings' second-
		// step message), and
		// `'Insufficient permissions'` (the
		// `checkAdminAuth()`-routed siblings' third-
		// step message).
		const response = await request.get('/api/admin/twenty-crm/config');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized. Admin access required.');
		expect(body.error).not.toBe('Unauthorized');
		expect(body.error).not.toBe('Forbidden');
		expect(body.error).not.toBe('Failed to retrieve configuration');
		expect(body.error).not.toBe('User ID not found');
		expect(body.error).not.toBe('Insufficient permissions');
	});
});
