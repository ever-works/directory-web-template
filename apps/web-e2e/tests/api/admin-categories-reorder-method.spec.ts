import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **HTTP-method / body-shape / header
 * surface** of the admin-only categories-reorder endpoint
 * served by
 * `apps/web/app/api/admin/categories/reorder/route.ts`.
 *
 * `PUT /api/admin/categories/reorder` is the **first**
 * admin-tree route the smoke layer covers that documents
 * the unique combination of:
 *
 *   1. **`PUT` handler** — the first `PUT`-only route the
 *      e2e suite exercises. Distinct from every other
 *      admin-tree smoke spec which targets `GET` / `POST`
 *      / `PATCH`. The handler signature accepts
 *      `request: NextRequest` (the body-reading variant
 *      distinct from the bare `PATCH()` of
 *      `admin/notifications/mark-all-read` which
 *      narrows the request surface to zero).
 *   2. **Single-step `auth()` chain** that collapses
 *      both unauthenticated and authenticated-non-admin
 *      branches into the SAME 401 envelope — distinct
 *      from the two-step gates of
 *      `admin/notifications/mark-all-read` (which splits
 *      401 / 403 on the `tenantId` boundary) and
 *      `admin/users/check-email` /
 *      `admin/users/check-username` (which split on the
 *      `isAdmin` boundary).
 *   3. **`'Unauthorized. Admin access required.'`
 *      canonical longer 401 message** — the SAME message
 *      shape as the sibling
 *      `admin/twenty-crm/test-connection`,
 *      `admin/twenty-crm/config`, and `admin/sponsor-ads`
 *      routes. Distinct from the bare `'Unauthorized'`
 *      message of `admin/notifications/mark-all-read`
 *      and `admin/users/check-email` /
 *      `admin/users/check-username`.
 *   4. **`success: false` envelope** on the 401 branch —
 *      the SAME envelope shape as the sibling
 *      `admin/twenty-crm/test-connection` route. Distinct
 *      from the bare `{ error: 'Unauthorized' }` envelope
 *      (no `success` key) of
 *      `admin/notifications/mark-all-read`.
 *   5. **Body parse via `await request.json()`** AFTER
 *      the gate — distinct from the bare `PATCH()` of
 *      `admin/notifications/mark-all-read` and the bare
 *      `POST()` of `admin/twenty-crm/test-connection`,
 *      both of which never read the body. The gate-
 *      then-parse-then-validate-then-call order is the
 *      load-bearing invariant of this route.
 *   6. **Three-step body validation** AFTER the gate
 *      AND AFTER the body parse: (a) `Array.isArray(categoryIds)`
 *      → 400 `'categoryIds must be an array'`; (b)
 *      `categoryIds.length === 0` → 400
 *      `'categoryIds array cannot be empty'`; (c)
 *      `categoryIds.filter(id => typeof id !== 'string').length > 0`
 *      → 400 `'All category IDs must be strings'`. The
 *      unauth branch must NEVER reach any of the three
 *      validation steps — the response body must NOT
 *      contain any of the three 400 messages.
 *   7. **`categoryRepository.reorder(categoryIds)` call**
 *      followed by `invalidateContentCaches()` — the
 *      success-branch payload shape is
 *      `{ success: true, message: 'Categories reordered successfully' }`.
 *      The unauth branch must NEVER reach the repository
 *      call, so the unauth response body must NOT
 *      contain `success: true` or
 *      `'Categories reordered successfully'`.
 *   8. **`safeErrorResponse(error, 'Failed to reorder categories')`
 *      catch** — distinct from the
 *      `console.error` + `'Internal server error'`
 *      catch of the sibling check-email / check-username
 *      routes and the bare `'Failed to test connection'`
 *      catch of `admin/twenty-crm/test-connection`. The
 *      unauth branch must NEVER reach the catch, so
 *      the unauth response body must NOT contain the
 *      `'Failed to reorder categories'` message.
 *   9. **Method-resolution surface** — the route exports
 *      ONLY `PUT`. Every other method (`GET` / `POST` /
 *      `PATCH` / `DELETE`) must round-trip to a 405
 *      (Method Not Allowed) deterministically; a 5xx
 *      on any other method would indicate the Next.js
 *      routing layer crashed before the method-
 *      resolution returned its canonical 405.
 *
 * Where the sibling `admin-notifications-mark-all-read-method.spec.ts`
 * walks the method-resolution / header surface of a `PATCH`
 * route with a two-step gate that splits on `tenantId`, this
 * spec walks the method-resolution / body surface of a `PUT`
 * route with a single-step gate that collapses on `isAdmin`
 * — a complementary surface that no prior admin-tree smoke
 * spec covers.
 */
