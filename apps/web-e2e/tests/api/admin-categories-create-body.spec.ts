import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the admin-only collection-level category-create
 * endpoint served by the `POST` export of
 * `apps/web/app/api/admin/categories/route.ts`.
 *
 * The companion `apps/web-e2e/tests/api/admin-categories-
 * query.spec.ts` covers the GET (paginated list) surface
 * of the same route. This spec covers the POST (create)
 * surface that no prior admin-tree smoke spec touches.
 *
 * `POST /api/admin/categories` is the **first** admin-tree
 * route the smoke layer covers as a **collection-level
 * create endpoint** with a **`category` success-payload
 * key** (NOT `data`) — distinct from every prior POST
 * smoke that uses `data`. Notably, this matches the
 * sibling `POST /api/admin/collections` which uses a
 * `collection` success-payload key, suggesting a
 * convention divergence between create endpoints that
 * serve a single resource (categories / collections /
 * tags) vs those that serve nested or composite payloads
 * (items / users — which use `data`).
 *
 *   1. **Single-step inline `!session?.user?.isAdmin`
 *      gate** → 401 `{ success: false, error:
 *      'Unauthorized. Admin access required.' }`.
 *   2. **Canonical longer 401 message** + **`success:
 *      false` envelope key** with strict envelope-shape
 *      preservation
 *      `Object.keys(body).sort() === ['error',
 *      'success']`.
 *   3. **JSON body parse via `await request.json()`**
 *      AFTER the gate. NOT wrapped in a per-call
 *      try/catch.
 *   4. **Single-field required check** —
 *      `if (!createData.name)` → 400 `'Category name is
 *      required'`. Distinct from the multi-field
 *      required-validation chains of `admin/items` POST
 *      (5 fields), `admin/users` POST (5 fields), and
 *      `admin/collections` POST (2 fields).
 *   5. **`categoryRepository.create(...)` call** AFTER
 *      the required-field check. The repository may
 *      throw `'... already exists'` or `'must be'`
 *      errors that the outer catch translates.
 *   6. **`await invalidateContentCaches()`** side
 *      effect on the success branch.
 *   7. **Three-branch outer catch chain**:
 *        (a) `error.message.includes('already exists')`
 *            → 409 echoing raw `error.message`.
 *        (b) `error.message.includes('must be')` →
 *            400 echoing raw `error.message`.
 *        (c) `safeErrorResponse(error, 'Failed to
 *            create category')` fallback.
 *      Distinct from the `admin/users` POST
 *      `error.message`-pass-through catch (which
 *      always returns 400 for `Error` instances).
 *   8. **Success payload** with **`category`
 *      success-key (NOT `data`)** — `{ success: true,
 *      category: <category>, message: 'Category
 *      created successfully' }` with status 201.
 *      Matches the sibling `admin/collections` POST
 *      which uses `collection` (not `data`).
 *   9. **Method-resolution surface** — the route
 *      exports `GET` and `POST`. PUT / PATCH / DELETE
 *      must round-trip to a `< 500` status (typically
 *      405 Method Not Allowed).
 *
 * Where the immediately-preceding `admin-users-create-
 * body.spec.ts` walks the `POST /api/admin/users`
 * collection-level endpoint with an eight-step
 * validation chain, this spec walks the `POST
 * /api/admin/categories` collection-level endpoint
 * with a single-field required check + a three-branch
 * outer catch chain + the `category` success-key —
 * a complementary surface that no prior admin-tree
 * smoke spec covers.
 */
const CATEGORIES_PATH = '/api/admin/categories';

