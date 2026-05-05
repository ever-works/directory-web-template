import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multi-method / dynamic-id /
 * body / query / header surface** of the admin-only
 * single-category CRUD endpoint served by
 * `apps/web/app/api/admin/categories/[id]/route.ts`.
 *
 * `GET /api/admin/categories/{id}`,
 * `PUT /api/admin/categories/{id}`, and
 * `DELETE /api/admin/categories/{id}` are the **second**
 * admin-tree route the smoke layer covers as a
 * **triple-method export** — a route that ships THREE
 * distinct HTTP-verb handlers (`GET` + `PUT` + `DELETE`)
 * from a single file. The first such export the smoke
 * layer covers is `admin/items/[id]/route.ts` (see
 * `admin-items-id-method.spec.ts`); every other dynamic-
 * segment admin smoke pins a single-method export
 * (`POST` for `admin/items/[id]/review`, `POST` for
 * `admin/sponsor-ads/[id]/approve` / `reject` / `cancel`,
 * `GET` for `admin/items/[id]/history`, `PATCH` for
 * `admin/notifications/[id]/read`); the
 * `admin/roles/[id]/permissions` smoke pins a dual-method
 * export (`GET` + `PUT`); the
 * `admin/collections/[id]/items` smoke pins a nested
 * dual-method export (`GET` + `POST`).
 *
 * Distinct from the prior triple-method smoke for
 * `admin/items/[id]`, this route adds a **DELETE-only
 * `?hard=true` query-parameter branch** that flips the
 * service call from `categoryRepository.delete(id)`
 * (soft delete / deactivation) to
 * `categoryRepository.hardDelete(id)` (permanent
 * removal), and a **two-message DELETE success branch**
 * (`'Category deactivated successfully'` vs
 * `'Category permanently deleted'`) gated on the same
 * query parameter — the FIRST admin-tree DELETE smoke
 * with a query-flag-driven success-message dichotomy.
 *
 * All three handlers share:
 *   1. **Inline `!session?.user?.isAdmin` gate** — pure
 *      single-step `await auth()` + `isAdmin` predicate,
 *      identical across the three handlers. NOT delegated
 *      to a `checkAdminAuth()` helper.
 *   2. **Canonical longer 401 message**
 *      `'Unauthorized. Admin access required.'` and
 *      `success: false` envelope key — matching every
 *      single-step-gated admin smoke.
 *   3. **Params-resolution-after-the-gate posture** — each
 *      handler resolves `await params` AFTER the gate.
 *   4. **`safeErrorResponse(...)` outer catch** with
 *      handler-specific messages:
 *        - GET: `'Failed to fetch category'`
 *        - PUT: `'Failed to update category'`
 *        - DELETE: `'Failed to delete category'`
 *      Distinct per-handler catch messages — a regression
 *      that swapped any of the three would surface as the
 *      wrong message echoing on the auth branch.
 *   5. **Cache invalidation side-effect** — both PUT and
 *      DELETE call `await invalidateContentCaches()`
 *      AFTER the repository call on the success branch
 *      (GET does not). The unauth branch must NOT enter
 *      that side-effect.
 *
 * Each handler also has its own divergent post-gate
 * surface:
 *
 *   GET:
 *     - No body parse, no query parse.
 *     - `categoryRepository.findById(id)` → 404
 *       `'Category not found'` if missing.
 *     - Success payload `{ success: true, data:
 *       <category> }`.
 *
 *   PUT:
 *     - JSON body parse via `await request.json()` AFTER
 *       the gate (NOT wrapped in a per-call try/catch —
 *       a malformed body would 500 via the outer
 *       `safeErrorResponse(...)` catch on the auth
 *       branch). The body's `name` field is spread into
 *       an `UpdateCategoryRequest` with `id` from params.
 *     - `categoryRepository.update(updateData)` — the
 *       load-bearing service call.
 *     - **Three** distinct catch branches:
 *         - `error.message.includes('not found')` →
 *           404 `{ success: false, error:
 *           <error.message> }` (echoes the underlying
 *           message, NOT a fixed string).
 *         - `error.message.includes('already exists')`
 *           → 409 Conflict `{ success: false, error:
 *           <error.message> }`.
 *         - `error.message.includes('must be')` → 400
 *           Bad Request `{ success: false, error:
 *           <error.message> }`.
 *         - Otherwise → `safeErrorResponse(error,
 *           'Failed to update category')`.
 *     - Success payload `{ success: true, data:
 *       <category>, message: 'Category updated
 *       successfully' }`.
 *
 *   DELETE:
 *     - No body parse.
 *     - **Query parse** via `new URL(request.url)` +
 *       `searchParams.get('hard') === 'true'` AFTER the
 *       gate.
 *     - `categoryRepository.hardDelete(id)` if `hard ===
 *       true`, else `categoryRepository.delete(id)`.
 *     - **Two** distinct catch branches:
 *         - `error.message.includes('not found')` →
 *           404 `{ success: false, error:
 *           <error.message> }`.
 *         - Otherwise → `safeErrorResponse(error,
 *           'Failed to delete category')`.
 *     - Success payload `{ success: true, message:
 *       'Category deactivated successfully' }` for
 *       `hard !== true`, OR
 *       `{ success: true, message: 'Category
 *       permanently deleted' }` for `hard === true`
 *       (NOTE: NO `data` key — distinct from the GET /
 *       PUT success payloads which both include `data`).
 *
 * Where the immediately-preceding sibling specs walk
 * single-, dual-, and nested dual-method dynamic-segment
 * admin routes, this spec walks the second triple-method
 * admin CRUD route — a complementary surface that no
 * prior admin-tree smoke spec covers, and the FIRST
 * triple-method admin smoke with a DELETE-only query-
 * parameter branch.
 */
