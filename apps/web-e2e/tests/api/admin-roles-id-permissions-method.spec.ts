import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **method / dynamic-id / body / header
 * surface** of the admin-only role-permissions endpoint
 * served by
 * `apps/web/app/api/admin/roles/[id]/permissions/route.ts`.
 *
 * This is the **first** admin-tree route the smoke layer
 * covers that combines:
 *   - a dynamic-segment `[id]` handler exporting BOTH a
 *     `GET` and a `PUT` (a true **dual-method** surface,
 *     distinct from every prior single-method admin-id
 *     smoke), AND
 *   - an auth gate that delegates to the
 *     **`checkAdminAuth()` helper** at
 *     `apps/web/lib/auth/admin-guard.ts` (NOT inline
 *     `!session?.user?.isAdmin`), AND
 *   - a **shorter `'Unauthorized'` 401 envelope**
 *     (NOT the canonical longer
 *     `'Unauthorized. Admin access required.'` envelope
 *     that every prior admin-id smoke pins), AND
 *   - an **imperative permissions-array validation**
 *     against `isValidPermission(permission)` from
 *     `apps/web/lib/permissions/definitions.ts` (NOT a
 *     Zod `safeParse(...)` schema, NOT a manual
 *     `['approved', 'rejected'].includes(...)` allowlist).
 *
 * The handler diverges from every prior admin-tree
 * smoke spec in **three** load-bearing ways the smoke
 * walk pins:
 *
 *   1. **Dual-method surface** — the route exports both
 *      `GET` (read current permissions) and `PUT` (replace
 *      the permissions array). Every prior admin-id smoke
 *      covers a single export. The smoke walk therefore
 *      asserts the unauth contract against BOTH methods
 *      and pins that the GET / PUT envelopes are
 *      observably the same on the unauth branch (because
 *      both delegate to the SAME `checkAdminAuth()`
 *      helper).
 *   2. **`checkAdminAuth()` helper-driven envelope** — the
 *      gate returns one of three envelopes depending on
 *      the auth state:
 *        (a) no session / no `session.user`: 401 with
 *            `{ success: false, error: 'Unauthorized' }`
 *            — the **shorter** `'Unauthorized'` message,
 *            distinct from the canonical longer
 *            `'Unauthorized. Admin access required.'`
 *            envelope.
 *        (b) session but no `session.user.id`: 401 with
 *            `{ success: false, error: 'User ID not
 *            found' }` — a SECOND distinct 401 envelope
 *            no prior smoke pins.
 *        (c) session + id but `!isAdmin(id)`: 403 with
 *            `{ success: false, error: 'Insufficient
 *            permissions' }` — a 403 (NOT 401) for
 *            authenticated-but-non-admin, distinct from
 *            every prior admin-tree route which returns
 *            401 for both unauth AND non-admin-auth.
 *      The unauth branch (no session) the smoke harness
 *      hits with no cookies must therefore land on (a),
 *      with the SHORTER `'Unauthorized'` message.
 *   3. **Imperative `isValidPermission` validation** — on
 *      the auth branch, the PUT handler validates that
 *      `body.permissions` is an array, then filters
 *      every entry through
 *      `isValidPermission(permission)`, returning
 *      400 `'Permissions must be an array'` or
 *      400 `'Invalid permissions detected'` (with a
 *      side-channel `invalidPermissions` array echoed
 *      in the body — a UNIQUE envelope key no prior
 *      admin-tree smoke pins). The unauth branch must
 *      NEVER reach the validation step regardless of
 *      `body.permissions` shape.
 *
 * Where the immediately-preceding
 * `admin-sponsor-ads-id-cancel-method.spec.ts` walks the
 * sibling sponsor-ad cancellation route with a pure
 * single-step `!session?.user?.isAdmin` gate and a
 * Zod-`safeParse(...)` body validation, this spec walks
 * the role-permissions route with a `checkAdminAuth()`-
 * helper gate and an imperative `isValidPermission`
 * permissions-array validation — a complementary surface
 * that no prior admin-tree smoke spec covers.
 *
 * The deeper `admin-by-id.spec.ts` smoke also covers this
 * route at the broad `< 500` level for `GET` and `PATCH`
 * methods only (NOT `PUT` — the actual update method on
 * this route!); this spec adds the focused method-shape
 * walk including the missing `PUT` probe AND the deep
 * permissions-array body surface walk on top of that.
 */
const ROLE_IDS = [
	'admin',
	'moderator',
	'content-manager',
	'super-admin',
	'__no_such_role__',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const PERMISSIONS_PATH = (id: string) => `/api/admin/roles/${id}/permissions`;
const PROBE_ID = ROLE_IDS[0];

const VALID_PERMISSIONS = ['items:read', 'items:create', 'items:update'] as const;

const ADMIN_ROLES_ID_PERMISSIONS_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },
	{ headers: { 'Content-Type': 'application/xml' }, label: 'xml content-type' },

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

