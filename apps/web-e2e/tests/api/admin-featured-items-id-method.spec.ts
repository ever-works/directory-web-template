import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multi-method / dynamic-id /
 * body / header surface** of the admin-only single-
 * featured-item CRUD endpoint served by
 * `apps/web/app/api/admin/featured-items/[id]/route.ts`.
 *
 * `GET /api/admin/featured-items/{id}`,
 * `PUT /api/admin/featured-items/{id}`, and
 * `DELETE /api/admin/featured-items/{id}` are the **first**
 * admin-tree routes the smoke layer covers as a triple-
 * method export with these unique combination of postures:
 *
 *   1. **Two-step `!session?.user?.id` → `!tenantId`
 *      gate** that returns 401 `'Unauthorized'` then 403
 *      `'Tenant not found'` — matching the
 *      `admin/notifications/[id]/read` PATCH and
 *      `admin/comments/[id]` GET/PUT envelopes, but with
 *      the canonical `success: false` envelope key
 *      (where `notifications/...` uses a bare envelope).
 *   2. **The gate does NOT check `isAdmin`** — only
 *      requires an authenticated user (with `id`) and a
 *      tenant. This is unusual for an admin-namespace
 *      route. Q-010b-style concern noted in
 *      `docs/questions.md`: any authenticated user with
 *      a tenant can hit this route (no admin role
 *      required).
 *   3. **DELETE is a soft delete** (sets `isActive:
 *      false` + `updatedAt`) rather than a hard delete —
 *      distinct from every prior admin DELETE smoke
 *      that actually removes the row.
 *   4. **PUT body has seven fields** directly
 *      destructured (`itemName`, `itemIconUrl`,
 *      `itemCategory`, `itemDescription`,
 *      `featuredOrder`, `featuredUntil`, `isActive`)
 *      with NO validation — fields are shoved straight
 *      into `db.update(...)`. Distinct from every prior
 *      validated PUT smoke.
 *   5. **All three handlers issue inline Drizzle queries**
 *      with tenant scoping
 *      (`and(eq(featuredItems.id, id),
 *      eq(featuredItems.tenantId, tenantId))`).
 *   6. **`console.error` + 500 with handler-specific
 *      message catch** (`'Failed to fetch\|update\|remove
 *      featured item'`).
 *
 * All three handlers share:
 *   - Single envelope shape for both gate-step branches
 *     (`{ success: false, error: ... }`).
 *   - Strict envelope-shape preservation
 *     (`Object.keys(body).sort() === ['error',
 *     'success']`).
 *   - Identical 401 envelope from the FIRST gate step
 *     (`!session?.user?.id` → 401 `'Unauthorized'`).
 *
 * Each handler diverges on its post-gate surface:
 *
 *   GET:
 *     - Inline Drizzle `select()` with tenant scoping
 *       and `.limit(1)`.
 *     - 404 `'Featured item not found'` if
 *       `featuredItem.length === 0`.
 *     - Success payload `{ success: true, data:
 *       featuredItem[0] }`.
 *
 *   PUT:
 *     - JSON body parse via `await request.json()`
 *       AFTER tenant resolution.
 *     - **NO body validation** — seven fields
 *       destructured and shoved directly into
 *       `db.update(...).set({...}).returning()`.
 *     - 404 `'Featured item not found'` if
 *       `updatedItem.length === 0`.
 *     - Success payload `{ success: true, data:
 *       updatedItem[0], message: 'Featured item
 *       updated successfully' }`.
 *
 *   DELETE:
 *     - **Soft delete** via `db.update(...).set({
 *       isActive: false, updatedAt: new Date() })
 *       .returning()`.
 *     - 404 `'Featured item not found'` if
 *       `updatedItem.length === 0`.
 *     - Success payload `{ success: true, message:
 *       'Featured item removed successfully' }` (NO
 *       `data` key).
 *
 * Where the immediately-preceding triple-method
 * `admin-companies-id-method.spec.ts` walks a Zod-
 * `parse()`-with-`details`-envelope route, this spec
 * walks the validation-less, soft-delete-DELETE,
 * tenant-scoped triple-method `admin/featured-items/
 * [id]` route — a complementary surface that no prior
 * admin-tree smoke spec covers.
 */