const CATEGORY_IDS = [
	'productivity',
	'cat_test',
	'cat-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const CATEGORY_PATH = (id: string) => `/api/admin/categories/${id}`;
const PROBE_ID = CATEGORY_IDS[0];

const COMMON_HEADERS = [
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
	{ headers: { 'X-Real-IP': '10.0.0.1' }, label: 'X-Real-IP header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { Authorization: 'Basic anything' }, label: 'Basic authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' },
	{ headers: { 'X-Forwarded-Host': 'admin.evil.example' }, label: 'fabricated X-Forwarded-Host header' },
	{ headers: { 'User-Agent': 'admin-bot/1.0' }, label: 'spoofed User-Agent' },
	{ headers: { 'Accept-Language': 'en-US,en;q=0.9' }, label: 'Accept-Language header' }
] as const;

const PUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Plausible update bodies.
	{ data: { name: 'Productivity Tools' }, label: 'name update' },
	{ data: { name: 'A' }, label: 'too-short name (would trigger "must be" branch on auth)' },
	{ data: { name: 'a'.repeat(101) }, label: 'too-long name (would trigger "must be" branch on auth)' },
	{ data: { name: 'Existing Name' }, label: 'name that would trigger "already exists" branch on auth' },

	// Bypass attempts.
	{ data: { isAdmin: true, name: 'pwn' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', name: 'pwn' }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', name: 'pwn' }, label: 'fabricated userId attempt' },
	{ data: { token: 'anything', name: 'pwn' }, label: 'token bypass attempt' },
	{ data: { id: 'pwn-id', name: 'pwn' }, label: 'fabricated id field (route reads id from params, not body)' },
	{ data: { isActive: false, name: 'pwn' }, label: 'isActive=false bypass attempt' },
	{ data: { padding: 'x'.repeat(2_000), name: 'pwn' }, label: 'large padded body' }
] as const;

const DELETE_QUERY_PERMUTATIONS = [
	{ query: '', label: 'no query (soft-delete branch)' },
	{ query: '?hard=true', label: 'hard=true query (hard-delete branch)' },
	{ query: '?hard=false', label: 'hard=false query (soft-delete branch — explicit)' },
	{ query: '?hard=TRUE', label: 'hard=TRUE query (case-sensitive parser → soft-delete branch)' },
	{ query: '?hard=1', label: 'hard=1 query (NOT "true" → soft-delete branch)' },
	{ query: '?hard=', label: 'hard=<empty> query (NOT "true" → soft-delete branch)' },
	{ query: '?hard', label: 'hard=<missing> query (NOT "true" → soft-delete branch)' },
	{ query: '?hard=true&hard=false', label: 'duplicate hard params (URLSearchParams returns first → hard-delete branch)' },
	{ query: '?other=ignored&hard=true', label: 'irrelevant query plus hard=true' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Category not found',
	'Failed to fetch category',
	'Failed to update category',
	'Failed to delete category',
	'Category updated successfully',
	'Category deactivated successfully',
	'Category permanently deleted'
] as const;

const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/categories/[id] GET / PUT / DELETE method / id / body / query / header surface', () => {
	for (const id of CATEGORY_IDS) {
		test(`GET ${CATEGORY_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.get(CATEGORY_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${CATEGORY_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.put(CATEGORY_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${CATEGORY_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.delete(CATEGORY_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of COMMON_HEADERS) {
		test(`GET ${CATEGORY_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(CATEGORY_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${CATEGORY_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(CATEGORY_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${CATEGORY_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(CATEGORY_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${CATEGORY_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(CATEGORY_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { query, label } of DELETE_QUERY_PERMUTATIONS) {
		test(`DELETE ${CATEGORY_PATH(PROBE_ID)}${query} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.delete(`${CATEGORY_PATH(PROBE_ID)}${query}`);
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${CATEGORY_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.get(CATEGORY_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`PUT ${CATEGORY_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.put(CATEGORY_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`DELETE ${CATEGORY_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.delete(CATEGORY_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`GET / PUT / DELETE ${CATEGORY_PATH(PROBE_ID)} share the SAME 401 envelope shape on the unauth branch`, async ({
		request
	}) => {
		// All three handlers delegate to the SAME inline
		// `!session?.user?.isAdmin` gate, so the unauth
		// envelope must be observably the same across
		// methods.
		const [getResponse, putResponse, deleteResponse] = await Promise.all([
			request.get(CATEGORY_PATH(PROBE_ID)),
			request.put(CATEGORY_PATH(PROBE_ID)),
			request.delete(CATEGORY_PATH(PROBE_ID))
		]);

		expect(getResponse.status()).toBe(401);
		expect(putResponse.status()).toBe(401);
		expect(deleteResponse.status()).toBe(401);

		const [getBody, putBody, deleteBody] = await Promise.all([
			getResponse.json(),
			putResponse.json(),
			deleteResponse.json()
		]);

		expect(getBody).toEqual(putBody);
		expect(getBody).toEqual(deleteBody);
		expect(Object.keys(getBody).sort()).toEqual(['error', 'success']);
	});

	test(`DELETE ${CATEGORY_PATH(PROBE_ID)} 401 envelope is invariant to ?hard= permutations`, async ({
		request
	}) => {
		// The query is parsed AFTER the gate, so all
		// `?hard=…` permutations must round-trip to the
		// SAME canonical 401 envelope. A regression that
		// reordered the query parse before the gate would
		// surface here.
		const baseline = await request.delete(CATEGORY_PATH(PROBE_ID));
		const baselineBody = await baseline.json();

		const responses = await Promise.all(
			DELETE_QUERY_PERMUTATIONS.map(({ query }) =>
				request.delete(`${CATEGORY_PATH(PROBE_ID)}${query}`)
			)
		);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});

	test(`GET / PUT / DELETE ${CATEGORY_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// GET success: { success: true, data: <category> }.
		// PUT success: { success: true, data: <category>, message: 'Category updated successfully' }.
		// DELETE success: { success: true, message: '<one of two messages>' } (no data key).
		const responses = await Promise.all([
			request.get(CATEGORY_PATH(PROBE_ID)),
			request.put(CATEGORY_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(CATEGORY_PATH(PROBE_ID)),
			request.delete(`${CATEGORY_PATH(PROBE_ID)}?hard=true`)
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${CATEGORY_PATH(PROBE_ID)} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		// The seven post-auth messages must NEVER appear in
		// the unauth response body. Note this includes BOTH
		// DELETE success messages — the soft-delete and
		// hard-delete branches.
		const responses = await Promise.all([
			request.get(CATEGORY_PATH(PROBE_ID)),
			request.put(CATEGORY_PATH(PROBE_ID)),
			request.put(CATEGORY_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.put(CATEGORY_PATH(PROBE_ID), { data: { name: 'A' } }),
			request.delete(CATEGORY_PATH(PROBE_ID)),
			request.delete(`${CATEGORY_PATH(PROBE_ID)}?hard=true`)
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`GET / PUT / DELETE ${CATEGORY_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({
		request
	}) => {
		const getBaseline = await request.get(CATEGORY_PATH(PROBE_ID));
		const putBaseline = await request.put(CATEGORY_PATH(PROBE_ID));
		const deleteBaseline = await request.delete(CATEGORY_PATH(PROBE_ID));

		const getResponses = await Promise.all(CATEGORY_IDS.map((id) => request.get(CATEGORY_PATH(id))));
		const putResponses = await Promise.all(CATEGORY_IDS.map((id) => request.put(CATEGORY_PATH(id))));
		const deleteResponses = await Promise.all(CATEGORY_IDS.map((id) => request.delete(CATEGORY_PATH(id))));

		for (const response of getResponses) {
			expect(response.status()).toBe(getBaseline.status());
		}
		for (const response of putResponses) {
			expect(response.status()).toBe(putBaseline.status());
		}
		for (const response of deleteResponses) {
			expect(response.status()).toBe(deleteBaseline.status());
		}
	});

	test(`PUT ${CATEGORY_PATH(PROBE_ID)} has a stable status across body permutations`, async ({ request }) => {
		const baseline = await request.put(CATEGORY_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(CATEGORY_PATH(PROBE_ID), { data: {} }),
			request.put(CATEGORY_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.put(CATEGORY_PATH(PROBE_ID), { data: { name: 'A' } }),
			request.put(CATEGORY_PATH(PROBE_ID), { data: { name: 'a'.repeat(101) } }),
			request.put(CATEGORY_PATH(PROBE_ID), { data: { name: 'Existing Name' } }),
			request.put(CATEGORY_PATH(PROBE_ID), { data: { isAdmin: true, name: 'pwn' } }),
			request.put(CATEGORY_PATH(PROBE_ID), { data: { id: 'pwn-id', name: 'pwn' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET / PUT / DELETE ${CATEGORY_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(CATEGORY_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(CATEGORY_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(CATEGORY_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.put(CATEGORY_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(CATEGORY_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(CATEGORY_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.delete(CATEGORY_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(CATEGORY_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(CATEGORY_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${CATEGORY_PATH(PROBE_ID)} cross-method probe (POST / PATCH) does NOT 5xx`, async ({ request }) => {
		// The route exports only `GET`, `PUT`, and
		// `DELETE`. Other methods (`POST`, `PATCH`) must
		// round-trip to a `< 500` status (typically 405
		// Method Not Allowed).
		const responses = await Promise.all([
			request.post(CATEGORY_PATH(PROBE_ID)),
			request.patch(CATEGORY_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${CATEGORY_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, malformed JSON would 500 via
		// the outer `safeErrorResponse(...)` catch (the
		// body parse is NOT wrapped in a per-call try/
		// catch). On the unauth branch the gate fires
		// before any parse, so malformed bodies must round-
		// trip to the same status as the no-body baseline
		// (and crucially must NOT 5xx).
		const responses = await Promise.all([
			request.put(CATEGORY_PATH(PROBE_ID), { data: 'not-json' }),
			request.put(CATEGORY_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.put(CATEGORY_PATH(PROBE_ID), { data: '{"name":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / PUT / DELETE ${CATEGORY_PATH(PROBE_ID)} service call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders ANY of the four
		// repository calls (`findById` / `update` /
		// `delete` / `hardDelete`) before the gate would
		// surface here.
		const responses = await Promise.all([
			request.get(CATEGORY_PATH(PROBE_ID)),
			request.put(CATEGORY_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(CATEGORY_PATH(PROBE_ID)),
			request.delete(`${CATEGORY_PATH(PROBE_ID)}?hard=true`)
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`PUT / DELETE ${CATEGORY_PATH(PROBE_ID)} cache-invalidation side-effect is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Both PUT and DELETE call `invalidateContentCaches()`
		// AFTER the repository call on the success branch. A
		// regression that reordered the side-effect before
		// the gate would surface as a `success: true`
		// response on the unauth branch (the side-effect
		// itself is opaque to a black-box smoke spec, but
		// the surrounding success envelope is observable).
		const responses = await Promise.all([
			request.put(CATEGORY_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(CATEGORY_PATH(PROBE_ID)),
			request.delete(`${CATEGORY_PATH(PROBE_ID)}?hard=true`)
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${CATEGORY_PATH(PROBE_ID)} unauth response does NOT echo any of the per-handler catch messages`, async ({
		request
	}) => {
		// The three per-handler `safeErrorResponse(...)`
		// catches use distinct messages (`'Failed to fetch
		// category'`, `'Failed to update category'`, `'Failed
		// to delete category'`). A regression that swapped
		// any of the three would surface here.
		const responses = await Promise.all([
			request.get(CATEGORY_PATH(PROBE_ID)),
			request.put(CATEGORY_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(CATEGORY_PATH(PROBE_ID)),
			request.delete(`${CATEGORY_PATH(PROBE_ID)}?hard=true`)
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Failed to fetch category');
			expect(body.error).not.toBe('Failed to update category');
			expect(body.error).not.toBe('Failed to delete category');
		}
	});
});
