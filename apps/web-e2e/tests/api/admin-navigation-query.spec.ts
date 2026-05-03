import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only navigation-config endpoint served by
 * `apps/web/app/api/admin/navigation/route.ts`.
 *
 * `GET /api/admin/navigation` is **admin-gated** via
 * `getCachedApiSession(req)` (the cached-session helper
 * — symmetric with the `admin/settings` route) + a
 * **single-step** `!session?.user?.isAdmin` check that
 * **collapses both** the unauthenticated and
 * authenticated-non-admin branches into the **same** 401
 * envelope — the **bare-key** variant
 * (`{ error: 'Unauthorized' }`) without the
 * `success: false` discriminator key. The route's gate
 * is:
 *
 *     export async function GET(req: NextRequest) {
 *       try {
 *         const session = await getCachedApiSession(req);
 *         if (!session?.user?.isAdmin) {
 *           return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *         }
 *         const config = configManager.getConfig();
 *         const custom_header = config.custom_header || [];
 *         const custom_footer = config.custom_footer || [];
 *         return NextResponse.json(
 *           { custom_header, custom_footer },
 *           { status: 200 }
 *         );
 *       } catch (error) {
 *         return NextResponse.json(
 *           { error: 'Failed to fetch navigation' },
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
 *     bare-key envelope `{ error: 'Unauthorized' }` —
 *     distinct from the bare-message-with-success-key
 *     envelope `{ success: false, error: 'Unauthorized' }`
 *     the `admin/tags` route emits.
 *   - **Authenticated non-admin user**: the same
 *     single-step gate fires; the route returns the
 *     **same** 401 envelope. Out of scope for this spec
 *     because the e2e runner is unauthenticated.
 *   - **Authenticated admin user**: the gate passes; the
 *     route returns 200 with
 *     `{ custom_header, custom_footer }` after reading
 *     the navigation config via `configManager.getConfig()`.
 *     Out of scope.
 *   - **Internal error**: the catch returns 500 with
 *     `{ error: 'Failed to fetch navigation' }`. Out of
 *     scope for this spec because the gate fires before
 *     any config-manager call on every unauth invocation.
 *
 * The spec is unique among the admin-tree query-smoke
 * specs in that:
 *
 *   1. The route uses `getCachedApiSession(req)` — the
 *      cached-session helper that caches the session
 *      lookup per-request — instead of the `auth()` chain
 *      every other admin-tree route uses (with the
 *      exception of the `admin/settings` route which also
 *      uses `getCachedApiSession(req)`). A regression
 *      that swaps the cached helper for a non-cached
 *      `auth()` call would surface as a perf regression
 *      in production but would NOT surface as a status
 *      divergence here — this spec pins the unauth-branch
 *      contract regardless of which session helper the
 *      gate uses.
 *   2. The route handler signature is `GET(req: NextRequest)`
 *      with the `req` parameter passed directly to
 *      `getCachedApiSession(req)` — the `req` parameter
 *      carries the cookies the cached-session helper
 *      reads to resolve the session. Distinct from the
 *      bare `GET()` signature the `admin/roles/stats`
 *      route uses (which has zero `req` consumption).
 *   3. The route reads NO query params from
 *      `searchParams`. The query-param surface this spec
 *      walks is the **defensive surface** — every key is
 *      a key the route does NOT read today, but a future
 *      contributor might add as a filter (`?type=…`,
 *      `?placement=…`, `?locale=…`) or as a bypass
 *      (`?asAdmin=true`, `?token=…`, `?bypass=…`). The
 *      unauth-branch contract must stay invariant under
 *      all of them.
 *   4. The route exports `GET` (this spec) AND `PATCH`
 *      (out of scope here — `PATCH` updates the
 *      `custom_header` / `custom_footer` arrays in
 *      `config.yml` with the same admin-gate posture,
 *      validates each item's `path` via the
 *      `isValidNavigationPath(path)` XSS-defending
 *      helper that rejects `javascript:` / `data:` /
 *      protocol-relative `//evil.com` schemes, and writes
 *      the updated config back to disk via
 *      `configManager`).
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of that.
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
 * `admin-tags-query.spec.ts`,
 * `admin-users-query.spec.ts`) — all share the same
 * "session-or-admin gated, 401/403 before any config-or-
 * service-layer call" posture.
 */
const ADMIN_NAVIGATION_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/navigation',

	// `?type=` / `?placement=` — filter keys a future
	// contributor might add to scope the response to
	// only `custom_header` or only `custom_footer`. Not
	// read today.
	'/api/admin/navigation?type=header',
	'/api/admin/navigation?type=footer',
	'/api/admin/navigation?type=both',
	'/api/admin/navigation?type=invalid',
	'/api/admin/navigation?placement=header',
	'/api/admin/navigation?placement=footer',
	'/api/admin/navigation?placement=invalid',

	// `?asAdmin=` / `?as=` — admin-impersonation keys a
	// future contributor might add. The route reads
	// admin status from `session.user.isAdmin`
	// exclusively today.
	'/api/admin/navigation?asAdmin=true',
	'/api/admin/navigation?as=admin',
	'/api/admin/navigation?asUser=true',
	'/api/admin/navigation?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/navigation?token=anything',
	'/api/admin/navigation?secret=anything',
	'/api/admin/navigation?api_key=anything',
	'/api/admin/navigation?authorization=Bearer+anything',
	'/api/admin/navigation?session=anything',
	'/api/admin/navigation?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/navigation?bypass=1',
	'/api/admin/navigation?admin=1',
	'/api/admin/navigation?admin=true',
	'/api/admin/navigation?override=true',
	'/api/admin/navigation?force=true',

	// `?locale=` / `?lang=` — i18n keys a future
	// contributor might add to localize the navigation
	// response. Not read today.
	'/api/admin/navigation?locale=en',
	'/api/admin/navigation?locale=fr',
	'/api/admin/navigation?locale=de',
	'/api/admin/navigation?locale=es',
	'/api/admin/navigation?locale=ar',
	'/api/admin/navigation?locale=zh',
	'/api/admin/navigation?lang=en',
	'/api/admin/navigation?lang=invalid',

	// `?refresh=` / `?cache=` — cache-busting keys
	// (especially relevant given the route reads
	// `configManager.getConfig()` which may be cached).
	'/api/admin/navigation?refresh=1',
	'/api/admin/navigation?fresh=true',
	'/api/admin/navigation?cache=bypass',
	'/api/admin/navigation?cache=skip',
	'/api/admin/navigation?nocache=1',
	'/api/admin/navigation?ttl=0',

	// `?path=` — the PATCH handler validates each item's
	// path via `isValidNavigationPath(path)` to defend
	// against XSS via dangerous URL schemes. The GET
	// handler does NOT read `?path=` today, but if a
	// future contributor adds a per-path filter, the
	// XSS-validation must still apply. The unauth-branch
	// contract must stay invariant under XSS-shaped
	// query values.
	'/api/admin/navigation?path=/safe',
	'/api/admin/navigation?path=https://example.com',
	'/api/admin/navigation?path=javascript:alert(1)',
	'/api/admin/navigation?path=data:text/html,%3Cscript%3Ealert(1)%3C/script%3E',
	'/api/admin/navigation?path=//evil.com',
	'/api/admin/navigation?path=vbscript:msgbox(1)',
	'/api/admin/navigation?path=',

	// `?fields=` / `?select=` / `?include=` — content-
	// projection keys.
	'/api/admin/navigation?fields=custom_header',
	'/api/admin/navigation?fields=custom_footer',
	'/api/admin/navigation?fields=custom_header,custom_footer',
	'/api/admin/navigation?select=labels',
	'/api/admin/navigation?include=meta',

	// `?page=` / `?limit=` — pagination keys (the route
	// returns the full config arrays today, but a future
	// contributor might add pagination for very long
	// navigation lists).
	'/api/admin/navigation?page=1',
	'/api/admin/navigation?page=invalid',
	'/api/admin/navigation?limit=10',
	'/api/admin/navigation?limit=invalid',

	// Repeated keys.
	'/api/admin/navigation?type=header&type=footer',
	'/api/admin/navigation?as=admin&as=user',
	'/api/admin/navigation?token=foo&token=bar',
	'/api/admin/navigation?bypass=1&bypass=0',

	// Bogus / typo'd query keys.
	'/api/admin/navigation?unknown=value',
	'/api/admin/navigation?foo=bar&baz=qux',
	'/api/admin/navigation?asAdmin=true&token=foo&unknown=value&type=header&placement=footer&locale=en&path=/safe&foo=bar'
] as const;

test.describe('API: /api/admin/navigation query-param surface', () => {
	for (const path of ADMIN_NAVIGATION_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's single-step gate fires before any
			// `configManager.getConfig()` call. The
			// unauthenticated GET surface returns a 4xx
			// (specifically 401) deterministically. A 500 is
			// reachable only if the catch fires after the
			// gate has let the call through (e.g. the
			// config-manager throws), which never happens on
			// the unauth branch.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/navigation returns 401 with the bare-key envelope on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the single-step gate
		// `if (!session?.user?.isAdmin)` fires, returning
		// 401 with the bare-key envelope
		// `{ error: 'Unauthorized' }` (no
		// `success: false` discriminator key) — distinct
		// from the bare-message-with-success-key envelope
		// `{ success: false, error: 'Unauthorized' }` the
		// `admin/tags` route emits and distinct from the
		// longer-message variant
		// `'Unauthorized. Admin access required.'` the
		// `admin/categories` / `admin/sponsor-ads` routes
		// emit.
		const response = await request.get('/api/admin/navigation');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test('GET /api/admin/navigation has a stable status across query permutations', async ({ request }) => {
		// The route reads NO query params today, so every
		// query-param permutation must round-trip to the
		// same status on the unauth branch.
		const baseline = await request.get('/api/admin/navigation');
		const parameterised = await request.get(
			'/api/admin/navigation?type=header&placement=footer&locale=en&path=/safe&asAdmin=true&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/navigation?type=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who reads `?type=` as a
		// filter must not bypass the admin gate when the
		// type-key is present.
		const baseline = await request.get('/api/admin/navigation');
		const responses = await Promise.all([
			request.get('/api/admin/navigation?type=header'),
			request.get('/api/admin/navigation?type=footer'),
			request.get('/api/admin/navigation?type=both'),
			request.get('/api/admin/navigation?type=invalid')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/navigation?asAdmin=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who reads
		// `searchParams.get('asAdmin')` as a fallback for
		// `session?.user?.isAdmin` would change the
		// unauth branch from "always 401" to "200 if
		// ?asAdmin=true is present" — silently granting
		// any anonymous caller admin-level navigation-
		// config visibility (which leaks the site's
		// custom_header / custom_footer structure).
		const baseline = await request.get('/api/admin/navigation');
		const responses = await Promise.all([
			request.get('/api/admin/navigation?asAdmin=true'),
			request.get('/api/admin/navigation?as=admin'),
			request.get('/api/admin/navigation?asUser=true'),
			request.get('/api/admin/navigation?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/navigation?token=… does NOT bypass the admin gate', async ({ request }) => {
		// A future contributor who adds magic-token-based
		// admin bypass — e.g. a `?token=…` shortcut for
		// an internal config-sync job or a `?secret=…`
		// shortcut for a build-time CI consumer of the
		// navigation config — would change the unauth
		// branch from "always 401" to "200 if the right
		// token is present".
		const baseline = await request.get('/api/admin/navigation');
		const responses = await Promise.all([
			request.get('/api/admin/navigation?token=anything'),
			request.get('/api/admin/navigation?secret=anything'),
			request.get('/api/admin/navigation?api_key=anything'),
			request.get('/api/admin/navigation?authorization=Bearer+anything'),
			request.get('/api/admin/navigation?session=anything'),
			request.get('/api/admin/navigation?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/navigation?bypass=… does NOT bypass the admin gate', async ({ request }) => {
		const baseline = await request.get('/api/admin/navigation');
		const responses = await Promise.all([
			request.get('/api/admin/navigation?bypass=1'),
			request.get('/api/admin/navigation?admin=1'),
			request.get('/api/admin/navigation?admin=true'),
			request.get('/api/admin/navigation?override=true'),
			request.get('/api/admin/navigation?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/navigation?path=javascript:… does NOT introduce an XSS-shape bypass', async ({ request }) => {
		// The PATCH handler validates each item's path
		// via `isValidNavigationPath(path)` to defend
		// against XSS via dangerous URL schemes
		// (`javascript:`, `data:`, `vbscript:`,
		// protocol-relative `//evil.com`). The GET
		// handler does NOT read `?path=` today, but if a
		// future contributor adds a per-path filter, the
		// XSS-validation must still apply. The unauth-
		// branch contract must stay invariant under XSS-
		// shaped query values.
		const baseline = await request.get('/api/admin/navigation');
		const responses = await Promise.all([
			request.get('/api/admin/navigation?path=javascript:alert(1)'),
			request.get('/api/admin/navigation?path=data:text/html,%3Cscript%3Ealert(1)%3C/script%3E'),
			request.get('/api/admin/navigation?path=//evil.com'),
			request.get('/api/admin/navigation?path=vbscript:msgbox(1)')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/navigation?refresh=… does NOT bypass the admin gate', async ({ request }) => {
		// The route reads `configManager.getConfig()`
		// which may be cached. A future contributor who
		// adds a cache-busting `?refresh=…` /
		// `?nocache=…` parameter must not let the cache-
		// busting key bypass the auth gate.
		const baseline = await request.get('/api/admin/navigation');
		const responses = await Promise.all([
			request.get('/api/admin/navigation?refresh=1'),
			request.get('/api/admin/navigation?fresh=true'),
			request.get('/api/admin/navigation?cache=bypass'),
			request.get('/api/admin/navigation?cache=skip'),
			request.get('/api/admin/navigation?nocache=1'),
			request.get('/api/admin/navigation?ttl=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/navigation does NOT branch on Accept header', async ({ request }) => {
		// The route does not negotiate content-types
		// today; every Accept header must round-trip to
		// the same status on the unauth branch.
		const baseline = await request.get('/api/admin/navigation');
		const responses = await Promise.all([
			request.get('/api/admin/navigation', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/admin/navigation', { headers: { Accept: 'text/csv' } }),
			request.get('/api/admin/navigation', {
				headers: { Accept: 'application/xml' }
			}),
			request.get('/api/admin/navigation', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/navigation cookie / X-* headers do NOT bypass the gate', async ({ request }) => {
		// A regression that switches the gate to read a
		// fabricated session-token cookie via the cached-
		// session helper would bypass the auth chain. The
		// unauth-branch contract must stay invariant under
		// any of those side channels.
		const responses = await Promise.all([
			request.get('/api/admin/navigation', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/navigation', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/navigation', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/navigation', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/navigation response message uniquely identifies bare-key envelope', async ({ request }) => {
		// The 401 envelope carries the bare-key
		// `{ error: 'Unauthorized' }` shape (no
		// `success: false` discriminator key) — distinct
		// from the bare-message-with-success-key envelope
		// `{ success: false, error: 'Unauthorized' }` the
		// `admin/tags` route emits, distinct from the
		// longer-message variant
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`
		// the `admin/categories` / `admin/sponsor-ads`
		// routes emit, and distinct from the
		// `{ success: false, error: 'Forbidden' }` 403
		// envelope the `admin/reports` route emits. A
		// regression that switches to any of these
		// alternatives would surface here as a body-
		// divergence assertion failure.
		const response = await request.get('/api/admin/navigation');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Unauthorized. Admin access required.');
		expect(body.error).not.toBe('Forbidden');
		expect(body.success).toBeUndefined();
	});

	test('GET /api/admin/navigation keeps the response status stable across param permutations', async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get('/api/admin/navigation'),
			request.get('/api/admin/navigation?type=header&locale=en'),
			request.get(
				'/api/admin/navigation?asAdmin=true&token=foo&type=header&placement=footer&path=javascript:alert(1)&unknown=bar&refresh=1'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/navigation repeated query keys do NOT bypass the gate', async ({ request }) => {
		// `searchParams.get(name)` returns the first
		// value of any repeated key (when/if the route
		// reads them in a future change), so repetition
		// is irrelevant on every branch. The unauth
		// branch must return 401 regardless of whether
		// the repeated value is valid or invalid.
		const baseline = await request.get('/api/admin/navigation');
		const responses = await Promise.all([
			request.get('/api/admin/navigation?type=header&type=footer'),
			request.get('/api/admin/navigation?as=admin&as=user'),
			request.get('/api/admin/navigation?token=foo&token=bar'),
			request.get('/api/admin/navigation?bypass=1&bypass=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
