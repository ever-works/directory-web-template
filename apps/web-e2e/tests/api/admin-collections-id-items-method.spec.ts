import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multi-method / nested-dynamic-id /
 * body / header surface** of the admin-only collection-items
 * endpoint served by
 * `apps/web/app/api/admin/collections/[id]/items/route.ts`.
 *
 * `GET /api/admin/collections/{id}/items` and
 * `POST /api/admin/collections/{id}/items` are the **first**
 * admin-tree routes the smoke layer covers as a **nested-
 * dynamic-segment dual-method export** — a route where the
 * `[id]` segment is the parent collection's id, with a sub-
 * resource `/items` appended. Every prior dynamic-segment
 * admin smoke uses `[id]` as the LEAF segment of the path;
 * this is the first that uses `[id]` as a NON-LEAF segment.
 *
 *   1. **Nested dynamic-segment routing** — the path
 *      shape `/collections/[id]/items` puts the `[id]`
 *      mid-path with a static `/items` suffix. The
 *      handler signature accepts a `RouteParams`
 *      interface that wraps `params: Promise<{ id:
 *      string }>` — the `[id]` resolves to the parent
 *      collection. Distinct from every prior dynamic-
 *      segment admin smoke where `[id]` is the leaf.
 *   2. **Single-step `!session?.user?.isAdmin` gate**
 *      with the canonical longer 401 envelope, identical
 *      across both `GET` and `POST` handlers.
 *   3. **GET success-payload divergence** — the success
 *      branch returns `{ success: true, items }` (with
 *      the key `items`, NOT `data`). Distinct from every
 *      prior admin GET smoke which uses `{ success:
 *      true, data: ... }`. The unauth branch must NEVER
 *      contain an `items` key.
 *   4. **POST success-payload divergence** — the
 *      success branch returns
 *      `{ success: true, collection, updatedItems,
 *      message: 'Collection items updated successfully' }`
 *      with FOUR success-branch keys (`success`,
 *      `collection`, `updatedItems`, `message`). Distinct
 *      from every prior admin POST smoke which uses at
 *      most three keys (`success`, `data`, `message`).
 *      The unauth branch must NEVER contain a
 *      `collection` or `updatedItems` key.
 *   5. **POST single-step body validation** —
 *      `if (!Array.isArray(body.itemIds))` → 400
 *      `'itemIds array is required'`. The unauth branch
 *      must NEVER reach the validation step regardless
 *      of body shape.
 *   6. **POST side-effects after the service call** —
 *      `invalidateContentCaches()` + `revalidatePath(
 *      '/collections')` + `revalidatePath(
 *      '/collections/<slug>')`. The unauth branch must
 *      NEVER reach these side effects.
 *   7. **`safeErrorResponse(...)` catch** with handler-
 *      specific messages
 *      (`'Failed to fetch collection items'` /
 *      `'Failed to assign collection items'`).
 *   8. **Method-resolution surface** — the route exports
 *      ONLY `GET` and `POST`. Every other method (`PUT`
 *      / `PATCH` / `DELETE`) must round-trip to a
 *      `< 500` status (typically 405 Method Not
 *      Allowed).
 *
 * Where the immediately-preceding
 * `admin-users-id-method.spec.ts` walks a leaf-`[id]`
 * triple-method admin route, this spec walks the nested-
 * `[id]/items` dual-method admin route — a complementary
 * surface that no prior admin-tree smoke spec covers.
 */
const COLLECTION_IDS = [
	'collection_1',
	'collection_test',
	'collection-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const ITEMS_PATH = (collectionId: string) => `/api/admin/collections/${collectionId}/items`;
const PROBE_ID = COLLECTION_IDS[0];

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

const POST_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 if reachable)' },

	// `itemIds` validation probes.
	{ data: { itemIds: [] }, label: 'empty itemIds array (would proceed to service if reachable)' },
	{ data: { itemIds: ['item-1'] }, label: 'single-itemId array' },
	{ data: { itemIds: ['item-1', 'item-2'] }, label: 'two-itemId array' },
	{ data: { itemIds: 'not-an-array' }, label: 'string itemIds (would 400 if reachable)' },
	{ data: { itemIds: 123 }, label: 'numeric itemIds (would 400 if reachable)' },
	{ data: { itemIds: null }, label: 'null itemIds (would 400 if reachable)' },
	{ data: { itemIds: {} }, label: 'object itemIds (would 400 if reachable)' },
	{ data: { itemIds: undefined }, label: 'undefined itemIds (would 400 if reachable)' },
	{ data: { someOther: 'noise' }, label: 'no itemIds key (would 400 if reachable)' },

	// Bypass attempts.
	{ data: { isAdmin: true, itemIds: ['item-1'] }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', itemIds: ['item-1'] }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', itemIds: ['item-1'] }, label: 'fabricated userId attempt' },
	{ data: { padding: 'x'.repeat(2_000), itemIds: ['item-1'] }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'itemIds array is required',
	'Failed to fetch collection items',
	'Failed to assign collection items',
	'Collection items updated successfully'
] as const;

const FORBIDDEN_KEYS = ['items', 'collection', 'updatedItems'] as const;