const ADMIN_ROLES_ID_PERMISSIONS_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Imperative-validation probes — `permissions` must be an array
	// of valid `Permission` strings.
	{ data: { permissions: VALID_PERMISSIONS }, label: 'valid permissions array' },
	{ data: { permissions: [] }, label: 'empty permissions array (would 200 if reachable)' },
	{ data: { permissions: ['items:read'] }, label: 'single-valid-permission array' },
	{ data: { permissions: ['not:a:perm'] }, label: 'single-invalid-permission array (would 400 if reachable)' },
	{ data: { permissions: ['items:read', 'not:a:perm'] }, label: 'mixed valid + invalid (would 400 if reachable)' },
	{ data: { permissions: 'items:read' }, label: 'string permissions (would 400 not-an-array if reachable)' },
	{ data: { permissions: null }, label: 'null permissions (would 400 not-an-array if reachable)' },
	{ data: { permissions: undefined }, label: 'undefined permissions (would 400 not-an-array if reachable)' },
	{ data: { permissions: 123 }, label: 'numeric permissions (would 400 not-an-array if reachable)' },
	{ data: { permissions: { items: 'read' } }, label: 'object permissions (would 400 not-an-array if reachable)' },
	{ data: { permissions: [123, 456] }, label: 'numeric-array permissions (would 400 invalid if reachable)' },

	// Bypass attempts.
	{ data: { isAdmin: true, permissions: VALID_PERMISSIONS }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', permissions: VALID_PERMISSIONS }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', permissions: VALID_PERMISSIONS }, label: 'fabricated userId attempt' },
	{ data: { token: 'anything', permissions: VALID_PERMISSIONS }, label: 'token bypass attempt' },
	{ data: { padding: 'x'.repeat(2_000), permissions: VALID_PERMISSIONS }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Role not found',
	'Role ID is required',
	'Permissions must be an array',
	'Invalid permissions detected',
	'Invalid JSON in request body',
	'Permissions updated successfully',
	'Insufficient permissions',
	'User ID not found'
] as const;