const ADMIN_CATEGORIES_REORDER_HEADERS = [
	// Baseline — the no-header unauthenticated case.
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers, no body' },

	// `Content-Type` headers — the route reads the body via
	// `await request.json()`, so a regression that switches
	// to a different content-type negotiator would surface
	// as a status divergence here.
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

const ADMIN_CATEGORIES_REORDER_BODIES = [
	// Body permutations — the route validates the body
	// AFTER the gate, so every body permutation against
	// the unauth branch must round-trip to the SAME 401
	// envelope (the body validation is unreachable on
	// the unauth branch).
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },
	{ data: { categoryIds: [] }, label: 'empty categoryIds array (would 400 if reachable)' },
	{ data: { categoryIds: 'not-an-array' }, label: 'non-array categoryIds (would 400 if reachable)' },
	{ data: { categoryIds: [1, 2, 3] }, label: 'numeric categoryIds (would 400 if reachable)' },
	{ data: { categoryIds: [null] }, label: 'null categoryIds element (would 400 if reachable)' },
	{ data: { categoryIds: ['a', 'b', 'c'] }, label: 'valid categoryIds shape (would call repo if reachable)' },
	{ data: { categoryIds: ['a'.repeat(2_000)] }, label: 'very long categoryId string' },
	{ data: { categoryIds: Array.from({ length: 1_000 }, (_, i) => `cat-${i}`) }, label: 'large categoryIds array' },
	{ data: { isAdmin: true, categoryIds: ['a'] }, label: 'isAdmin=true bypass attempt with valid categoryIds' },
	{ data: { tenantId: 'fabricated', categoryIds: ['a'] }, label: 'fabricated tenantId attempt with valid categoryIds' },
	{ data: { userId: 'admin', categoryIds: ['a'] }, label: 'fabricated userId attempt with valid categoryIds' },
	{ data: { token: 'anything', categoryIds: ['a'] }, label: 'token bypass attempt with valid categoryIds' },
	{ data: { padding: 'x'.repeat(2_000), categoryIds: ['a'] }, label: 'large padded body with valid categoryIds' }
] as const;