const FEATURED_ITEM_IDS = [
	'featured_1',
	'featured_test',
	'featured-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const FEATURED_PATH = (id: string) => `/api/admin/featured-items/${id}`;
const PROBE_ID = FEATURED_ITEM_IDS[0];

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
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { Authorization: 'Basic anything' }, label: 'Basic authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const PUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// All seven update fields.
	{ data: { itemName: 'Updated Item' }, label: 'itemName-only update' },
	{ data: { itemIconUrl: 'https://example.com/icon.png' }, label: 'itemIconUrl-only update' },
	{ data: { itemCategory: 'New Category' }, label: 'itemCategory-only update' },
	{ data: { itemDescription: 'Updated description' }, label: 'itemDescription-only update' },
	{ data: { featuredOrder: 10 }, label: 'featuredOrder-only update' },
	{ data: { featuredUntil: '2025-12-31T23:59:59.000Z' }, label: 'featuredUntil ISO date update' },
	{ data: { featuredUntil: null }, label: 'featuredUntil null clear' },
	{ data: { isActive: true }, label: 'isActive=true update' },
	{ data: { isActive: false }, label: 'isActive=false update (would soft-delete via PUT path)' },

	// Bypass attempts.
	{ data: { isAdmin: true, itemName: 'pwn' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', itemName: 'pwn' }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', itemName: 'pwn' }, label: 'fabricated userId attempt' },
	{ data: { padding: 'x'.repeat(2_000), itemName: 'pwn' }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Tenant not found',
	'Featured item not found',
	'Failed to fetch featured item',
	'Failed to update featured item',
	'Failed to remove featured item',
	'Featured item updated successfully',
	'Featured item removed successfully'
] as const;

const FIRST_401_MESSAGE = 'Unauthorized';

test.describe('API: /api/admin/featured-items/[id] GET / PUT / DELETE method / id / body / header surface', () => {
	for (const id of FEATURED_ITEM_IDS) {
		test(`GET ${FEATURED_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.get(FEATURED_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${FEATURED_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.put(FEATURED_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${FEATURED_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.delete(FEATURED_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of COMMON_HEADERS) {
		test(`GET ${FEATURED_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(FEATURED_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${FEATURED_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(FEATURED_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${FEATURED_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(FEATURED_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${FEATURED_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(FEATURED_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${FEATURED_PATH(PROBE_ID)} returns 401 with the bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.get(FEATURED_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: FIRST_401_MESSAGE });
	});

	test(`PUT ${FEATURED_PATH(PROBE_ID)} returns 401 with the bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.put(FEATURED_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: FIRST_401_MESSAGE });
	});

	test(`DELETE ${FEATURED_PATH(PROBE_ID)} returns 401 with the bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.delete(FEATURED_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: FIRST_401_MESSAGE });
	});

	test(`GET / PUT / DELETE ${FEATURED_PATH(PROBE_ID)} envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(FEATURED_PATH(PROBE_ID)),
			request.put(FEATURED_PATH(PROBE_ID)),
			request.delete(FEATURED_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		}
	});

	test(`GET / PUT / DELETE ${FEATURED_PATH(PROBE_ID)} share the SAME 401 envelope shape on the unauth branch`, async ({
		request
	}) => {
		const [getResponse, putResponse, deleteResponse] = await Promise.all([
			request.get(FEATURED_PATH(PROBE_ID)),
			request.put(FEATURED_PATH(PROBE_ID)),
			request.delete(FEATURED_PATH(PROBE_ID))
		]);

		const [getBody, putBody, deleteBody] = await Promise.all([
			getResponse.json(),
			putResponse.json(),
			deleteResponse.json()
		]);

		expect(getBody).toEqual(putBody);
		expect(getBody).toEqual(deleteBody);
	});

	test(`GET / PUT / DELETE ${FEATURED_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// GET / PUT success: { success: true, data: <featured-item> }.
		// PUT success additionally includes 'message': 'Featured item updated successfully'.
		// DELETE success: { success: true, message: 'Featured item removed successfully' }.
		const responses = await Promise.all([
			request.get(FEATURED_PATH(PROBE_ID)),
			request.put(FEATURED_PATH(PROBE_ID), { data: { itemName: 'pwn' } }),
			request.delete(FEATURED_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${FEATURED_PATH(PROBE_ID)} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(FEATURED_PATH(PROBE_ID)),
			request.put(FEATURED_PATH(PROBE_ID)),
			request.put(FEATURED_PATH(PROBE_ID), { data: { itemName: 'pwn' } }),
			request.delete(FEATURED_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`GET / PUT / DELETE ${FEATURED_PATH(PROBE_ID)} unauth branch lands on 401 (NOT 403)`, async ({
		request
	}) => {
		// The 403 'Tenant not found' branch only fires
		// when the user IS authenticated but lacks a
		// tenant. The unauth client lacks any session at
		// all, so the FIRST gate-step ('Unauthorized')
		// fires instead — the unauth response must NEVER
		// be 403, and must NEVER echo the 'Tenant not
		// found' message.
		const responses = await Promise.all([
			request.get(FEATURED_PATH(PROBE_ID)),
			request.put(FEATURED_PATH(PROBE_ID)),
			request.delete(FEATURED_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Tenant not found');
		}
	});

	test(`GET / PUT / DELETE ${FEATURED_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({
		request
	}) => {
		const getBaseline = await request.get(FEATURED_PATH(PROBE_ID));
		const putBaseline = await request.put(FEATURED_PATH(PROBE_ID));
		const deleteBaseline = await request.delete(FEATURED_PATH(PROBE_ID));

		const getResponses = await Promise.all(FEATURED_ITEM_IDS.map((id) => request.get(FEATURED_PATH(id))));
		const putResponses = await Promise.all(FEATURED_ITEM_IDS.map((id) => request.put(FEATURED_PATH(id))));
		const deleteResponses = await Promise.all(FEATURED_ITEM_IDS.map((id) => request.delete(FEATURED_PATH(id))));

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

	test(`PUT ${FEATURED_PATH(PROBE_ID)} has a stable status across body permutations`, async ({ request }) => {
		const baseline = await request.put(FEATURED_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(FEATURED_PATH(PROBE_ID), { data: {} }),
			request.put(FEATURED_PATH(PROBE_ID), { data: { itemName: 'pwn' } }),
			request.put(FEATURED_PATH(PROBE_ID), { data: { featuredOrder: 10 } }),
			request.put(FEATURED_PATH(PROBE_ID), { data: { featuredUntil: '2025-12-31T23:59:59.000Z' } }),
			request.put(FEATURED_PATH(PROBE_ID), { data: { featuredUntil: null } }),
			request.put(FEATURED_PATH(PROBE_ID), { data: { isActive: false } }),
			request.put(FEATURED_PATH(PROBE_ID), { data: { isAdmin: true, itemName: 'pwn' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET / PUT / DELETE ${FEATURED_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(FEATURED_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(FEATURED_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(FEATURED_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.put(FEATURED_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(FEATURED_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(FEATURED_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.delete(FEATURED_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(FEATURED_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(FEATURED_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${FEATURED_PATH(PROBE_ID)} cross-method probe (POST / PATCH) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(FEATURED_PATH(PROBE_ID)),
			request.patch(FEATURED_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${FEATURED_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.put(FEATURED_PATH(PROBE_ID), { data: 'not-json' }),
			request.put(FEATURED_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.put(FEATURED_PATH(PROBE_ID), { data: '{"itemName":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / PUT / DELETE ${FEATURED_PATH(PROBE_ID)} Drizzle query is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders any of the inline
		// Drizzle queries (the `select` for GET, the
		// `update` for PUT and the soft-delete `update`
		// for DELETE) before the gate would surface here.
		const responses = await Promise.all([
			request.get(FEATURED_PATH(PROBE_ID)),
			request.put(FEATURED_PATH(PROBE_ID), { data: { itemName: 'pwn' } }),
			request.delete(FEATURED_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`DELETE ${FEATURED_PATH(PROBE_ID)} soft-delete update is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, DELETE issues a Drizzle
		// `update(featuredItems).set({ isActive: false,
		// updatedAt: new Date() })` (a soft delete).
		// The unauth branch must NEVER reach this update,
		// so the unauth response must NEVER echo
		// 'Featured item removed successfully'.
		const response = await request.delete(FEATURED_PATH(PROBE_ID));
		const body = await response.json();
		expect(body.message).not.toBe('Featured item removed successfully');
		expect(body.success).not.toBe(true);
	});
});
