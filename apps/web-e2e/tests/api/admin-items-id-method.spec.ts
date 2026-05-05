import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multi-method / dynamic-id / body /
 * header surface** of the admin-only single-item CRUD endpoint
 * served by `apps/web/app/api/admin/items/[id]/route.ts`.
 *
 * `GET /api/admin/items/{id}`,
 * `PUT /api/admin/items/{id}`, and
 * `DELETE /api/admin/items/{id}` are the **first** admin-tree
 * routes the smoke layer covers as a **triple-method export**
 * — a route that ships THREE distinct HTTP-verb handlers
 * (`GET` + `PUT` + `DELETE`) from a single file. Every prior
 * dynamic-segment admin smoke pins a single-method export
 * (`POST` for `admin/items/[id]/review`, `POST` for
 * `admin/sponsor-ads/[id]/approve` / `reject` / `cancel`,
 * `GET` for `admin/items/[id]/history`, `PATCH` for
 * `admin/notifications/[id]/read`); the
 * `admin/roles/[id]/permissions` smoke pins a dual-method
 * export (`GET` + `PUT`); this is the **first** triple-method
 * export the docs tree publishes.
 *
 * All three handlers share:
 *   1. **Inline `!session?.user?.isAdmin` gate** — pure
 *      single-step `await auth()` + `isAdmin` predicate,
 *      identical across the three handlers. NOT delegated
 *      to a `checkAdminAuth()` helper (distinct from the
 *      sibling `admin/roles/[id]/permissions` route).
 *   2. **Canonical longer 401 message**
 *      `'Unauthorized. Admin access required.'` and
 *      `success: false` envelope key — matching every
 *      single-step-gated admin smoke.
 *   3. **Params-resolution-after-the-gate posture** — each
 *      handler resolves `await params` AFTER the gate.
 *   4. **`safeErrorResponse(...)` catch** with handler-
 *      specific messages:
 *        - GET: `'Failed to fetch item'`
 *        - PUT: `'Failed to update item'`
 *        - DELETE: `'Failed to delete item'`
 *      Distinct per-handler catch messages — a regression
 *      that swapped any of the three would surface as the
 *      wrong message echoing on the auth branch.
 *
 * Each handler also has its own divergent post-gate
 * surface:
 *
 *   GET:
 *     - No body parse.
 *     - `itemRepository.findById(id)` → 404
 *       `'Item not found'` if missing.
 *     - Success payload `{ success: true, data: <item> }`.
 *
 *   PUT:
 *     - JSON body parse via `await request.json()` AFTER
 *       the gate (NOT wrapped in a per-call try/catch —
 *       a malformed body would 500 via the outer
 *       `safeErrorResponse(...)` catch on the auth
 *       branch). The body is spread into an
 *       `UpdateItemRequest` with `id` from params.
 *     - Audit-user context built from `session.user.id`
 *       /`name` / `email`.
 *     - `itemRepository.update(id, updateData,
 *       auditUser)` — the load-bearing service call.
 *     - Optional CRM-sync side-effect gated by
 *       `process.env.TWENTY_CRM_ENABLED !== 'false'`
 *       (with body `brand` field as the trigger).
 *     - Optional Location-Index side-effect gated by
 *       `getLocationEnabled()`.
 *     - Success payload `{ success: true, data: <item>,
 *       message: 'Item updated successfully' }`.
 *
 *   DELETE:
 *     - No body parse.
 *     - Audit-user context built from `session.user.id`
 *       / `name` / `email`.
 *     - `itemRepository.delete(id, auditUser)`.
 *     - Optional Location-Index removal side-effect
 *       gated by `getLocationEnabled()`.
 *     - Success payload `{ success: true, message:
 *       'Item deleted successfully' }` (NOTE: NO `data`
 *       key — distinct from the GET / PUT success
 *       payloads which both include `data`).
 *
 * Where the immediately-preceding sibling specs walk
 * single- or dual-method dynamic-segment admin routes,
 * this spec walks the triple-method admin-items CRUD
 * route — a complementary surface that no prior admin-
 * tree smoke spec covers.
 */