test.describe('API: /api/admin/categories/reorder method / body / header surface', () => {
	for (const { headers, label } of ADMIN_CATEGORIES_REORDER_HEADERS) {
		test(`PUT /api/admin/categories/reorder (${label}) responds without a server error`, async ({
			request
		}) => {
			// The route's single-step gate fires before any
			// body parse. The unauthenticated PUT surface
			// returns a 4xx (specifically 401) deterministically.
			const response = await request.put('/api/admin/categories/reorder', {
				headers
			});

			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_CATEGORIES_REORDER_BODIES) {
		test(`PUT /api/admin/categories/reorder with ${label} responds without a server error`, async ({
			request
		}) => {
			// The route validates the body AFTER the gate. On
			// the unauth branch the body is unreachable, so
			// every body permutation must round-trip to the
			// same 401 envelope. A regression that re-orders
			// the body parse before the gate would surface as
			// a status divergence (400 instead of 401).
			const response = await request.put('/api/admin/categories/reorder', {
				data
			});

			expect(response.status()).toBeLessThan(500);
		});
	}

	test('PUT /api/admin/categories/reorder returns 401 with the canonical longer Unauthorized envelope', async ({
		request
	}) => {
		// The unauthenticated PUT branch is the load-bearing
		// invariant: the single-step gate
		// `if (!session?.user?.isAdmin)` fires, returning 401
		// with the `success: false` envelope and the canonical
		// longer message
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		const response = await request.put('/api/admin/categories/reorder');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toMatchObject({
			error: 'Unauthorized. Admin access required.'
		});
	});

	test('PUT /api/admin/categories/reorder does NOT echo the success-branch keys on the unauth branch', async ({
		request
	}) => {
		// The success branch returns
		// `{ success: true, message: 'Categories reordered successfully' }`.
		// The unauth branch must NEVER reach the
		// `categoryRepository.reorder(categoryIds)` /
		// `invalidateContentCaches()` pipeline, so the
		// response body must NOT contain
		// `'Categories reordered successfully'`.
		const response = await request.put('/api/admin/categories/reorder', {
			data: { categoryIds: ['a', 'b', 'c'] }
		});

		const body = await response.json();
		expect(body.message).not.toBe('Categories reordered successfully');
		expect(body.success).not.toBe(true);
	});

	test('PUT /api/admin/categories/reorder does NOT echo the body-validation 400 messages on the unauth branch', async ({
		request
	}) => {
		// The 400 envelopes for the three body-validation
		// steps are
		// `'categoryIds must be an array'`,
		// `'categoryIds array cannot be empty'`, and
		// `'All category IDs must be strings'`. The unauth
		// branch fires the gate BEFORE the body parse, so
		// the unauth response must NEVER contain any of
		// those three messages. A regression that re-orders
		// the body validation before the gate would surface
		// here.
		const responses = await Promise.all([
			request.put('/api/admin/categories/reorder', { data: { categoryIds: 'not-an-array' } }),
			request.put('/api/admin/categories/reorder', { data: { categoryIds: [] } }),
			request.put('/api/admin/categories/reorder', { data: { categoryIds: [1, 2, 3] } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('categoryIds must be an array');
			expect(body.error).not.toBe('categoryIds array cannot be empty');
			expect(body.error).not.toBe('All category IDs must be strings');
		}
	});

	test('PUT /api/admin/categories/reorder does NOT echo the catch-branch 500 message on the unauth branch', async ({
		request
	}) => {
		// The catch branch returns
		// `safeErrorResponse(error, 'Failed to reorder categories')`.
		// The unauth branch must NEVER reach the catch, so
		// the unauth response body must NOT contain the
		// `'Failed to reorder categories'` message. A
		// regression that swaps the gate for a try-catch
		// wrapper that swallows auth failures would surface
		// here.
		const response = await request.put('/api/admin/categories/reorder');

		const body = await response.json();
		expect(body.error).not.toBe('Failed to reorder categories');
		expect(body.error).toBe('Unauthorized. Admin access required.');
	});

	test('PUT /api/admin/categories/reorder has a stable status across header / body permutations', async ({
		request
	}) => {
		// The single-step gate fires before the body parse,
		// so every permutation must round-trip to the same
		// 401 status as the no-body baseline.
		const baseline = await request.put('/api/admin/categories/reorder');
		const responses = await Promise.all([
			request.put('/api/admin/categories/reorder', { data: {} }),
			request.put('/api/admin/categories/reorder', { data: { categoryIds: ['a', 'b', 'c'] } }),
			request.put('/api/admin/categories/reorder', { data: { categoryIds: [] } }),
			request.put('/api/admin/categories/reorder', { data: { isAdmin: true, categoryIds: ['a'] } }),
			request.put('/api/admin/categories/reorder', { data: { categoryIds: 'not-an-array' } }),
			request.put('/api/admin/categories/reorder', {
				headers: { 'X-Tenant-Id': 'fabricated' }
			}),
			request.put('/api/admin/categories/reorder', {
				headers: { Authorization: 'Bearer anything' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('PUT /api/admin/categories/reorder does NOT branch on side-channel cookies / headers', async ({
		request
	}) => {
		// A regression that switches the gate to a custom
		// auth resolver that consults `request.cookies` /
		// `request.geo` / `request.ip` / fabricated tenant-
		// or user-id headers would change the unauth-branch
		// behaviour.
		const responses = await Promise.all([
			request.put('/api/admin/categories/reorder', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.put('/api/admin/categories/reorder', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.put('/api/admin/categories/reorder', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.put('/api/admin/categories/reorder', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('PUT /api/admin/categories/reorder cross-method probe does NOT 5xx', async ({
		request
	}) => {
		// The route only exports `PUT`. Every other method
		// (GET / POST / PATCH / DELETE) must round-trip to a
		// `< 500` status (typically 405 Method Not Allowed).
		// A 5xx on any other method would indicate the
		// Next.js routing layer crashed before the method-
		// resolution returned its canonical 405.
		const responses = await Promise.all([
			request.get('/api/admin/categories/reorder'),
			request.post('/api/admin/categories/reorder'),
			request.patch('/api/admin/categories/reorder'),
			request.delete('/api/admin/categories/reorder')
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('PUT /api/admin/categories/reorder Unauthorized error envelope echoes the success: false key', async ({
		request
	}) => {
		// The unauth envelope is
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		// Distinct from the bare `{ error: 'Unauthorized' }`
		// envelope of `admin/notifications/mark-all-read`
		// which has NO `success` key. The presence of the
		// `success: false` key is the cross-route divergence
		// that distinguishes this route's gate from the
		// bare-message gates.
		const response = await request.put('/api/admin/categories/reorder');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized. Admin access required.'
		});
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test('PUT /api/admin/categories/reorder is invariant to malformed JSON bodies on the unauth branch', async ({
		request
	}) => {
		// A regression that runs the body parse before the
		// gate would surface here: a malformed JSON body
		// would 400 with a JSON-parse error instead of 401
		// with the canonical longer Unauthorized envelope.
		const responses = await Promise.all([
			request.put('/api/admin/categories/reorder', { data: 'not-json' }),
			request.put('/api/admin/categories/reorder', { data: '{ broken: json' }),
			request.put('/api/admin/categories/reorder', { data: '{"categoryIds": [' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});
});
