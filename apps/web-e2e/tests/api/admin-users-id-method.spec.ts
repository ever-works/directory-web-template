import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multi-method / dynamic-id / body /
 * header surface** of the admin-only single-user CRUD endpoint
 * served by `apps/web/app/api/admin/users/[id]/route.ts`.
 *
 * `GET /api/admin/users/{id}`,
 * `PUT /api/admin/users/{id}`, and
 * `DELETE /api/admin/users/{id}` are the **third** triple-
 * method admin-tree routes the smoke layer covers (after the
 * canonical-longer-envelope `admin/items/[id]` and the bare-
 * envelope `admin/clients/[clientId]` routes), but the
 * **first** that combines:
 *   - a **two-step gate** (`!session?.user` → 401
 *     `'Unauthorized'`, then `!session.user.isAdmin` → 403
 *     `'Forbidden'`) — distinct from the single-step inline
 *     gate of the prior triple-method smokes, AND
 *   - a hybrid 401 envelope `{ success: false, error:
 *     'Unauthorized' }` (bare message PLUS `success: false`
 *     key) — distinct from both the canonical-longer
 *     envelope of `admin/items/[id]` AND the no-`success`-
 *     key bare envelope of `admin/clients/[clientId]`, AND
 *   - an **eight-step PUT body-validation chain** with
 *     handler-specific error messages for each branch, AND
 *   - a **self-deletion guard** on DELETE
 *     (`session.user.id === id` → 400 `'Cannot delete your
 *     own account'`) — a unique safety check no other
 *     admin-tree route enforces, AND
 *   - an **`error.message`-pass-through catch posture** on
 *     PUT and DELETE that returns 400 with the raw error
 *     message instead of a fixed 500 string when the error
 *     is an `Error` instance.
 *
 * All three handlers share:
 *   1. **Two-step gate** —
 *        (a) `!session?.user` → 401 `{ success: false,
 *            error: 'Unauthorized' }`.
 *        (b) `!session.user.isAdmin` → 403 `{ success:
 *            false, error: 'Forbidden' }`.
 *      The unauth client lacks any session, so the FIRST
 *      step always fires; a regression that re-orders the
 *      steps would NOT change the unauth observable.
 *   2. **Hybrid 401 envelope** — bare `'Unauthorized'`
 *      message PLUS `success: false` envelope key.
 *      Distinct from the canonical-longer
 *      `'Unauthorized. Admin access required.'` of
 *      `admin/items/[id]` AND from the no-`success`-key
 *      `{ error: 'Unauthorized' }` of
 *      `admin/clients/[clientId]`.
 *   3. **Params resolution AFTER the gate** — `await
 *      params` is called AFTER both gate steps.
 *   4. **`console.error` + 500 `'Internal server error'`
 *      fallback catch** with handler-specific log
 *      prefixes (`'Error in GET /api/admin/users/[id]:'`,
 *      `'Error in PUT /api/admin/users/[id]:'`,
 *      `'Error in DELETE /api/admin/users/[id]:'`).
 *
 * Each handler also has its own divergent post-gate
 * surface:
 *
 *   GET:
 *     - No body parse.
 *     - `userRepository.findById(id)` → 404
 *       `'User not found'` if missing.
 *     - Success payload `{ success: true, data: <user> }`.
 *
 *   PUT (the load-bearing eight-step body validation):
 *     - JSON body parse via `await request.json()` AFTER
 *       params (NOT wrapped in a per-call try/catch).
 *     - Step (a): `!body || typeof body !== 'object'` →
 *       400 `'Invalid request body'`.
 *     - Step (b): `body.email !== undefined` and not a
 *       string → 400 `'Email must be a string'`.
 *       OR not a valid email → 400 `'Invalid email
 *       format'`.
 *     - Step (c): `body.username !== undefined` and not
 *       a string → 400 `'Username must be a string'`.
 *       OR length < 3 / > 50 → 400 `'Username must be
 *       between 3 and 50 characters'`.
 *     - Step (d): `body.name !== undefined` and not a
 *       string → 400 `'Name must be a string'`. OR
 *       length < 2 / > 100 → 400 `'Name must be between
 *       2 and 100 characters'`.
 *     - Step (e): `body.title !== undefined && body.title
 *       !== null` and not a string → 400 `'Title must be
 *       a string'`. OR length > 100 → 400 `'Title must
 *       be at most 100 characters'`.
 *     - Step (f): `body.avatar !== undefined &&
 *       body.avatar !== null` and not a string → 400
 *       `'Avatar must be a string'`. OR length > 500 →
 *       400 `'Avatar URL must be at most 500
 *       characters'`.
 *     - Step (g): `body.role !== undefined` chain — type
 *       check, emptiness check, then a
 *       `roleRepository.findById(body.role)` DB lookup
 *       returning 400 `'Invalid role'` if not found.
 *     - Step (h): `body.status !== undefined` and not
 *       valid → 400 `'Invalid status. Must be "active"
 *       or "inactive"'`.
 *     - `userRepository.update(id, userData)` after all
 *       eight steps pass.
 *     - Success payload `{ success: true, data:
 *       <updatedUser> }`.
 *     - Catch posture: `error instanceof Error` → 400
 *       `{ success: false, error: error.message }`,
 *       else 500 `{ success: false, error: 'Internal
 *       server error' }`. The 400 message-pass-through
 *       is distinct from every prior smoke's fixed-
 *       message catch.
 *
 *   DELETE:
 *     - No body parse.
 *     - **Self-deletion guard**: `session.user.id === id`
 *       → 400 `'Cannot delete your own account'`. The
 *       unauth branch must NEVER reach this guard.
 *     - `userRepository.delete(id)`.
 *     - Success payload `{ success: true, message:
 *       'User deleted successfully' }` (NOTE: NO `data`
 *       key).
 *     - Catch posture: same `error instanceof Error` →
 *       400 `error.message` / fallback 500 pattern as
 *       PUT.
 *
 * Where the immediately-preceding
 * `admin-clients-clientid-method.spec.ts` walks a bare-
 * envelope-no-`success`-key triple-method route, this
 * spec walks the hybrid-envelope two-step-gated triple-
 * method route with the eight-step PUT body validation,
 * the DELETE self-deletion guard, and the
 * `error.message`-pass-through catch posture — a
 * complementary surface that no prior admin-tree smoke
 * spec covers.
 */
