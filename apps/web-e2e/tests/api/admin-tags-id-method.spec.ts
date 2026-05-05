import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multi-method / dynamic-id /
 * body / header surface** of the admin-only single-tag CRUD
 * endpoint served by
 * `apps/web/app/api/admin/tags/[id]/route.ts`.
 *
 * `GET /api/admin/tags/{id}`,
 * `PUT /api/admin/tags/{id}`, and
 * `DELETE /api/admin/tags/{id}` are the **first**
 * admin-tree routes the smoke layer covers as a triple-
 * method export that combines:
 *   - the **hybrid bare-`Unauthorized` + `success: false`
 *     envelope** (matching `admin/users/[id]`,
 *     `admin/featured-items/[id]`,
 *     `admin/roles/[id]/permissions`), AND
 *   - the **single-step inline `!session?.user?.isAdmin`
 *     gate** (NOT the two-step `!session?.user?.id` →
 *     `!tenantId` gate of `admin/featured-items/[id]`,
 *     and NOT the two-step `!session?.user` →
 *     `!session.user.isAdmin` gate of `admin/users/[id]`),
 *     AND
 *   - **invalidateContentCaches() side effect** on PUT /
 *     DELETE success branches, AND
 *   - a **PUT outer-catch three-branch chain** that maps
 *     `error.message.includes('not found' | 'already
 *     exists' | 'required' | 'must be')` to one of three
 *     status codes (404 / 409 / 400) echoing the raw
 *     error message — distinct from prior catch chains.
 *
 * All three handlers share:
 *   1. **Single-step inline `!session?.user?.isAdmin`
 *      gate** → 401
 *      `{ success: false, error: 'Unauthorized' }`
 *      (the bare-`Unauthorized` message PLUS `success:
 *      false` envelope key — distinct from both the
 *      canonical-longer envelope of `admin/items/[id]`
 *      AND the no-`success`-key envelope of
 *      `admin/clients/[clientId]`).
 *   2. **`success: false` envelope key** with strict
 *      envelope-shape preservation
 *      `Object.keys(body).sort() === ['error',
 *      'success']`.
 *   3. **Dynamic `[id]` segment** resolved AFTER the
 *      gate.
 *   4. **`console.error` + 500 catch** with handler-
 *      specific messages.
 *
 * Each handler also has its own divergent post-gate
 * surface:
 *
 *   GET:
 *     - `tagRepository.findById(id)` → 404 `'Tag not
 *       found'` if missing.
 *     - Success payload `{ success: true, data: <tag> }`.
 *     - Catch: 500 `'Failed to fetch tag'`.
 *
 *   PUT:
 *     - JSON body parse via `await request.json()`.
 *     - `if (!name)` → 400 `'Tag name is required'`.
 *     - `tagRepository.update(id, { name, isActive })`.
 *     - **`await invalidateContentCaches()`** on the
 *       success branch.
 *     - Success payload `{ success: true, data: <tag>,
 *       message: 'Tag updated successfully' }`.
 *     - Catch: three-branch chain echoing raw
 *       `error.message`:
 *         - `error.message.includes('not found')` →
 *           404.
 *         - `error.message.includes('already exists')`
 *           → 409.
 *         - `error.message.includes('required' | 'must
 *           be')` → 400.
 *       Else 500 `'Failed to update tag'`.
 *
 *   DELETE:
 *     - `tagRepository.delete(id)`.
 *     - **`await invalidateContentCaches()`** on the
 *       success branch.
 *     - Success payload `{ success: true, message:
 *       'Tag deleted successfully' }` (NO `data` key).
 *     - Catch: single-branch chain echoing raw
 *       `error.message`:
 *         - `error.message.includes('not found')` →
 *           404.
 *       Else 500 `'Failed to delete tag'`.
 *
 * Where the immediately-preceding non-admin-gated
 * triple-method `admin-featured-items-id-method.spec.ts`
 * walks a route with NO `isAdmin` check, this spec walks
 * the admin-gated triple-method `admin/tags/[id]` route
 * with the hybrid bare-`Unauthorized` envelope plus the
 * three-branch `error.message.includes(...)` PUT catch
 * chain — a complementary surface that no prior admin-
 * tree smoke spec covers.
 */
