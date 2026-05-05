import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multi-method / dynamic-id /
 * body / query / header surface** of the admin-only
 * single-role CRUD endpoint served by
 * `apps/web/app/api/admin/roles/[id]/route.ts`.
 *
 * `GET /api/admin/roles/{id}`,
 * `PUT /api/admin/roles/{id}`, and
 * `DELETE /api/admin/roles/{id}` are the **first**
 * admin-tree routes the smoke layer covers as a triple-
 * method export that combines:
 *   - the **two-step `!session?.user` →
 *     `!session.user.isAdmin` gate** (matching
 *     `admin/users/[id]` and `admin/reports/[id]`,
 *     distinct from the single-step gates of every
 *     other prior triple-method admin smoke), AND
 *   - a **DELETE `?hard=true` query-parameter branch**
 *     that flips the soft-delete (`'Role deleted
 *     (marked as inactive)'`) and hard-delete (`'Role
 *     permanently deleted'`) messages — matching the
 *     `admin/categories/[id]` DELETE-`?hard=true`
 *     pattern, distinct from every other prior triple-
 *     method admin smoke, AND
 *   - a **PUT three-step manual body validation chain**
 *     with FIXED error messages (NOT dynamically
 *     interpolated): (a) `'Role name cannot be empty'`
 *     on `!updateData.name.trim()`; (b) `'Role name
 *     must be between 3 and 100 characters'` on length
 *     out-of-range; (c) `'Role description must be at
 *     most 500 characters'` on description > 500. PUT
 *     also does an **explicit existence check AFTER**
 *     the body parse (not BEFORE — distinct from
 *     `admin/reports/[id]` which checks BEFORE).
 *
 * All three handlers share:
 *   1. **Two-step gate** —
 *        (a) `!session?.user` → 401 `{ success: false,
 *            error: 'Unauthorized' }`.
 *        (b) `!session.user.isAdmin` → 403
 *            `{ success: false, error: 'Forbidden' }`.
 *      The unauth client lacks any session, so the
 *      FIRST step always fires.
 *   2. **Hybrid 401 envelope** — bare `'Unauthorized'`
 *      message PLUS `success: false` envelope key.
 *      Distinct from the canonical longer
 *      `'Unauthorized. Admin access required.'` of
 *      `admin/items/[id]` AND from the no-`success`-key
 *      `{ error: 'Unauthorized' }` of
 *      `admin/clients/[clientId]`.
 *   3. **Strict envelope-shape preservation**
 *      (`Object.keys(body).sort() === ['error',
 *      'success']`).
 *   4. **Dynamic `[id]` segment** resolved AFTER both
 *      gate steps.
 *   5. **`console.error` + 500 catch** with handler-
 *      specific messages (`'Failed to fetch\|update\|
 *      delete role'`).
 *
 * Each handler also has its own divergent post-gate
 * surface:
 *
 *   GET:
 *     - `roleRepository.findById(id)` → 404 `'Role not
 *       found'` if missing.
 *     - Success payload `{ success: true, data:
 *       <role> }`.
 *
 *   PUT:
 *     - JSON body parse via `await request.json()`
 *       AFTER both gate steps.
 *     - **Existence check AFTER body parse** —
 *       `roleRepository.findById(id)` → 404 `'Role
 *       not found'` if missing.
 *     - **Three-step manual body validation chain**
 *       with FIXED error messages.
 *     - `roleRepository.update(id, ...)`.
 *     - Success payload `{ success: true, data:
 *       <role>, message: 'Role updated successfully' }`.
 *
 *   DELETE:
 *     - `searchParams.get('hard') === 'true'` query
 *       parse AFTER both gate steps.
 *     - **Existence check AFTER query parse** —
 *       `roleRepository.findById(id)` → 404 `'Role
 *       not found'` if missing.
 *     - Branches on `hardDelete` boolean:
 *         - `hardDelete === true` →
 *           `roleRepository.hardDelete(id)` + success
 *           payload `{ success: true, message: 'Role
 *           permanently deleted' }`.
 *         - `hardDelete === false` →
 *           `roleRepository.delete(id)` + success
 *           payload `{ success: true, message: 'Role
 *           deleted (marked as inactive)' }`.
 *
 * Where the immediately-preceding `admin-tags-id-method.
 * spec.ts` walks a hybrid-envelope triple-method route
 * with a single-step inline `!isAdmin` gate, this spec
 * walks the hybrid-envelope triple-method `admin/roles/
 * [id]` route with a two-step `!session?.user` →
 * `!session.user.isAdmin` gate, the DELETE-`?hard=true`
 * query branch, and the three-step PUT body validation
 * — a complementary surface that no prior admin-tree
 * smoke spec covers.
 */
