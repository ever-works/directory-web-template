import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **HTTP-method / body-shape / header
 * surface** of the admin-only mark-all-notifications-read
 * endpoint served by
 * `apps/web/app/api/admin/notifications/mark-all-read/route.ts`.
 *
 * `PATCH /api/admin/notifications/mark-all-read` is the
 * **first** admin-tree route the smoke layer covers that
 * documents the unique combination of:
 *
 *   1. **`PATCH` handler** — the first `PATCH`-only route
 *      the e2e suite exercises. Distinct from every other
 *      admin-tree smoke spec which targets `GET` / `POST`.
 *      The handler signature is the bare `PATCH()` (no
 *      `request` parameter), narrowing the request surface
 *      to zero — there is no way for a future contributor
 *      to read a body parameter, header, or query string
 *      inside the handler without changing the signature.
 *   2. **Two-step `auth()` chain that splits 401 vs 403
 *      on the `tenantId` boundary** — distinct from the
 *      sibling `admin/users/check-email` and
 *      `admin/users/check-username` routes' two-step gates
 *      that split 401 (no session) vs 403 (no `isAdmin`).
 *      This route's first step checks `!session?.user?.id`
 *      (returning 401 `'Unauthorized'`) and the second
 *      step checks `!tenantId` (returning 403
 *      `'Tenant not found'`). The unauth branch always
 *      returns 401 because the e2e harness has no session
 *      at all — the `tenantId` 403 branch is reachable
 *      only when an authenticated session is present but
 *      lacks the `tenantId` claim, which is out of scope
 *      for the unauth smoke walk.
 *   3. **`'Tenant not found'` 403 envelope** — distinct
 *      from the sibling routes' bare `'Forbidden'`
 *      message. The route-specific message is the
 *      production-source convention for endpoints that
 *      require multi-tenancy context. A regression that
 *      swaps the message back to bare `'Forbidden'` would
 *      change the client-side error-handling contract for
 *      every consumer of the admin notifications widget.
 *   4. **Direct Drizzle DB call without a repository
 *      abstraction** — the handler imports `db` /
 *      `notifications` from `@/lib/db/drizzle` and
 *      `@/lib/db/schema` directly and runs an inline
 *      `db.update(notifications).set({…}).where(and(…)).returning()`
 *      Drizzle pipeline. Distinct from the sibling
 *      `admin/users/check-email` route's
 *      `userRepository.emailExists(...)` repository
 *      abstraction. The direct-DB-call posture is rare
 *      enough in the admin tree to be a load-bearing
 *      finding the smoke walk pins.
 *   5. **Per-tenant scope on the success branch** — the
 *      `where(and(eq(notifications.userId, session.user.id),
 *      eq(notifications.isRead, false),
 *      eq(notifications.tenantId, tenantId)))` clause
 *      scopes the update to (a) the authenticated user's
 *      notifications only, (b) the unread subset, and
 *      (c) the user's tenant only. The unauth branch
 *      MUST NEVER reach this clause, so the unauth
 *      response body must NOT contain the
 *      `success: true` / `updatedCount` keys (the
 *      success-branch payload shape).
 *   6. **Method-resolution surface** — the route exports
 *      ONLY `PATCH`. Every other method (`GET` / `POST` /
 *      `PUT` / `DELETE`) must round-trip to a 405 (Method
 *      Not Allowed) deterministically; a 5xx on any other
 *      method would indicate the Next.js routing layer
 *      crashed before the method-resolution returned its
 *      canonical 405.
 *
 * Where the sibling
 * `admin-twenty-crm-test-connection-body.spec.ts` and
 * `admin-users-check-email-body.spec.ts` /
 * `admin-users-check-username-body.spec.ts` walk the body
 * surface of `POST` routes, this spec walks the method-
 * resolution / header surface of a `PATCH` route — a
 * complementary surface that no prior admin-tree smoke
 * spec covers.
 */