const TAG_IDS = [
	'tag_1',
	'tag_test',
	'tag-with-dashes',
	'productivity',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const TAG_PATH = (id: string) => `/api/admin/tags/${id}`;
const PROBE_ID = TAG_IDS[0];

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
	{ data: '{}', label: 'empty object body (would 400 if reachable)' },

	// name validation probes.
	{ data: { name: '' }, label: 'empty name (would 400 if reachable)' },
	{ data: { name: null }, label: 'null name (would 400 if reachable)' },
	{ data: { name: 'Updated Tag' }, label: 'valid name update' },
	{ data: { name: 'A' }, label: 'short 1-char name (would 400 from repo "must be" if reachable)' },
	{ data: { name: 'a'.repeat(51) }, label: 'long 51-char name (would 400 from repo "must be" if reachable)' },

	// isActive probes.
	{ data: { name: 'Tag', isActive: true }, label: 'valid name + isActive=true' },
	{ data: { name: 'Tag', isActive: false }, label: 'valid name + isActive=false' },

	// Bypass attempts.
	{ data: { isAdmin: true, name: 'pwn' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', name: 'pwn' }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', name: 'pwn' }, label: 'fabricated userId attempt' },
	{ data: { padding: 'x'.repeat(2_000), name: 'pwn' }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Tag not found',
	'Tag name is required',
	'Failed to fetch tag',
	'Failed to update tag',
	'Failed to delete tag',
	'Tag updated successfully',
	'Tag deleted successfully'
] as const;

const HYBRID_401_MESSAGE = 'Unauthorized';

test.describe('API: /api/admin/tags/[id] GET / PUT / DELETE method / id / body / header surface', () => {
	for (const id of TAG_IDS) {
		test(`GET ${TAG_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.get(TAG_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${TAG_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.put(TAG_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${TAG_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.delete(TAG_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of COMMON_HEADERS) {
		test(`GET ${TAG_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(TAG_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${TAG_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(TAG_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${TAG_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(TAG_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${TAG_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(TAG_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${TAG_PATH(PROBE_ID)} returns 401 with the hybrid bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.get(TAG_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: HYBRID_401_MESSAGE });
	});

	test(`PUT ${TAG_PATH(PROBE_ID)} returns 401 with the hybrid bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.put(TAG_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: HYBRID_401_MESSAGE });
	});

	test(`DELETE ${TAG_PATH(PROBE_ID)} returns 401 with the hybrid bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.delete(TAG_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: HYBRID_401_MESSAGE });
	});

	test(`GET / PUT / DELETE ${TAG_PATH(PROBE_ID)} envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(TAG_PATH(PROBE_ID)),
			request.put(TAG_PATH(PROBE_ID)),
			request.delete(TAG_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		}
	});

	test(`GET / PUT / DELETE ${TAG_PATH(PROBE_ID)} share the SAME 401 envelope shape on the unauth branch`, async ({
		request
	}) => {
		const [getResponse, putResponse, deleteResponse] = await Promise.all([
			request.get(TAG_PATH(PROBE_ID)),
			request.put(TAG_PATH(PROBE_ID)),
			request.delete(TAG_PATH(PROBE_ID))
		]);

		const [getBody, putBody, deleteBody] = await Promise.all([
			getResponse.json(),
			putResponse.json(),
			deleteResponse.json()
		]);

		expect(getBody).toEqual(putBody);
		expect(getBody).toEqual(deleteBody);
	});

	test(`GET / PUT / DELETE ${TAG_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(TAG_PATH(PROBE_ID)),
			request.put(TAG_PATH(PROBE_ID), { data: { name: 'Updated' } }),
			request.delete(TAG_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${TAG_PATH(PROBE_ID)} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(TAG_PATH(PROBE_ID)),
			request.put(TAG_PATH(PROBE_ID)),
			request.put(TAG_PATH(PROBE_ID), { data: {} }),
			request.put(TAG_PATH(PROBE_ID), { data: { name: 'Updated' } }),
			request.delete(TAG_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`GET / PUT / DELETE ${TAG_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({
		request
	}) => {
		const getBaseline = await request.get(TAG_PATH(PROBE_ID));
		const putBaseline = await request.put(TAG_PATH(PROBE_ID));
		const deleteBaseline = await request.delete(TAG_PATH(PROBE_ID));

		const getResponses = await Promise.all(TAG_IDS.map((id) => request.get(TAG_PATH(id))));
		const putResponses = await Promise.all(TAG_IDS.map((id) => request.put(TAG_PATH(id))));
		const deleteResponses = await Promise.all(TAG_IDS.map((id) => request.delete(TAG_PATH(id))));

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

	test(`PUT ${TAG_PATH(PROBE_ID)} has a stable status across body permutations`, async ({ request }) => {
		const baseline = await request.put(TAG_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(TAG_PATH(PROBE_ID), { data: {} }),
			request.put(TAG_PATH(PROBE_ID), { data: { name: '' } }),
			request.put(TAG_PATH(PROBE_ID), { data: { name: 'Updated' } }),
			request.put(TAG_PATH(PROBE_ID), { data: { name: 'Updated', isActive: false } }),
			request.put(TAG_PATH(PROBE_ID), { data: { isAdmin: true, name: 'pwn' } }),
			request.put(TAG_PATH(PROBE_ID), { data: { name: 'A' } }),
			request.put(TAG_PATH(PROBE_ID), { data: { name: 'a'.repeat(51) } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET / PUT / DELETE ${TAG_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(TAG_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(TAG_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(TAG_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.put(TAG_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(TAG_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(TAG_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.delete(TAG_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(TAG_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(TAG_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${TAG_PATH(PROBE_ID)} cross-method probe (POST / PATCH) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(TAG_PATH(PROBE_ID)),
			request.patch(TAG_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${TAG_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.put(TAG_PATH(PROBE_ID), { data: 'not-json' }),
			request.put(TAG_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.put(TAG_PATH(PROBE_ID), { data: '{"name":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / PUT / DELETE ${TAG_PATH(PROBE_ID)} service / repository call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders any of the
		// `tagRepository.findById(...)` /
		// `tagRepository.update(...)` /
		// `tagRepository.delete(...)` calls before the
		// gate would surface here.
		const responses = await Promise.all([
			request.get(TAG_PATH(PROBE_ID)),
			request.put(TAG_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(TAG_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`PUT / DELETE ${TAG_PATH(PROBE_ID)} cache-invalidation side-effect is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, both PUT and DELETE call
		// `await invalidateContentCaches()` on the success
		// branch. The unauth branch must NEVER reach this
		// side effect, so the unauth response must NEVER
		// echo `'Tag updated successfully'` or `'Tag
		// deleted successfully'`.
		const responses = await Promise.all([
			request.put(TAG_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(TAG_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.message).not.toBe('Tag updated successfully');
			expect(body.message).not.toBe('Tag deleted successfully');
		}
	});

	test(`PUT ${TAG_PATH(PROBE_ID)} three-branch catch chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, the PUT outer catch maps
		// `error.message.includes('not found' \| 'already
		// exists' \| 'required' \| 'must be')` to one of
		// three status codes (404 / 409 / 400) echoing the
		// raw error message. The unauth branch must NEVER
		// reach this catch.
		const response = await request.put(TAG_PATH(PROBE_ID), { data: { name: '' } });
		const body = await response.json();
		// The error message is `'Unauthorized'`, not any
		// substring that the catch chain would surface.
		expect(body.error).toBe(HYBRID_401_MESSAGE);
	});
});
