import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multi-method / dynamic-id /
 * body / header surface** of the admin-only single-comment
 * CRUD endpoint served by
 * `apps/web/app/api/admin/comments/[id]/route.ts`.
 *
 * `GET /api/admin/comments/{id}`,
 * `PUT /api/admin/comments/{id}`, and
 * `DELETE /api/admin/comments/{id}` are the **first**
 * admin-tree routes the smoke layer covers as a triple-
 * method export that combines:
 *   - the **403-on-unauth gate** (every prior triple-
 *     method admin smoke returns 401; only the
 *     `admin/reports/[id]` dual-method route shares the
 *     403 posture), AND
 *   - a **`getTenantId()` post-gate tenant-resolution
 *     branch** that returns 403 `'Tenant not found'` if
 *     missing (distinct from the
 *     `session.user.tenantId` direct access used by
 *     `admin/notifications/...`), AND
 *   - **inline Drizzle queries** with `leftJoin` to the
 *     `clientProfiles` table and explicit tenant scoping
 *     (rather than a repository class or query function),
 *     AND
 *   - a **soft-delete-aware existence check**
 *     (`existingComment.deletedAt` → 404 `'Comment not
 *     found'`) on PUT and DELETE.
 *
 * All three handlers share:
 *   1. **Single-step inline `!session?.user?.isAdmin`
 *      gate** that returns **403 `{ success: false,
 *      error: 'Forbidden' }`** on the unauth branch —
 *      matching the sibling `admin/reports/[id]` dual-
 *      method route.
 *   2. **`success: false` envelope key** on the 403
 *      branch with strict envelope-shape
 *      `Object.keys(body).sort() === ['error',
 *      'success']`.
 *   3. **Dynamic `[id]` segment** resolved AFTER the
 *      gate.
 *   4. **`console.error('Failed to <verb> comment:',
 *      error)` + 500 `'Internal Server Error'` catch**
 *      with handler-specific log prefixes.
 *
 * Each handler also has its own divergent post-gate
 * surface:
 *
 *   GET:
 *     - **`getTenantId()` post-gate tenant resolution**
 *       AFTER `await params` → 403 `'Tenant not found'`
 *       if missing.
 *     - Inline Drizzle query with `leftJoin` to
 *       `clientProfiles` and `where(and(eq(comments.id,
 *       id), eq(comments.tenantId, tenantId)))`.
 *     - 404 `'Comment not found'` on `result.length ===
 *       0 || result[0].createdAt === null`.
 *     - Success payload `{ success: true, data:
 *       <comment-with-user> }` where the `user` object
 *       has `{ id, name, email, image }` keys with a
 *       `'Unknown User'` fallback.
 *
 *   PUT:
 *     - **`getTenantId()` post-gate tenant resolution**
 *       BEFORE `await params` (NOTE: the order is gate
 *       → tenantId → params → body, distinct from the
 *       GET handler which orders gate → params →
 *       tenantId).
 *     - JSON body parse via `await request.json()`
 *       AFTER tenant resolution.
 *     - `content?.trim()` validation → 400 `'Content
 *       is required'` if falsy.
 *     - `getCommentById(id)` existence check → 404
 *       `'Comment not found'` if missing OR
 *       `existingComment.deletedAt` (soft-delete-
 *       aware).
 *     - **Inline Drizzle re-query** with the same
 *       leftJoin to `clientProfiles` (the actual
 *       `updateComment` call is commented out in the
 *       source — the route currently re-fetches the
 *       comment without updating it; a regression-
 *       sensitive note).
 *     - Success payload `{ success: true, data:
 *       <comment-with-user>, message: 'Comment
 *       updated successfully' }`.
 *
 *   DELETE:
 *     - **NO `getTenantId()` call** (distinct from GET
 *       and PUT — DELETE skips the tenant-resolution
 *       branch entirely).
 *     - `getCommentById(id)` existence check → 404
 *       `'Comment not found'` if missing OR
 *       `comment.deletedAt` (soft-delete-aware).
 *     - `deleteComment(id)` (soft delete via setting
 *       `deletedAt`).
 *     - Success payload `{ success: true, message:
 *       'Comment deleted successfully' }` (NO `data`
 *       key).
 *
 * Where the immediately-preceding 403-on-unauth dual-
 * method `admin-reports-id-method.spec.ts` walks a route
 * with `checkDatabaseAvailability()` pre-gate, this spec
 * walks a 403-on-unauth triple-method route with
 * `getTenantId()` post-gate tenant resolution and inline
 * Drizzle queries — a complementary 403-on-unauth
 * surface that no prior admin-tree smoke spec covers.
 */