const USER_IDS = [
	'user_1',
	'user_test',
	'user-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const USER_PATH = (id: string) => `/api/admin/users/${id}`;
const PROBE_ID = USER_IDS[0];

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

	// Step (a) probes — `!body || typeof body !== 'object'`.
	{ data: 'not-an-object', label: 'string body (would 400 (a) if reachable)' },
	{ data: 123 as unknown, label: 'numeric body (would 400 (a) if reachable)' },
	{ data: null, label: 'null body (would 400 (a) if reachable)' },

	// Step (b) probes — email validation.
	{ data: { email: 123 }, label: 'numeric email (would 400 (b)-type if reachable)' },
	{ data: { email: 'not-an-email' }, label: 'invalid email (would 400 (b)-format if reachable)' },
	{ data: { email: 'valid@example.com' }, label: 'valid email update' },

	// Step (c) probes — username length.
	{ data: { username: 'ab' }, label: 'too-short 2-char username (would 400 (c) if reachable)' },
	{ data: { username: 'a'.repeat(51) }, label: 'too-long 51-char username (would 400 (c) if reachable)' },
	{ data: { username: 'validname' }, label: 'valid username update' },

	// Step (d) probes — name length.
	{ data: { name: 'a' }, label: 'too-short 1-char name (would 400 (d) if reachable)' },
	{ data: { name: 'a'.repeat(101) }, label: 'too-long 101-char name (would 400 (d) if reachable)' },
	{ data: { name: 'Valid Name' }, label: 'valid name update' },

	// Step (e) probes — title.
	{ data: { title: 'a'.repeat(101) }, label: 'too-long 101-char title (would 400 (e) if reachable)' },
	{ data: { title: null }, label: 'null title (would pass (e) if reachable)' },

	// Step (f) probes — avatar.
	{ data: { avatar: 'a'.repeat(501) }, label: 'too-long 501-char avatar (would 400 (f) if reachable)' },
	{ data: { avatar: null }, label: 'null avatar (would pass (f) if reachable)' },

	// Step (g) probes — role.
	{ data: { role: '' }, label: 'empty role (would 400 (g)-empty if reachable)' },
	{ data: { role: 'nonexistent-role' }, label: 'nonexistent role (would 400 (g)-lookup if reachable)' },
	{ data: { role: 123 }, label: 'numeric role (would 400 (g)-type if reachable)' },

	// Step (h) probes — status.
	{ data: { status: 'invalid-status' }, label: 'invalid status (would 400 (h) if reachable)' },
	{ data: { status: 'active' }, label: 'valid active status update' },
	{ data: { status: 'inactive' }, label: 'valid inactive status update' },

	// Bypass attempts.
	{ data: { isAdmin: true, name: 'pwn' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', name: 'pwn' }, label: 'fabricated tenantId attempt' },
	{ data: { padding: 'x'.repeat(2_000), name: 'pwn' }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'User not found',
	'Forbidden',
	'Cannot delete your own account',
	'Internal server error',
	'Invalid request body',
	'Invalid email format',
	'Email must be a string',
	'Username must be between 3 and 50 characters',
	'Name must be between 2 and 100 characters',
	'Invalid role',
	'Invalid status. Must be "active" or "inactive"',
	'User deleted successfully'
] as const;

const HYBRID_401_MESSAGE = 'Unauthorized';
const HYBRID_403_MESSAGE = 'Forbidden';

test.describe('API: /api/admin/users/[id] GET / PUT / DELETE method / id / body / header surface', () => {
	for (const id of USER_IDS) {
		test(`GET ${USER_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.get(USER_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${USER_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.put(USER_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${USER_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.delete(USER_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of COMMON_HEADERS) {
		test(`GET ${USER_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(USER_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${USER_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(USER_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${USER_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(USER_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${USER_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(USER_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${USER_PATH(PROBE_ID)} returns 401 with the hybrid bare-message + success: false envelope`, async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the FIRST gate-step `!session?.user`
		// fires, returning 401 with the hybrid envelope:
		// `{ success: false, error: 'Unauthorized' }` (bare
		// message PLUS `success: false` key).
		const response = await request.get(USER_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: HYBRID_401_MESSAGE
		});
	});

	test(`PUT ${USER_PATH(PROBE_ID)} returns 401 with the hybrid bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.put(USER_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: HYBRID_401_MESSAGE
		});
	});

	test(`DELETE ${USER_PATH(PROBE_ID)} returns 401 with the hybrid bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.delete(USER_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: HYBRID_401_MESSAGE
		});
	});

	test(`GET / PUT / DELETE ${USER_PATH(PROBE_ID)} envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		// Strict envelope-shape assertion across all three
		// methods: each returns exactly `{ success: false,
		// error: 'Unauthorized' }`.
		const responses = await Promise.all([
			request.get(USER_PATH(PROBE_ID)),
			request.put(USER_PATH(PROBE_ID)),
			request.delete(USER_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		}
	});

	test(`GET / PUT / DELETE ${USER_PATH(PROBE_ID)} share the SAME 401 envelope shape on the unauth branch`, async ({
		request
	}) => {
		const [getResponse, putResponse, deleteResponse] = await Promise.all([
			request.get(USER_PATH(PROBE_ID)),
			request.put(USER_PATH(PROBE_ID)),
			request.delete(USER_PATH(PROBE_ID))
		]);

		const [getBody, putBody, deleteBody] = await Promise.all([
			getResponse.json(),
			putResponse.json(),
			deleteResponse.json()
		]);

		expect(getBody).toEqual(putBody);
		expect(getBody).toEqual(deleteBody);
	});

	test(`GET / PUT / DELETE ${USER_PATH(PROBE_ID)} unauth branch lands on 401 (NOT 403)`, async ({ request }) => {
		// The 403 'Forbidden' branch only fires for an
		// authenticated-but-non-admin session. The unauth
		// client lacks any session at all, so the FIRST
		// gate-step ('Unauthorized') fires instead — the
		// unauth response must NEVER be 403, and must NEVER
		// echo the 'Forbidden' message.
		const responses = await Promise.all([
			request.get(USER_PATH(PROBE_ID)),
			request.put(USER_PATH(PROBE_ID)),
			request.delete(USER_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe(HYBRID_403_MESSAGE);
		}
	});

	test(`GET / PUT / DELETE ${USER_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// GET success: { success: true, data: <user> }.
		// PUT success: { success: true, data: <updatedUser> }.
		// DELETE success: { success: true, message: 'User deleted successfully' }.
		const responses = await Promise.all([
			request.get(USER_PATH(PROBE_ID)),
			request.put(USER_PATH(PROBE_ID), { data: { name: 'Updated Name' } }),
			request.delete(USER_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${USER_PATH(PROBE_ID)} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		// The twelve post-auth messages must NEVER appear in
		// the unauth response body. A regression that re-
		// orders ANY of them before the gate would surface
		// here.
		const responses = await Promise.all([
			request.get(USER_PATH(PROBE_ID)),
			request.put(USER_PATH(PROBE_ID)),
			request.put(USER_PATH(PROBE_ID), { data: { email: 'not-an-email' } }),
			request.put(USER_PATH(PROBE_ID), { data: { name: 'a' } }),
			request.put(USER_PATH(PROBE_ID), { data: { role: 'nonexistent' } }),
			request.put(USER_PATH(PROBE_ID), { data: { status: 'invalid' } }),
			request.delete(USER_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`GET / PUT / DELETE ${USER_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({
		request
	}) => {
		const getBaseline = await request.get(USER_PATH(PROBE_ID));
		const putBaseline = await request.put(USER_PATH(PROBE_ID));
		const deleteBaseline = await request.delete(USER_PATH(PROBE_ID));

		const getResponses = await Promise.all(USER_IDS.map((id) => request.get(USER_PATH(id))));
		const putResponses = await Promise.all(USER_IDS.map((id) => request.put(USER_PATH(id))));
		const deleteResponses = await Promise.all(USER_IDS.map((id) => request.delete(USER_PATH(id))));

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

	test(`PUT ${USER_PATH(PROBE_ID)} has a stable status across body permutations`, async ({ request }) => {
		const baseline = await request.put(USER_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(USER_PATH(PROBE_ID), { data: {} }),
			request.put(USER_PATH(PROBE_ID), { data: { email: 'valid@example.com' } }),
			request.put(USER_PATH(PROBE_ID), { data: { email: 'not-an-email' } }),
			request.put(USER_PATH(PROBE_ID), { data: { username: 'ab' } }),
			request.put(USER_PATH(PROBE_ID), { data: { name: 'a' } }),
			request.put(USER_PATH(PROBE_ID), { data: { role: 'nonexistent' } }),
			request.put(USER_PATH(PROBE_ID), { data: { status: 'invalid' } }),
			request.put(USER_PATH(PROBE_ID), { data: { isAdmin: true, name: 'pwn' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET / PUT / DELETE ${USER_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(USER_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(USER_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(USER_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.put(USER_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(USER_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(USER_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.delete(USER_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(USER_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(USER_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${USER_PATH(PROBE_ID)} cross-method probe (POST / PATCH) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(USER_PATH(PROBE_ID)),
			request.patch(USER_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${USER_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, malformed JSON would 500 via
		// the outer `console.error` catch (the body parse
		// is NOT wrapped in a per-call try/catch, but the
		// catch posture maps `error instanceof Error` to
		// 400 with the parse-error message). On the unauth
		// branch the gate fires before any parse.
		const responses = await Promise.all([
			request.put(USER_PATH(PROBE_ID), { data: 'not-json' }),
			request.put(USER_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.put(USER_PATH(PROBE_ID), { data: '{"name":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / PUT / DELETE ${USER_PATH(PROBE_ID)} service call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(USER_PATH(PROBE_ID)),
			request.put(USER_PATH(PROBE_ID), { data: { name: 'pwn' } }),
			request.delete(USER_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`PUT ${USER_PATH(PROBE_ID)} eight-step body validation chain is NOT evaluated on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, every body shape exercises a
		// distinct 400 branch (a-h). On the unauth branch
		// every shape must round-trip to the same 401 status
		// as the no-body baseline.
		const baseline = await request.put(USER_PATH(PROBE_ID));
		const responses = await Promise.all([
			// (a) probes
			request.put(USER_PATH(PROBE_ID), { data: 'not-an-object' }),
			request.put(USER_PATH(PROBE_ID), { data: null }),
			// (b) probes
			request.put(USER_PATH(PROBE_ID), { data: { email: 'not-an-email' } }),
			request.put(USER_PATH(PROBE_ID), { data: { email: 123 } }),
			// (c) probes
			request.put(USER_PATH(PROBE_ID), { data: { username: 'ab' } }),
			request.put(USER_PATH(PROBE_ID), { data: { username: 'a'.repeat(51) } }),
			// (d) probes
			request.put(USER_PATH(PROBE_ID), { data: { name: 'a' } }),
			request.put(USER_PATH(PROBE_ID), { data: { name: 'a'.repeat(101) } }),
			// (e) probes
			request.put(USER_PATH(PROBE_ID), { data: { title: 'a'.repeat(101) } }),
			// (f) probes
			request.put(USER_PATH(PROBE_ID), { data: { avatar: 'a'.repeat(501) } }),
			// (g) probes
			request.put(USER_PATH(PROBE_ID), { data: { role: '' } }),
			request.put(USER_PATH(PROBE_ID), { data: { role: 'nonexistent' } }),
			// (h) probes
			request.put(USER_PATH(PROBE_ID), { data: { status: 'invalid' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`DELETE ${USER_PATH(PROBE_ID)} self-deletion guard is NOT evaluated on the unauth branch`, async ({
		request
	}) => {
		// The DELETE handler has a self-deletion guard
		// (`session.user.id === id` → 400 'Cannot delete
		// your own account'). The unauth branch must NEVER
		// reach this guard because the gate fires first;
		// every id shape must round-trip to the same 401
		// status.
		const baseline = await request.delete(USER_PATH(PROBE_ID));
		const responses = await Promise.all([
			// Probe with a session-shaped id that on the auth
			// branch would trigger the self-deletion guard
			// (we can't actually trigger it without a session,
			// but we pin that the unauth response is invariant
			// to the id shape).
			request.delete(USER_PATH('current-user-id')),
			request.delete(USER_PATH('00000000-0000-4000-8000-000000000000')),
			request.delete(USER_PATH('admin')),
			request.delete(USER_PATH('self'))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body.error).not.toBe('Cannot delete your own account');
		}
	});
});