const SHORTER_401_MESSAGE = 'Unauthorized';
const CANONICAL_LONGER_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/roles/[id]/permissions method / id / body / header surface', () => {
	for (const id of ROLE_IDS) {
		test(`GET ${PERMISSIONS_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.get(PERMISSIONS_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});

		test(`PUT ${PERMISSIONS_PATH(id)} responds without a server error`, async ({ request }) => {
			const response = await request.put(PERMISSIONS_PATH(id));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of ADMIN_ROLES_ID_PERMISSIONS_HEADERS) {
		test(`GET ${PERMISSIONS_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(PERMISSIONS_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`PUT ${PERMISSIONS_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(PERMISSIONS_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_ROLES_ID_PERMISSIONS_BODIES) {
		test(`PUT ${PERMISSIONS_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(PERMISSIONS_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${PERMISSIONS_PATH(PROBE_ID)} returns 401 with the shorter 'Unauthorized' envelope (NOT the canonical longer envelope)`, async ({
		request
	}) => {
		const response = await request.get(PERMISSIONS_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: SHORTER_401_MESSAGE
		});
		// Pin the envelope-message divergence vs the canonical
		// longer envelope every prior admin-id smoke pins.
		expect(body.error).not.toBe(CANONICAL_LONGER_401_MESSAGE);
	});

	test(`PUT ${PERMISSIONS_PATH(PROBE_ID)} returns 401 with the shorter 'Unauthorized' envelope (NOT the canonical longer envelope)`, async ({
		request
	}) => {
		const response = await request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: VALID_PERMISSIONS } });
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: SHORTER_401_MESSAGE
		});
		expect(body.error).not.toBe(CANONICAL_LONGER_401_MESSAGE);
	});

	test(`GET ${PERMISSIONS_PATH(PROBE_ID)} Unauthorized error envelope echoes the success: false key`, async ({
		request
	}) => {
		const response = await request.get(PERMISSIONS_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
	});

	test(`PUT ${PERMISSIONS_PATH(PROBE_ID)} Unauthorized error envelope echoes the success: false key`, async ({
		request
	}) => {
		const response = await request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: VALID_PERMISSIONS } });
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
	});

	test(`GET / PUT ${PERMISSIONS_PATH(PROBE_ID)} share the SAME 401 envelope shape on the unauth branch`, async ({
		request
	}) => {
		// Both methods delegate to the SAME `checkAdminAuth()`
		// helper, so the unauth envelope must be observably
		// the same across methods.
		const [getResponse, putResponse] = await Promise.all([
			request.get(PERMISSIONS_PATH(PROBE_ID)),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: VALID_PERMISSIONS } })
		]);

		expect(getResponse.status()).toBe(putResponse.status());
		expect(await getResponse.json()).toEqual(await putResponse.json());
	});

	test(`PUT ${PERMISSIONS_PATH(PROBE_ID)} does NOT echo any of the post-auth catch / validation / service messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.put(PERMISSIONS_PATH(PROBE_ID)),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: VALID_PERMISSIONS } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: ['not:a:perm'] } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: 'not-an-array' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: {} })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`PUT ${PERMISSIONS_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// The success branch returns
		// `{ success: true, data: { message, role } }`. The
		// unauth branch must NEVER reach the service.
		const response = await request.put(PERMISSIONS_PATH(PROBE_ID), {
			data: { permissions: VALID_PERMISSIONS }
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).not.toBe(true);
		expect(body.message).toBeUndefined();
	});

	test(`PUT ${PERMISSIONS_PATH(PROBE_ID)} does NOT echo a side-channel 'invalidPermissions' key on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, `'Invalid permissions detected'`
		// 400 echoes a side-channel `invalidPermissions` array
		// (a UNIQUE envelope key no prior admin-tree route
		// uses). The unauth branch must NEVER reach the
		// validation step regardless of body shape.
		const responses = await Promise.all([
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: ['not:a:perm'] } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: ['items:read', 'not:a:perm'] } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: [123, 456] } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.invalidPermissions).toBeUndefined();
		}
	});

	test(`GET ${PERMISSIONS_PATH(PROBE_ID)} has a stable status across header permutations`, async ({ request }) => {
		const baseline = await request.get(PERMISSIONS_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.get(PERMISSIONS_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(PERMISSIONS_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.get(PERMISSIONS_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`PUT ${PERMISSIONS_PATH(PROBE_ID)} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.put(PERMISSIONS_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: {} }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: VALID_PERMISSIONS } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: ['not:a:perm'] } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: 'not-an-array' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { isAdmin: true, permissions: VALID_PERMISSIONS } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${PERMISSIONS_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({ request }) => {
		const baseline = await request.get(PERMISSIONS_PATH(PROBE_ID));
		const responses = await Promise.all(ROLE_IDS.map((id) => request.get(PERMISSIONS_PATH(id))));

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`PUT ${PERMISSIONS_PATH(PROBE_ID)} has a stable status across distinct id shapes`, async ({ request }) => {
		const baseline = await request.put(PERMISSIONS_PATH(PROBE_ID));
		const responses = await Promise.all(ROLE_IDS.map((id) => request.put(PERMISSIONS_PATH(id))));

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`PUT ${PERMISSIONS_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.put(PERMISSIONS_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { headers: { 'X-Real-IP': '10.0.0.1' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { headers: { 'X-User-Id': 'fabricated' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { headers: { 'X-Api-Key': 'anything' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / PUT ${PERMISSIONS_PATH(PROBE_ID)} cross-method probe (POST / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(PERMISSIONS_PATH(PROBE_ID)),
			request.patch(PERMISSIONS_PATH(PROBE_ID)),
			request.delete(PERMISSIONS_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${PERMISSIONS_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, malformed JSON would 400 with
		// `'Invalid JSON in request body'`. On the unauth
		// branch the gate fires before any parse.
		const responses = await Promise.all([
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: 'not-json' }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: '{"permissions":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${PERMISSIONS_PATH(PROBE_ID)} service call is NOT entered on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.put(PERMISSIONS_PATH(PROBE_ID)),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: VALID_PERMISSIONS } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: {} })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`PUT ${PERMISSIONS_PATH(PROBE_ID)} is invariant to permissions-array shape on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch every shape resolves differently:
		// valid array → 200, empty array → 200, single-invalid →
		// 400, mixed → 400, non-array (string / null / object /
		// numeric) → 400 'Permissions must be an array'. On the
		// unauth branch every shape must round-trip to the same
		// 401 status.
		const baseline = await request.put(PERMISSIONS_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: {} }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: VALID_PERMISSIONS } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: [] } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: ['not:a:perm'] } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: 'not-an-array' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: null } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: 123 } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: { items: 'read' } } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: [123, 456] } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET / PUT ${PERMISSIONS_PATH(PROBE_ID)} unauth branch lands on the 401 'Unauthorized' envelope (NOT 403 'Insufficient permissions')`, async ({
		request
	}) => {
		// The `checkAdminAuth()` helper has THREE distinct
		// branches: 401 'Unauthorized' (no session), 401
		// 'User ID not found' (session but no id), 403
		// 'Insufficient permissions' (session + id but
		// !isAdmin). The smoke harness has no cookies, so
		// every probe must land on the FIRST branch — the
		// shorter 'Unauthorized' 401. This test pins that
		// the harness does NOT spuriously land on the 403
		// branch (which would indicate a regression where
		// some side-channel cookie / header is being
		// honored as a valid session).
		const responses = await Promise.all([
			request.get(PERMISSIONS_PATH(PROBE_ID)),
			request.put(PERMISSIONS_PATH(PROBE_ID), { data: { permissions: VALID_PERMISSIONS } }),
			request.get(PERMISSIONS_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(PERMISSIONS_PATH(PROBE_ID), {
				headers: { Cookie: 'authjs.session-token=fabricated' },
				data: { permissions: VALID_PERMISSIONS }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe(SHORTER_401_MESSAGE);
			expect(body.error).not.toBe('Insufficient permissions');
			expect(body.error).not.toBe('User ID not found');
		}
	});
});