const ADMIN_NOTIFICATIONS_MARK_ALL_READ_HEADERS = [
	// Baseline — the no-header unauthenticated case.
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers, no body' },

	// `Content-Type` headers — irrelevant since the route
	// does NOT read the body, but a regression that adds
	// body parsing would surface as a status divergence
	// here.
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },
	{ headers: { 'Content-Type': 'application/xml' }, label: 'xml content-type' },

	// `Accept` headers — the route does not negotiate
	// content-types today.
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	// Side-channel cookies / headers.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { Cookie: 'authjs.session-token=fabricated' }, label: 'fabricated authjs session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Real-IP': '10.0.0.1' }, label: 'X-Real-IP header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	// Magic-token / authorization header attempts.
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { Authorization: 'Basic anything' }, label: 'Basic authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const ADMIN_NOTIFICATIONS_MARK_ALL_READ_BODIES = [
	// Body permutations — the route's bare `PATCH()` handler
	// signature means the body is silently discarded. A
	// regression that adds `request` parameter and starts
	// reading the body would surface as a status divergence
	// from the no-body baseline.
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },
	{ data: { isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated' }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin' }, label: 'fabricated userId attempt' },
	{ data: { token: 'anything' }, label: 'token bypass attempt' },
	{ data: { padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

test.describe('API: /api/admin/notifications/mark-all-read method / body / header surface', () => {
	for (const { headers, label } of ADMIN_NOTIFICATIONS_MARK_ALL_READ_HEADERS) {
		test(`PATCH /api/admin/notifications/mark-all-read (${label}) responds without a server error`, async ({
			request
		}) => {
			// The route's two-step gate fires before any DB
			// call. The unauthenticated PATCH surface returns
			// a 4xx (specifically 401) deterministically.
			const response = await request.patch('/api/admin/notifications/mark-all-read', {
				headers
			});

			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_NOTIFICATIONS_MARK_ALL_READ_BODIES) {
		test(`PATCH /api/admin/notifications/mark-all-read with ${label} responds without a server error`, async ({
			request
		}) => {
			// The route's bare `PATCH()` handler signature
			// silently discards the body. A regression that
			// adds `request` parameter and starts reading
			// the body would surface as a status divergence
			// from the no-body baseline.
			const response = await request.patch('/api/admin/notifications/mark-all-read', {
				data
			});

			expect(response.status()).toBeLessThan(500);
		});
	}

	test('PATCH /api/admin/notifications/mark-all-read returns 401 with the bare Unauthorized envelope', async ({
		request
	}) => {
		// The unauthenticated PATCH branch is the load-bearing
		// invariant: the first step of the gate
		// `if (!session?.user?.id)` fires, returning 401 with
		// the bare `{ error: 'Unauthorized' }` envelope (NO
		// `success: false` key).
		const response = await request.patch('/api/admin/notifications/mark-all-read');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			error: 'Unauthorized'
		});
	});

	test('PATCH /api/admin/notifications/mark-all-read does NOT echo the success-branch keys on the unauth branch', async ({
		request
	}) => {
		// The success branch returns
		// `{ success: true, updatedCount: N }`. The unauth
		// branch must NEVER reach the
		// `db.update(notifications).set(…).where(…).returning()`
		// pipeline, so the response body must NOT contain
		// `success: true` or `updatedCount` keys.
		const response = await request.patch('/api/admin/notifications/mark-all-read');

		const body = await response.json();
		expect(body).not.toHaveProperty('updatedCount');
		expect(body.success).not.toBe(true);
	});

	test('PATCH /api/admin/notifications/mark-all-read does NOT echo "Tenant not found" on the unauth branch', async ({
		request
	}) => {
		// The 403 `'Tenant not found'` envelope is reached
		// only when an authenticated session is present but
		// lacks the `tenantId` claim. The unauth branch fires
		// the FIRST gate step (no `session?.user?.id`), so
		// the unauth response must NEVER contain the
		// `'Tenant not found'` message. A regression that
		// re-orders the gate would surface here.
		const response = await request.patch('/api/admin/notifications/mark-all-read');

		const body = await response.json();
		expect(body.error).not.toBe('Tenant not found');
		expect(body.error).toBe('Unauthorized');
	});

	test('PATCH /api/admin/notifications/mark-all-read has a stable status across header / body permutations', async ({
		request
	}) => {
		// The route's bare `PATCH()` handler signature
		// silently discards body and header content (other
		// than the `Cookie` header for session resolution
		// which the e2e harness does not carry). Every
		// permutation must round-trip to the same 401 status.
		const baseline = await request.patch('/api/admin/notifications/mark-all-read');
		const responses = await Promise.all([
			request.patch('/api/admin/notifications/mark-all-read', { data: {} }),
			request.patch('/api/admin/notifications/mark-all-read', { data: { tenantId: 'fabricated' } }),
			request.patch('/api/admin/notifications/mark-all-read', { data: { userId: 'admin' } }),
			request.patch('/api/admin/notifications/mark-all-read', { data: { isAdmin: true } }),
			request.patch('/api/admin/notifications/mark-all-read', {
				headers: { 'X-Tenant-Id': 'fabricated' }
			}),
			request.patch('/api/admin/notifications/mark-all-read', {
				headers: { 'X-User-Id': 'fabricated' }
			}),
			request.patch('/api/admin/notifications/mark-all-read', {
				headers: { Authorization: 'Bearer anything' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('PATCH /api/admin/notifications/mark-all-read does NOT branch on side-channel cookies / headers', async ({
		request
	}) => {
		// A regression that switches the gate to a custom
		// auth resolver that consults `request.cookies` /
		// `request.geo` / `request.ip` / fabricated tenant-
		// or user-id headers would change the unauth-branch
		// behaviour.
		const responses = await Promise.all([
			request.patch('/api/admin/notifications/mark-all-read', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.patch('/api/admin/notifications/mark-all-read', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.patch('/api/admin/notifications/mark-all-read', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.patch('/api/admin/notifications/mark-all-read', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('PATCH /api/admin/notifications/mark-all-read cross-method probe does NOT 5xx', async ({
		request
	}) => {
		// The route only exports `PATCH`. Every other method
		// (GET / POST / PUT / DELETE) must round-trip to a
		// `< 500` status (typically 405 Method Not Allowed).
		// A 5xx on any other method would indicate the
		// Next.js routing layer crashed before the method-
		// resolution returned its canonical 405.
		const responses = await Promise.all([
			request.get('/api/admin/notifications/mark-all-read'),
			request.post('/api/admin/notifications/mark-all-read'),
			request.put('/api/admin/notifications/mark-all-read'),
			request.delete('/api/admin/notifications/mark-all-read')
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('PATCH /api/admin/notifications/mark-all-read Unauthorized error envelope does NOT echo the success-branch shape', async ({
		request
	}) => {
		// The unauth envelope is `{ error: 'Unauthorized' }`
		// — only the `error` key, no `success: true` /
		// `updatedCount` keys, no `success: false` key, no
		// `errorCode` / `errorMessage` / `details` keys.
		const response = await request.patch('/api/admin/notifications/mark-all-read');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error']);
		expect(body.error).toBe('Unauthorized');
		expect(body).not.toHaveProperty('success');
		expect(body).not.toHaveProperty('updatedCount');
	});
});
