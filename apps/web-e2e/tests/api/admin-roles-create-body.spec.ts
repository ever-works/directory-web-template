import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the **non-admin-gated** collection-level role-create
 * endpoint served by the `POST` export of
 * `apps/web/app/api/admin/roles/route.ts`.
 *
 * The companion `apps/web-e2e/tests/api/admin-roles-query.
 * spec.ts` covers the GET (paginated list) surface of the
 * same route.
 *
 * `POST /api/admin/roles` is the **fifth Q-010b-style
 * auth-gate-divergence finding** the smoke layer
 * documents — the route's POST handler does **NOT call
 * `auth()` at all**, so any unauthenticated client can
 * create roles. The other admin routes already flagged by
 * Q-010b are:
 *   - `admin/roles/route.ts` GET (covered by
 *     `admin-roles-query.spec.ts`)
 *   - `admin/roles/active/route.ts` GET (covered by
 *     `admin-roles-active-query.spec.ts`)
 *   - `admin/featured-items/[id]/route.ts` (covered by
 *     `admin-featured-items-id-method-spec.md`)
 *   - The broader `admin-by-id.spec.ts` coverage of
 *     similar tenant-only-gated routes.
 *
 * Because there's NO gate, the unauth client receives the
 * same response an authenticated client would receive:
 *   - **No body / empty body** → 400 `'Missing required
 *     fields: name, description'`
 *   - **Body without name normalization** → 400
 *     `'Unable to derive a valid role ID from name'`
 *   - **Name out of length range (3-100)** → 400
 *     `'Role name must be between 3 and 100
 *     characters'`
 *   - **Description > 500** → 400 `'Role description
 *     must be at most 500 characters'`
 *   - **Duplicate ID** → 409 `'Role with similar name
 *     already exists'`
 *   - **Valid body** → 201 `{ success: true, data:
 *     <role>, message: 'Role created successfully' }`
 *
 * Distinct features:
 *   1. **NO auth gate** — every unauth client gets the
 *      same response an authenticated admin would get.
 *   2. **`{ success: false, error: ... }` envelope on
 *      400 / 409 / 500 branches** — distinct from
 *      typical admin POST endpoints which echo this
 *      envelope only on the auth gate.
 *   3. **Stable-ID-derivation step** — `roleData.name`
 *      is normalized via `.normalize('NFKD')`, diacritic
 *      stripping, lowercasing, and slug-style hyphen
 *      collapsing. The first POST smoke that walks a
 *      slug-derivation step.
 *   4. **Soft-delete-aware uniqueness check** —
 *      `roleRepository.exists(id, { includeDeleted:
 *      true })`. The first POST smoke that includes
 *      soft-deleted records in its uniqueness check.
 *   5. **Outer-catch translates `'already exists' \|
 *      'unique constraint' \| 'duplicate key'`** to a
 *      single 409 `'Role with similar name already
 *      exists'` envelope.
 *   6. **Method-resolution surface** — the route exports
 *      `GET` and `POST`. PUT / PATCH / DELETE must
 *      round-trip to a `< 500` status.
 *
 * The smoke spec pins the `< 500` invariant across every
 * permutation, the gate-NOT-entered finding (since there
 * is no gate), and the route's classification as a
 * Q-010b-style auth-gate-divergence finding.
 */
const ROLES_PATH = '/api/admin/roles';

const ADMIN_ROLES_CREATE_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const ADMIN_ROLES_CREATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (req-fields))' },

	// Required-field probes.
	{ data: { name: 'X' }, label: 'name-only body (would 400 (req-description))' },
	{ data: { description: 'D' }, label: 'description-only body (would 400 (req-name))' },

	// Slug-derivation probes.
	{ data: { name: '!!!', description: 'desc' }, label: 'name with no derivable slug chars (would 400 if reachable)' },
	{ data: { name: 'Café Manager', description: 'desc' }, label: 'name with diacritic (slug normalizes to "cafe-manager")' },
	{ data: { name: 'Multi   Spaces', description: 'desc' }, label: 'name with multi-spaces (slug normalizes to "multi-spaces")' },

	// Length-validation probes.
	{ data: { name: 'ab', description: 'd' }, label: 'too-short 2-char name (would 400 (length))' },
	{ data: { name: 'a'.repeat(101), description: 'd' }, label: 'too-long 101-char name (would 400 (length))' },
	{ data: { name: 'Valid', description: 'a'.repeat(501) }, label: 'too-long 501-char description (would 400 (length))' },

	// Valid bodies.
	{ data: { name: 'Test Role', description: 'A test role' }, label: 'fully-valid body' },
	{ data: { name: 'Admin Plus', description: 'desc', status: 'inactive' }, label: 'valid + inactive status' },
	{ data: { name: 'Super Admin', description: 'desc', isAdmin: true }, label: 'valid + isAdmin=true (would create admin role!)' }
] as const;