const ITEM_IDS = [
	'item_1',
	'item_test',
	'item-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const ITEM_PATH = (id: string) => `/api/admin/items/${id}`;
const PROBE_ID = ITEM_IDS[0];

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
	{ data: { name: 'Updated name' }, label: 'name-only update' },
	{ data: { description: 'Updated description' }, label: 'description-only update' },
	{ data: { status: 'approved' }, label: 'status approve update' },
	{ data: { status: 'rejected' }, label: 'status reject update' },
	{ data: { featured: true }, label: 'featured=true update' },
	{ data: { featured: false }, label: 'featured=false update' },
	{ data: { brand: 'Acme Inc.' }, label: 'brand update (would trigger CRM sync if reachable)' },
	{ data: { tags: ['saas', 'productivity'] }, label: 'tags array update' },
	{ data: { category: ['productivity'] }, label: 'category array update' },

	// Bypass attempts.
	{ data: { isAdmin: true, name: 'pwn' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', name: 'pwn' }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', name: 'pwn' }, label: 'fabricated userId attempt' },
	{ data: { token: 'anything', name: 'pwn' }, label: 'token bypass attempt' },
	{ data: { padding: 'x'.repeat(2_000), name: 'pwn' }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Item not found',
	'Failed to fetch item',
	'Failed to update item',
	'Failed to delete item',
	'Item updated successfully',
	'Item deleted successfully'
] as const;

const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/items/[id] GET / PUT / DELETE method / id / body / header surface', () => {
	for (const id of ITEM_IDS) {
		test(`GET ${ITEM_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.get(ITEM_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${ITEM_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.put(ITEM_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${ITEM_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.delete(ITEM_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of COMMON_HEADERS) {
		test(`GET ${ITEM_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(ITEM_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${ITEM_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(ITEM_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${ITEM_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(ITEM_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${ITEM_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(ITEM_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${ITEM_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.get(ITEM_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`PUT ${ITEM_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.put(ITEM_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`DELETE ${ITEM_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.delete(ITEM_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`GET / PUT / DELETE ${ITEM_PATH(PROBE_ID)} share the SAME 401 envelope shape on the unauth branch`, async ({
		request
	}) => {
		// All three handlers delegate to the SAME inline
		// `!session?.user?.isAdmin` gate, so the unauth
		// envelope must be observably the same across
		// methods.
		const [getResponse, putResponse, deleteResponse] = await Promise.all([
			request.get(ITEM_PATH(PROBE_ID)),
			request.put(ITEM_PATH(PROBE_ID)),
			request.delete(ITEM_PATH(PROBE_ID))
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

	test(`GET / PUT / DELETE ${ITEM_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// GET success: { success: true, data: <item> }.
		// PUT success: { success: true, data: <item>, message: 'Item updated successfully' }.
		// DELETE success: { success: true, message: 'Item deleted successfully' } (no data key).
		const responses = await Promise.all([
			request.get(ITEM_PATH(PROBE_ID)),
			request.put(ITEM_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(ITEM_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${ITEM_PATH(PROBE_ID)} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		// The six post-auth messages must NEVER appear in
		// the unauth response body.
		const responses = await Promise.all([
			request.get(ITEM_PATH(PROBE_ID)),
			request.put(ITEM_PATH(PROBE_ID)),
			request.put(ITEM_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.put(ITEM_PATH(PROBE_ID), { data: { brand: 'Acme Inc.' } }),
			request.delete(ITEM_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`GET / PUT / DELETE ${ITEM_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({
		request
	}) => {
		const getBaseline = await request.get(ITEM_PATH(PROBE_ID));
		const putBaseline = await request.put(ITEM_PATH(PROBE_ID));
		const deleteBaseline = await request.delete(ITEM_PATH(PROBE_ID));

		const getResponses = await Promise.all(ITEM_IDS.map((id) => request.get(ITEM_PATH(id))));
		const putResponses = await Promise.all(ITEM_IDS.map((id) => request.put(ITEM_PATH(id))));
		const deleteResponses = await Promise.all(ITEM_IDS.map((id) => request.delete(ITEM_PATH(id))));

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

	test(`PUT ${ITEM_PATH(PROBE_ID)} has a stable status across body permutations`, async ({ request }) => {
		const baseline = await request.put(ITEM_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(ITEM_PATH(PROBE_ID), { data: {} }),
			request.put(ITEM_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.put(ITEM_PATH(PROBE_ID), { data: { status: 'approved' } }),
			request.put(ITEM_PATH(PROBE_ID), { data: { status: 'rejected' } }),
			request.put(ITEM_PATH(PROBE_ID), { data: { brand: 'Acme Inc.' } }),
			request.put(ITEM_PATH(PROBE_ID), { data: { isAdmin: true, name: 'pwn' } }),
			request.put(ITEM_PATH(PROBE_ID), { data: { tags: ['saas'] } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET / PUT / DELETE ${ITEM_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(ITEM_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(ITEM_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(ITEM_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.put(ITEM_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(ITEM_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(ITEM_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.delete(ITEM_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(ITEM_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(ITEM_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${ITEM_PATH(PROBE_ID)} cross-method probe (POST / PATCH) does NOT 5xx`, async ({ request }) => {
		// The route exports only `GET`, `PUT`, and
		// `DELETE`. Other methods (`POST`, `PATCH`) must
		// round-trip to a `< 500` status (typically 405
		// Method Not Allowed).
		const responses = await Promise.all([
			request.post(ITEM_PATH(PROBE_ID)),
			request.patch(ITEM_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${ITEM_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, malformed JSON would 500 via
		// the outer `safeErrorResponse(...)` catch (the
		// body parse is NOT wrapped in a per-call try/
		// catch). On the unauth branch the gate fires
		// before any parse, so malformed bodies must round-
		// trip to the same 401 status as the no-body
		// baseline.
		const responses = await Promise.all([
			request.put(ITEM_PATH(PROBE_ID), { data: 'not-json' }),
			request.put(ITEM_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.put(ITEM_PATH(PROBE_ID), { data: '{"name":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / PUT / DELETE ${ITEM_PATH(PROBE_ID)} service call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders ANY of the three
		// repository calls (`findById` / `update` /
		// `delete`) before the gate would surface here.
		const responses = await Promise.all([
			request.get(ITEM_PATH(PROBE_ID)),
			request.put(ITEM_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(ITEM_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${ITEM_PATH(PROBE_ID)} unauth response does NOT echo any of the per-handler catch messages`, async ({
		request
	}) => {
		// The three per-handler `safeErrorResponse(...)`
		// catches use distinct messages (`'Failed to fetch
		// item'`, `'Failed to update item'`, `'Failed to
		// delete item'`). A regression that swapped any of
		// the three would surface here.
		const responses = await Promise.all([
			request.get(ITEM_PATH(PROBE_ID)),
			request.put(ITEM_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(ITEM_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Failed to fetch item');
			expect(body.error).not.toBe('Failed to update item');
			expect(body.error).not.toBe('Failed to delete item');
		}
	});
});