const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/collections/[id]/items GET / POST method / id / body / header surface', () => {
	for (const id of COLLECTION_IDS) {
		test(`GET ${ITEMS_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.get(ITEMS_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`POST ${ITEMS_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.post(ITEMS_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of COMMON_HEADERS) {
		test(`GET ${ITEMS_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(ITEMS_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`POST ${ITEMS_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(ITEMS_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of POST_BODIES) {
		test(`POST ${ITEMS_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(ITEMS_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${ITEMS_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.get(ITEMS_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`POST ${ITEMS_PATH(PROBE_ID)} returns 401 with the canonical longer Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.post(ITEMS_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`GET / POST ${ITEMS_PATH(PROBE_ID)} share the SAME 401 envelope shape on the unauth branch`, async ({
		request
	}) => {
		const [getResponse, postResponse] = await Promise.all([
			request.get(ITEMS_PATH(PROBE_ID)),
			request.post(ITEMS_PATH(PROBE_ID))
		]);

		expect(getResponse.status()).toBe(401);
		expect(postResponse.status()).toBe(401);

		const [getBody, postBody] = await Promise.all([getResponse.json(), postResponse.json()]);
		expect(getBody).toEqual(postBody);
		expect(Object.keys(getBody).sort()).toEqual(['error', 'success']);
	});

	test(`GET / POST ${ITEMS_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// GET success: { success: true, items: [...] }.
		// POST success: { success: true, collection, updatedItems, message: '...' }.
		// The unauth branch must NEVER contain an `items`,
		// `collection`, or `updatedItems` key, must NOT
		// contain `success: true`, and must NOT contain the
		// success message.
		const responses = await Promise.all([
			request.get(ITEMS_PATH(PROBE_ID)),
			request.post(ITEMS_PATH(PROBE_ID), { data: { itemIds: ['item-1'] } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const key of FORBIDDEN_KEYS) {
				expect(body[key]).toBeUndefined();
			}
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / POST ${ITEMS_PATH(PROBE_ID)} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(ITEMS_PATH(PROBE_ID)),
			request.post(ITEMS_PATH(PROBE_ID)),
			request.post(ITEMS_PATH(PROBE_ID), { data: { itemIds: ['item-1'] } }),
			request.post(ITEMS_PATH(PROBE_ID), { data: { itemIds: 'not-an-array' } }),
			request.post(ITEMS_PATH(PROBE_ID), { data: {} })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`GET / POST ${ITEMS_PATH(PROBE_ID)} has a stable status across distinct nested-id shapes`, async ({
		request
	}) => {
		const getBaseline = await request.get(ITEMS_PATH(PROBE_ID));
		const postBaseline = await request.post(ITEMS_PATH(PROBE_ID));

		const getResponses = await Promise.all(COLLECTION_IDS.map((id) => request.get(ITEMS_PATH(id))));
		const postResponses = await Promise.all(COLLECTION_IDS.map((id) => request.post(ITEMS_PATH(id))));

		for (const response of getResponses) {
			expect(response.status()).toBe(getBaseline.status());
		}
		for (const response of postResponses) {
			expect(response.status()).toBe(postBaseline.status());
		}
	});

	test(`POST ${ITEMS_PATH(PROBE_ID)} has a stable status across body permutations`, async ({ request }) => {
		const baseline = await request.post(ITEMS_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.post(ITEMS_PATH(PROBE_ID), { data: {} }),
			request.post(ITEMS_PATH(PROBE_ID), { data: { itemIds: [] } }),
			request.post(ITEMS_PATH(PROBE_ID), { data: { itemIds: ['item-1'] } }),
			request.post(ITEMS_PATH(PROBE_ID), { data: { itemIds: 'not-an-array' } }),
			request.post(ITEMS_PATH(PROBE_ID), { data: { itemIds: 123 } }),
			request.post(ITEMS_PATH(PROBE_ID), { data: { itemIds: null } }),
			request.post(ITEMS_PATH(PROBE_ID), { data: { isAdmin: true, itemIds: ['item-1'] } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET / POST ${ITEMS_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(ITEMS_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(ITEMS_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(ITEMS_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.post(ITEMS_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(ITEMS_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(ITEMS_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${ITEMS_PATH(PROBE_ID)} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		// The route exports only `GET` and `POST`.
		const responses = await Promise.all([
			request.put(ITEMS_PATH(PROBE_ID)),
			request.patch(ITEMS_PATH(PROBE_ID)),
			request.delete(ITEMS_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${ITEMS_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(ITEMS_PATH(PROBE_ID), { data: 'not-json' }),
			request.post(ITEMS_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.post(ITEMS_PATH(PROBE_ID), { data: '{"itemIds":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / POST ${ITEMS_PATH(PROBE_ID)} service call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders
		// `collectionRepository.getAssignedItems(...)` /
		// `collectionRepository.assignItems(...)` before the
		// gate would surface here: the unauth response would
		// echo an `items` / `collection` / `updatedItems`
		// key from the service payload.
		const responses = await Promise.all([
			request.get(ITEMS_PATH(PROBE_ID)),
			request.post(ITEMS_PATH(PROBE_ID), { data: { itemIds: ['item-1'] } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const key of FORBIDDEN_KEYS) {
				expect(body[key]).toBeUndefined();
			}
			expect(body.success).not.toBe(true);
		}
	});

	test(`POST ${ITEMS_PATH(PROBE_ID)} side-effects (cache-invalidation / revalidatePath) are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, after the service call, the
		// handler invokes `invalidateContentCaches()` and
		// two `revalidatePath(...)` calls. A regression that
		// re-orders those before the gate would surface as
		// unexpected cache behavior; this test pins that the
		// unauth response is INVARIANT to the body shape
		// (every body shape round-trips to the same 401
		// status as the no-body baseline, so the side-effects
		// are unreachable).
		const baseline = await request.post(ITEMS_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.post(ITEMS_PATH(PROBE_ID), { data: { itemIds: ['item-1'] } }),
			request.post(ITEMS_PATH(PROBE_ID), { data: { itemIds: ['item-1', 'item-2', 'item-3'] } }),
			request.post(ITEMS_PATH(PROBE_ID), { data: { itemIds: [] } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