const ADMIN_CATEGORIES_CREATE_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { Cookie: 'authjs.session-token=fabricated' }, label: 'fabricated authjs session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { Authorization: 'Basic anything' }, label: 'Basic authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const ADMIN_CATEGORIES_CREATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (req-name) if reachable)' },

	// Required-field probes.
	{ data: { id: 'i' }, label: 'id-only body (would 400 (req-name) if reachable)' },
	{ data: { name: '' }, label: 'empty name (would 400 (req-name) if reachable)' },
	{ data: { name: null }, label: 'null name (would 400 (req-name) if reachable)' },

	// Valid bodies (would create category if reachable).
	{ data: { name: 'Test Category' }, label: 'valid name-only body' },
	{ data: { id: 'productivity', name: 'Productivity' }, label: 'valid id+name body' },
	{ data: { name: 'a' }, label: 'short 1-char name (would 400 (must-be-at-least-2) from repo if reachable)' },
	{ data: { name: 'a'.repeat(101) }, label: 'long 101-char name (would 400 from repo if reachable)' },

	// Bypass attempts.
	{ data: { isAdmin: true, name: 'Pwn' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', name: 'Pwn' }, label: 'fabricated tenantId attempt' },
	{ data: { padding: 'x'.repeat(2_000), name: 'Pwn' }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Category name is required',
	'Failed to create category',
	'Category created successfully'
] as const;

const FORBIDDEN_KEYS = ['data', 'category'] as const;

const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/categories POST body / header surface', () => {
	for (const { headers, label } of ADMIN_CATEGORIES_CREATE_HEADERS) {
		test(`POST ${CATEGORIES_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(CATEGORIES_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_CATEGORIES_CREATE_BODIES) {
		test(`POST ${CATEGORIES_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(CATEGORIES_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${CATEGORIES_PATH} returns 401 with the canonical longer Unauthorized envelope`, async ({ request }) => {
		const response = await request.post(CATEGORIES_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`POST ${CATEGORIES_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		const response = await request.post(CATEGORIES_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`POST ${CATEGORIES_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// Success branch: status 201 with `{ success:
		// true, category: <category>, message: 'Category
		// created successfully' }` (NOTE: `category` key,
		// NOT `data`). The unauth branch must NEVER reach
		// the create call.
		const response = await request.post(CATEGORIES_PATH, { data: { name: 'Test' } });
		expect(response.status()).not.toBe(201);
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
		expect(body.success).not.toBe(true);
		expect(body.message).toBeUndefined();
	});

	test(`POST ${CATEGORIES_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(CATEGORIES_PATH),
			request.post(CATEGORIES_PATH, { data: {} }),
			request.post(CATEGORIES_PATH, { data: { name: 'Test' } }),
			request.post(CATEGORIES_PATH, { data: { name: '' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${CATEGORIES_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(CATEGORIES_PATH);
		const responses = await Promise.all([
			request.post(CATEGORIES_PATH, { data: {} }),
			request.post(CATEGORIES_PATH, { data: { name: 'Test' } }),
			request.post(CATEGORIES_PATH, { data: { id: 'i', name: 'Test' } }),
			request.post(CATEGORIES_PATH, { data: { isAdmin: true, name: 'Pwn' } }),
			request.post(CATEGORIES_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(CATEGORIES_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${CATEGORIES_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(CATEGORIES_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(CATEGORIES_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(CATEGORIES_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(CATEGORIES_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(CATEGORIES_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(CATEGORIES_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(CATEGORIES_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(CATEGORIES_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CATEGORIES_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.put(CATEGORIES_PATH),
			request.patch(CATEGORIES_PATH),
			request.delete(CATEGORIES_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CATEGORIES_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(CATEGORIES_PATH, { data: 'not-json' }),
			request.post(CATEGORIES_PATH, { data: '{ broken: json' }),
			request.post(CATEGORIES_PATH, { data: '{"name":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CATEGORIES_PATH} required-field check is NOT entered on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(CATEGORIES_PATH, { data: {} }),
			request.post(CATEGORIES_PATH, { data: { name: '' } }),
			request.post(CATEGORIES_PATH, { data: { name: null } }),
			request.post(CATEGORIES_PATH, { data: { id: 'i' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Category name is required');
		}
	});

	test(`POST ${CATEGORIES_PATH} create call + cache invalidation are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, success branch returns
		// status 201 with the `category` key. The unauth
		// branch must NEVER reach the create call or the
		// cache invalidation.
		const responses = await Promise.all([
			request.post(CATEGORIES_PATH, { data: { name: 'Test' } }),
			request.post(CATEGORIES_PATH, { data: { id: 'productivity', name: 'Productivity' } })
		]);

		for (const response of responses) {
			expect(response.status()).not.toBe(201);
			const body = await response.json();
			expect(body.category).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).not.toBe('Category created successfully');
		}
	});

	test(`POST ${CATEGORIES_PATH} three-branch outer catch is NOT entered on the unauth branch`, async ({ request }) => {
		// On the auth branch, the outer catch maps
		// `'already exists'` → 409 and `'must be'` → 400
		// (echoing raw error.message), with
		// `safeErrorResponse(...)` fallback. The unauth
		// branch must NEVER reach this catch chain.
		const response = await request.post(CATEGORIES_PATH, {
			data: { id: 'duplicate-probe', name: 'Duplicate Probe' }
		});
		const body = await response.json();
		// The unauth response must echo the canonical 401
		// envelope, not any branch of the outer catch.
		expect(body.error).toBe(CANONICAL_401_MESSAGE);
	});
});