const ROLE_IDS = [
	'role_1',
	'role_test',
	'admin',
	'moderator',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const ROLE_PATH = (id: string) => `/api/admin/roles/${id}`;
const PROBE_ID = ROLE_IDS[0];

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

	// Three-step validation probes.
	{ data: { name: '   ' }, label: 'whitespace-only name (would 400 (a) if reachable)' },
	{ data: { name: 'ab' }, label: 'too-short 2-char name (would 400 (b) if reachable)' },
	{ data: { name: 'a'.repeat(101) }, label: 'too-long 101-char name (would 400 (b) if reachable)' },
	{ data: { name: 'Valid Role' }, label: 'valid 10-char name update' },
	{ data: { description: 'a'.repeat(501) }, label: 'too-long 501-char description (would 400 (c) if reachable)' },
	{ data: { description: 'Valid description' }, label: 'valid description update' },

	// Status / isAdmin update probes.
	{ data: { status: 'active' }, label: 'status=active update' },
	{ data: { status: 'inactive' }, label: 'status=inactive update' },
	{ data: { isAdmin: true }, label: 'isAdmin=true update (would grant admin perms if reachable)' },
	{ data: { isAdmin: false }, label: 'isAdmin=false update' },

	// Bypass attempts.
	{ data: { tenantId: 'fabricated', name: 'pwn' }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', name: 'pwn' }, label: 'fabricated userId attempt' },
	{ data: { padding: 'x'.repeat(2_000), name: 'pwn' }, label: 'large padded body' }
] as const;

const DELETE_QUERIES = [
	{ qs: '', label: 'no query string (soft delete branch if reachable)' },
	{ qs: '?hard=true', label: 'hard=true query (hard delete branch if reachable)' },
	{ qs: '?hard=false', label: 'hard=false query (soft delete branch if reachable)' },
	{ qs: '?hard=TRUE', label: 'hard=TRUE uppercase (case-sensitive equality, soft delete branch)' },
	{ qs: '?hard=1', label: 'hard=1 numeric (soft delete branch, requires === "true")' },
	{ qs: '?hard=', label: 'hard= empty (soft delete branch)' },
	{ qs: '?other=true', label: 'unrelated query key (soft delete branch)' },
	{ qs: '?hard=true&other=value', label: 'hard=true with extra query key' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Role not found',
	'Forbidden',
	'Failed to fetch role',
	'Failed to update role',
	'Failed to delete role',
	'Role updated successfully',
	'Role deleted (marked as inactive)',
	'Role permanently deleted',
	'Role name cannot be empty',
	'Role name must be between 3 and 100 characters',
	'Role description must be at most 500 characters'
] as const;

const HYBRID_401_MESSAGE = 'Unauthorized';

test.describe('API: /api/admin/roles/[id] GET / PUT / DELETE method / id / body / query / header surface', () => {
	for (const id of ROLE_IDS) {
		test(`GET ${ROLE_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.get(ROLE_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${ROLE_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.put(ROLE_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${ROLE_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.delete(ROLE_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of COMMON_HEADERS) {
		test(`GET ${ROLE_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(ROLE_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${ROLE_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(ROLE_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${ROLE_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(ROLE_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${ROLE_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(ROLE_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { qs, label } of DELETE_QUERIES) {
		test(`DELETE ${ROLE_PATH(PROBE_ID)}${qs} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(`${ROLE_PATH(PROBE_ID)}${qs}`);
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${ROLE_PATH(PROBE_ID)} returns 401 with the hybrid bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.get(ROLE_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: HYBRID_401_MESSAGE });
	});

	test(`PUT ${ROLE_PATH(PROBE_ID)} returns 401 with the hybrid bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.put(ROLE_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: HYBRID_401_MESSAGE });
	});

	test(`DELETE ${ROLE_PATH(PROBE_ID)} returns 401 with the hybrid bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.delete(ROLE_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: HYBRID_401_MESSAGE });
	});

	test(`GET / PUT / DELETE ${ROLE_PATH(PROBE_ID)} envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(ROLE_PATH(PROBE_ID)),
			request.put(ROLE_PATH(PROBE_ID)),
			request.delete(ROLE_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		}
	});

	test(`GET / PUT / DELETE ${ROLE_PATH(PROBE_ID)} share the SAME 401 envelope shape on the unauth branch`, async ({
		request
	}) => {
		const [getResponse, putResponse, deleteResponse] = await Promise.all([
			request.get(ROLE_PATH(PROBE_ID)),
			request.put(ROLE_PATH(PROBE_ID)),
			request.delete(ROLE_PATH(PROBE_ID))
		]);

		const [getBody, putBody, deleteBody] = await Promise.all([
			getResponse.json(),
			putResponse.json(),
			deleteResponse.json()
		]);

		expect(getBody).toEqual(putBody);
		expect(getBody).toEqual(deleteBody);
	});

	test(`GET / PUT / DELETE ${ROLE_PATH(PROBE_ID)} unauth branch lands on 401 (NOT 403)`, async ({ request }) => {
		// The 403 'Forbidden' branch only fires for an
		// authenticated-but-non-admin session. The unauth
		// client lacks any session at all, so the FIRST
		// gate-step ('Unauthorized') fires instead — the
		// unauth response must NEVER be 403, and must
		// NEVER echo the 'Forbidden' message.
		const responses = await Promise.all([
			request.get(ROLE_PATH(PROBE_ID)),
			request.put(ROLE_PATH(PROBE_ID)),
			request.delete(ROLE_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Forbidden');
		}
	});

	test(`GET / PUT / DELETE ${ROLE_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(ROLE_PATH(PROBE_ID)),
			request.put(ROLE_PATH(PROBE_ID), { data: { name: 'Updated' } }),
			request.delete(ROLE_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${ROLE_PATH(PROBE_ID)} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(ROLE_PATH(PROBE_ID)),
			request.put(ROLE_PATH(PROBE_ID)),
			request.put(ROLE_PATH(PROBE_ID), { data: { name: '   ' } }),
			request.put(ROLE_PATH(PROBE_ID), { data: { name: 'ab' } }),
			request.put(ROLE_PATH(PROBE_ID), { data: { description: 'a'.repeat(501) } }),
			request.delete(ROLE_PATH(PROBE_ID)),
			request.delete(`${ROLE_PATH(PROBE_ID)}?hard=true`)
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`GET / PUT / DELETE ${ROLE_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({
		request
	}) => {
		const getBaseline = await request.get(ROLE_PATH(PROBE_ID));
		const putBaseline = await request.put(ROLE_PATH(PROBE_ID));
		const deleteBaseline = await request.delete(ROLE_PATH(PROBE_ID));

		const getResponses = await Promise.all(ROLE_IDS.map((id) => request.get(ROLE_PATH(id))));
		const putResponses = await Promise.all(ROLE_IDS.map((id) => request.put(ROLE_PATH(id))));
		const deleteResponses = await Promise.all(ROLE_IDS.map((id) => request.delete(ROLE_PATH(id))));

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

	test(`PUT ${ROLE_PATH(PROBE_ID)} has a stable status across body permutations`, async ({ request }) => {
		const baseline = await request.put(ROLE_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(ROLE_PATH(PROBE_ID), { data: {} }),
			request.put(ROLE_PATH(PROBE_ID), { data: { name: 'Valid' } }),
			request.put(ROLE_PATH(PROBE_ID), { data: { name: '   ' } }),
			request.put(ROLE_PATH(PROBE_ID), { data: { name: 'ab' } }),
			request.put(ROLE_PATH(PROBE_ID), { data: { description: 'a'.repeat(501) } }),
			request.put(ROLE_PATH(PROBE_ID), { data: { isAdmin: true } }),
			request.put(ROLE_PATH(PROBE_ID), { data: { status: 'active' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`DELETE ${ROLE_PATH(PROBE_ID)} has a stable status across distinct ?hard query shapes`, async ({
		request
	}) => {
		// On the auth branch, `?hard=true` flips the
		// soft-delete (`'Role deleted (marked as
		// inactive)'`) and hard-delete (`'Role
		// permanently deleted'`) messages. On the unauth
		// branch the gate fires before any query parse,
		// so every `?hard=` shape must round-trip to the
		// same 401 status.
		const baseline = await request.delete(ROLE_PATH(PROBE_ID));
		const responses = await Promise.all(
			DELETE_QUERIES.map(({ qs }) => request.delete(`${ROLE_PATH(PROBE_ID)}${qs}`))
		);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET / PUT / DELETE ${ROLE_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(ROLE_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(ROLE_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(ROLE_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.put(ROLE_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(ROLE_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(ROLE_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.delete(ROLE_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(ROLE_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(ROLE_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${ROLE_PATH(PROBE_ID)} cross-method probe (POST / PATCH) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(ROLE_PATH(PROBE_ID)),
			request.patch(ROLE_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${ROLE_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.put(ROLE_PATH(PROBE_ID), { data: 'not-json' }),
			request.put(ROLE_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.put(ROLE_PATH(PROBE_ID), { data: '{"name":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / PUT / DELETE ${ROLE_PATH(PROBE_ID)} service / repository call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders any of the
		// `roleRepository.findById(...)` /
		// `roleRepository.update(...)` /
		// `roleRepository.delete(...)` /
		// `roleRepository.hardDelete(...)` calls before
		// the gate would surface here.
		const responses = await Promise.all([
			request.get(ROLE_PATH(PROBE_ID)),
			request.put(ROLE_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(ROLE_PATH(PROBE_ID)),
			request.delete(`${ROLE_PATH(PROBE_ID)}?hard=true`)
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`PUT ${ROLE_PATH(PROBE_ID)} three-step body validation chain is NOT evaluated on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, every step-(a)/(b)/(c)
		// probe triggers a distinct 400 envelope. On the
		// unauth branch every shape must round-trip to
		// the same 401 status.
		const baseline = await request.put(ROLE_PATH(PROBE_ID));
		const responses = await Promise.all([
			// (a) probes
			request.put(ROLE_PATH(PROBE_ID), { data: { name: '   ' } }),
			request.put(ROLE_PATH(PROBE_ID), { data: { name: '' } }),
			// (b) probes
			request.put(ROLE_PATH(PROBE_ID), { data: { name: 'ab' } }),
			request.put(ROLE_PATH(PROBE_ID), { data: { name: 'a'.repeat(101) } }),
			// (c) probes
			request.put(ROLE_PATH(PROBE_ID), { data: { description: 'a'.repeat(501) } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`DELETE ${ROLE_PATH(PROBE_ID)} hard-delete branch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, `?hard=true` flips the
		// service call from `roleRepository.delete(id)`
		// to `roleRepository.hardDelete(id)` and the
		// success message from 'Role deleted (marked as
		// inactive)' to 'Role permanently deleted'. The
		// unauth branch must NEVER reach either branch,
		// so the unauth response must NEVER echo either
		// success message.
		const responses = await Promise.all([
			request.delete(ROLE_PATH(PROBE_ID)),
			request.delete(`${ROLE_PATH(PROBE_ID)}?hard=true`),
			request.delete(`${ROLE_PATH(PROBE_ID)}?hard=false`)
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.message).not.toBe('Role deleted (marked as inactive)');
			expect(body.message).not.toBe('Role permanently deleted');
		}
	});
});