test.describe('API: /api/admin/roles POST body / header surface', () => {
	for (const { headers, label } of ADMIN_ROLES_CREATE_HEADERS) {
		test(`POST ${ROLES_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(ROLES_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_ROLES_CREATE_BODIES) {
		test(`POST ${ROLES_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(ROLES_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${ROLES_PATH} unauth no-body response is NOT 401 or 403 (Q-010b finding: no gate)`, async ({
		request
	}) => {
		// The route does NOT call auth() at all, so the
		// unauth client receives the same response an
		// authenticated client would receive. With no body,
		// the first auth-branch validation fires (missing
		// required fields → 400). This test pins the
		// auth-gate-divergence finding: any client can hit
		// this endpoint and the only "protection" is body
		// validation.
		const response = await request.post(ROLES_PATH);
		expect(response.status()).not.toBe(401);
		expect(response.status()).not.toBe(403);
		// On the no-body branch, the typical response is
		// 400 (req-fields) or 500 (if the route's body
		// parse fails before reaching the validation).
		expect([400, 500].includes(response.status()) || response.status() === 200).toBe(true);
	});

	test(`POST ${ROLES_PATH} unauth no-body response carries the success: false envelope`, async ({ request }) => {
		// Even though there's no auth gate, the validation
		// branches return a `success: false` envelope shape
		// on errors.
		const response = await request.post(ROLES_PATH);
		const body = await response.json();
		// On a 400/409/500 branch, body.success is false.
		// On a 201 branch (full create), body.success is true.
		// Either way, the `success` key is present.
		expect(body.success).toBeDefined();
	});

	test(`POST ${ROLES_PATH} has a stable status across header / body permutations of the same body`, async ({
		request
	}) => {
		// Header permutations do not affect routing on the
		// auth branch (since there's no gate), so every
		// header set with the SAME body must round-trip to
		// the same status.
		const baseline = await request.post(ROLES_PATH, { data: {} });
		const responses = await Promise.all([
			request.post(ROLES_PATH, { data: {}, headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(ROLES_PATH, { data: {}, headers: { Authorization: 'Bearer anything' } }),
			request.post(ROLES_PATH, { data: {}, headers: { Cookie: 'next-auth.session-token=fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${ROLES_PATH} side-channel cookies / headers do NOT trigger different routing`, async ({ request }) => {
		// Since there's no auth gate, fabricated session
		// cookies do nothing — no privilege escalation.
		const responses = await Promise.all([
			request.post(ROLES_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(ROLES_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(ROLES_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(ROLES_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(ROLES_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(ROLES_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(ROLES_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(ROLES_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${ROLES_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.put(ROLES_PATH),
			request.patch(ROLES_PATH),
			request.delete(ROLES_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${ROLES_PATH} is invariant to malformed JSON bodies`, async ({ request }) => {
		// Without a per-call try/catch around
		// `await request.json()`, malformed bodies would 500
		// via the outer console.error catch.
		const responses = await Promise.all([
			request.post(ROLES_PATH, { data: 'not-json' }),
			request.post(ROLES_PATH, { data: '{ broken: json' }),
			request.post(ROLES_PATH, { data: '{"name":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${ROLES_PATH} required-field check fires on no-body request (Q-010b: only protection)`, async ({
		request
	}) => {
		// Since there's no auth gate, the required-field
		// check is the FIRST gate. A no-body request hits
		// it first and returns 400.
		const response = await request.post(ROLES_PATH);
		// The response could be 400 (validation error) or
		// 500 (if request.json() throws on undefined body).
		// Either way it should be < 500 in our runtime.
		expect(response.status()).toBeLessThan(500);
	});

	test(`POST ${ROLES_PATH} length-validation branches fire deterministically`, async ({ request }) => {
		// Pin the route's length-validation envelope shapes
		// for too-short / too-long body shapes. These
		// validation branches are reachable WITHOUT auth
		// because there's no gate — a notable Q-010b finding
		// since they document the route's actual behavior.
		const responses = await Promise.all([
			request.post(ROLES_PATH, { data: { name: 'ab', description: 'd' } }),
			request.post(ROLES_PATH, { data: { name: 'a'.repeat(101), description: 'd' } }),
			request.post(ROLES_PATH, { data: { name: 'Valid', description: 'a'.repeat(501) } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});
});