const COMMENT_IDS = [
	'comment_1',
	'comment_test',
	'comment-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const COMMENT_PATH = (id: string) => `/api/admin/comments/${id}`;
const PROBE_ID = COMMENT_IDS[0];

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

	// content validation probes.
	{ data: { content: '' }, label: 'empty content (would 400 if reachable)' },
	{ data: { content: '   ' }, label: 'whitespace-only content (would 400 if reachable)' },
	{ data: { content: null }, label: 'null content (would 400 if reachable)' },
	{ data: { content: 'Updated content' }, label: 'valid content update' },
	{ data: { content: 'a'.repeat(5_000) }, label: 'long content update' },

	// Bypass attempts.
	{ data: { isAdmin: true, content: 'pwn' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', content: 'pwn' }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', content: 'pwn' }, label: 'fabricated userId attempt' },
	{ data: { padding: 'x'.repeat(2_000), content: 'pwn' }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Tenant not found',
	'Comment not found',
	'Content is required',
	'Internal Server Error',
	'Comment updated successfully',
	'Comment deleted successfully'
] as const;

const FORBIDDEN_403_MESSAGE = 'Forbidden';

test.describe('API: /api/admin/comments/[id] GET / PUT / DELETE method / id / body / header surface', () => {
	for (const id of COMMENT_IDS) {
		test(`GET ${COMMENT_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.get(COMMENT_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${COMMENT_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.put(COMMENT_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${COMMENT_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.delete(COMMENT_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of COMMON_HEADERS) {
		test(`GET ${COMMENT_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(COMMENT_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${COMMENT_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(COMMENT_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${COMMENT_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(COMMENT_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${COMMENT_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(COMMENT_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${COMMENT_PATH(PROBE_ID)} returns 403 with the Forbidden envelope (NOT 401)`, async ({ request }) => {
		const response = await request.get(COMMENT_PATH(PROBE_ID));
		expect(response.status()).toBe(403);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: FORBIDDEN_403_MESSAGE });
	});

	test(`PUT ${COMMENT_PATH(PROBE_ID)} returns 403 with the Forbidden envelope (NOT 401)`, async ({ request }) => {
		const response = await request.put(COMMENT_PATH(PROBE_ID));
		expect(response.status()).toBe(403);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: FORBIDDEN_403_MESSAGE });
	});

	test(`DELETE ${COMMENT_PATH(PROBE_ID)} returns 403 with the Forbidden envelope (NOT 401)`, async ({ request }) => {
		const response = await request.delete(COMMENT_PATH(PROBE_ID));
		expect(response.status()).toBe(403);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: FORBIDDEN_403_MESSAGE });
	});

	test(`GET / PUT / DELETE ${COMMENT_PATH(PROBE_ID)} unauth response is NEVER 401`, async ({ request }) => {
		const responses = await Promise.all([
			request.get(COMMENT_PATH(PROBE_ID)),
			request.put(COMMENT_PATH(PROBE_ID)),
			request.delete(COMMENT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).not.toBe(401);
			expect(response.status()).toBe(403);
		}
	});

	test(`GET / PUT / DELETE ${COMMENT_PATH(PROBE_ID)} envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(COMMENT_PATH(PROBE_ID)),
			request.put(COMMENT_PATH(PROBE_ID)),
			request.delete(COMMENT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(403);
			const body = await response.json();
			expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		}
	});

	test(`GET / PUT / DELETE ${COMMENT_PATH(PROBE_ID)} share the SAME 403 envelope shape on the unauth branch`, async ({
		request
	}) => {
		const [getResponse, putResponse, deleteResponse] = await Promise.all([
			request.get(COMMENT_PATH(PROBE_ID)),
			request.put(COMMENT_PATH(PROBE_ID)),
			request.delete(COMMENT_PATH(PROBE_ID))
		]);

		const [getBody, putBody, deleteBody] = await Promise.all([
			getResponse.json(),
			putResponse.json(),
			deleteResponse.json()
		]);

		expect(getBody).toEqual(putBody);
		expect(getBody).toEqual(deleteBody);
	});

	test(`GET / PUT / DELETE ${COMMENT_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// GET success: { success: true, data: <comment-with-user> }.
		// PUT success: { success: true, data: <comment-with-user>, message: 'Comment updated successfully' }.
		// DELETE success: { success: true, message: 'Comment deleted successfully' }.
		const responses = await Promise.all([
			request.get(COMMENT_PATH(PROBE_ID)),
			request.put(COMMENT_PATH(PROBE_ID), { data: { content: 'Updated' } }),
			request.delete(COMMENT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${COMMENT_PATH(PROBE_ID)} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(COMMENT_PATH(PROBE_ID)),
			request.put(COMMENT_PATH(PROBE_ID)),
			request.put(COMMENT_PATH(PROBE_ID), { data: {} }),
			request.put(COMMENT_PATH(PROBE_ID), { data: { content: '' } }),
			request.put(COMMENT_PATH(PROBE_ID), { data: { content: 'Updated' } }),
			request.delete(COMMENT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`GET / PUT / DELETE ${COMMENT_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({
		request
	}) => {
		const getBaseline = await request.get(COMMENT_PATH(PROBE_ID));
		const putBaseline = await request.put(COMMENT_PATH(PROBE_ID));
		const deleteBaseline = await request.delete(COMMENT_PATH(PROBE_ID));

		const getResponses = await Promise.all(COMMENT_IDS.map((id) => request.get(COMMENT_PATH(id))));
		const putResponses = await Promise.all(COMMENT_IDS.map((id) => request.put(COMMENT_PATH(id))));
		const deleteResponses = await Promise.all(COMMENT_IDS.map((id) => request.delete(COMMENT_PATH(id))));

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

	test(`PUT ${COMMENT_PATH(PROBE_ID)} has a stable status across body permutations`, async ({ request }) => {
		const baseline = await request.put(COMMENT_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(COMMENT_PATH(PROBE_ID), { data: {} }),
			request.put(COMMENT_PATH(PROBE_ID), { data: { content: '' } }),
			request.put(COMMENT_PATH(PROBE_ID), { data: { content: 'Updated' } }),
			request.put(COMMENT_PATH(PROBE_ID), { data: { content: '   ' } }),
			request.put(COMMENT_PATH(PROBE_ID), { data: { isAdmin: true, content: 'pwn' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET / PUT / DELETE ${COMMENT_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(COMMENT_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(COMMENT_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(COMMENT_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.put(COMMENT_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(COMMENT_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(COMMENT_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.delete(COMMENT_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(COMMENT_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(COMMENT_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${COMMENT_PATH(PROBE_ID)} cross-method probe (POST / PATCH) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(COMMENT_PATH(PROBE_ID)),
			request.patch(COMMENT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${COMMENT_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.put(COMMENT_PATH(PROBE_ID), { data: 'not-json' }),
			request.put(COMMENT_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.put(COMMENT_PATH(PROBE_ID), { data: '{"content":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / PUT / DELETE ${COMMENT_PATH(PROBE_ID)} service / Drizzle query is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders any of the inline
		// Drizzle queries / `getCommentById(...)` /
		// `deleteComment(...)` / `getTenantId()` calls
		// before the gate would surface here.
		const responses = await Promise.all([
			request.get(COMMENT_PATH(PROBE_ID)),
			request.put(COMMENT_PATH(PROBE_ID), { data: { content: 'pwn' } }),
			request.delete(COMMENT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
		}
	});

	test(`GET / PUT ${COMMENT_PATH(PROBE_ID)} tenant-resolution branch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, GET and PUT (but NOT DELETE)
		// call `getTenantId()` after the auth gate. A
		// missing tenant returns 403 'Tenant not found'.
		// The unauth branch must NEVER reach this branch,
		// so the unauth response must NEVER echo
		// 'Tenant not found'.
		const responses = await Promise.all([
			request.get(COMMENT_PATH(PROBE_ID)),
			request.put(COMMENT_PATH(PROBE_ID), { data: { content: 'pwn' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Tenant not found');
			expect(body.error).toBe(FORBIDDEN_403_MESSAGE);
		}
	});
});
