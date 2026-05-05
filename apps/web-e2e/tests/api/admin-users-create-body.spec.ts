import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the admin-only collection-level user-create endpoint
 * served by the `POST` export of
 * `apps/web/app/api/admin/users/route.ts`.
 *
 * The companion `apps/web-e2e/tests/api/admin-users-query.
 * spec.ts` covers the GET (paginated list) surface of the
 * same route. This spec covers the POST (create) surface
 * that no prior admin-tree smoke spec touches.
 *
 * `POST /api/admin/users` is the **first** admin-tree
 * route the smoke layer covers as a **collection-level
 * create endpoint** that combines:
 *   - the **two-step `!session?.user` →
 *     `!session.user.isAdmin` gate** (matching
 *     `admin/users/[id]`, `admin/roles/[id]`,
 *     `admin/reports/[id]`), AND
 *   - an **eight-step body validation chain** (object-
 *     shape, 5-required-fields, email format, username
 *     regex, name length, password-Zod-`safeParse`,
 *     title length, avatar length, role-DB-lookup), AND
 *   - **Zod `passwordSchema.safeParse(body.password)`**
 *     for password-only validation that returns a
 *     dynamically-interpolated message
 *     (`passwordResult.error.issues[0]?.message`),
 *     distinct from prior smokes that use Zod for the
 *     body-as-a-whole, AND
 *   - a **username regex validation**
 *     (`/^[a-zA-Z0-9_-]{3,30}$/`) — the **first** regex-
 *     based username validation in admin smoke, AND
 *   - the **`error.message`-pass-through outer catch**
 *     (matching `admin/users/[id]` PUT/DELETE) that
 *     returns 400 with the raw error message instead of
 *     a fixed 500 string when the error is an `Error`
 *     instance.
 *
 *   1. **Two-step gate**:
 *        (a) `!session?.user` → 401 `{ success: false,
 *            error: 'Unauthorized' }`.
 *        (b) `!session.user.isAdmin` → 403
 *            `{ success: false, error: 'Forbidden' }`.
 *      The unauth client lacks any session, so the
 *      FIRST step always fires.
 *   2. **Hybrid 401 envelope** — bare `'Unauthorized'`
 *      message PLUS `success: false` envelope key.
 *   3. **JSON body parse via `await request.json()`**
 *      AFTER both gate steps. NOT wrapped in a per-call
 *      try/catch.
 *   4. **Object-shape check** — `if (!body || typeof
 *      body !== 'object')` → 400 `'Invalid request
 *      body'`.
 *   5. **Five-field required-fields check** — `if
 *      (!body.username || !body.email || !body.name ||
 *      !body.password || !body.role)` → 400 `'Missing
 *      required fields: username, email, name,
 *      password, and role are required'`.
 *   6. **Email format check** — `isValidEmail(body.
 *      email)` → 400 `'Invalid email format'`.
 *   7. **Username regex check** —
 *      `/^[a-zA-Z0-9_-]{3,30}$/.test(body.username)` →
 *      400 `'Username must be 3-30 characters and
 *      contain only letters, numbers, dashes, and
 *      underscores'`.
 *   8. **Name length check** — `body.name.trim().length
 *      < 2 || > 100` → 400 `'Name must be between 2
 *      and 100 characters'`.
 *   9. **Password Zod check** —
 *      `passwordSchema.safeParse(body.password)` →
 *      400 with `passwordResult.error.issues[0]?.
 *      message ?? 'Invalid password'`.
 *  10. **Title / avatar length checks** — both with
 *      explicit length cap (100 / 500).
 *  11. **Role DB lookup** —
 *      `roleRepository.findById(body.role)` → 400
 *      `'Invalid role'` if not found. Distinct from
 *      `admin/users/[id]` PUT which has the same
 *      role-DB lookup but only for partial updates.
 *  12. **`userRepository.create(...)` call** AFTER all
 *      validation steps pass. Trims/lowercases inputs
 *      before passing.
 *  13. **`error.message`-pass-through outer catch** —
 *      `error instanceof Error` → 400 `{ success:
 *      false, error: error.message }`, else 500
 *      `'Internal server error'`.
 *  14. **Method-resolution surface** — the route
 *      exports `GET` and `POST`. PUT / PATCH / DELETE
 *      must round-trip to a `< 500` status (typically
 *      405 Method Not Allowed).
 *
 * Where the immediately-preceding `admin-items-create-
 * body.spec.ts` walks the `POST /api/admin/items`
 * collection-level endpoint with five-field validation
 * and two duplicate checks, this spec walks the
 * `POST /api/admin/users` collection-level endpoint
 * with an eight-step validation chain (including
 * regex / Zod-password / role-DB-lookup) — a
 * complementary surface that no prior admin-tree
 * smoke spec covers.
 */
const USERS_PATH = '/api/admin/users';

const ADMIN_USERS_CREATE_HEADERS = [
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

const VALID_BODY = {
	username: 'testuser',
	email: 'test@example.com',
	name: 'Test User',
	password: 'StrongP@ssw0rd!23',
	role: 'admin'
};

const ADMIN_USERS_CREATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (req-fields) if reachable)' },

	// Step (a) probes — `!body || typeof body !== 'object'`.
	{ data: 'not-an-object', label: 'string body (would 400 (a) if reachable)' },
	{ data: 123 as unknown, label: 'numeric body (would 400 (a) if reachable)' },
	{ data: null, label: 'null body (would 400 (a) if reachable)' },

	// Step (b) probes — required fields.
	{ data: { email: 'a@b.com', name: 'X', password: 'p', role: 'admin' }, label: 'no username field' },
	{ data: { username: 'u', name: 'X', password: 'p', role: 'admin' }, label: 'no email field' },
	{ data: { username: 'u', email: 'a@b.com', password: 'p', role: 'admin' }, label: 'no name field' },
	{ data: { username: 'u', email: 'a@b.com', name: 'X', role: 'admin' }, label: 'no password field' },
	{ data: { username: 'u', email: 'a@b.com', name: 'X', password: 'p' }, label: 'no role field' },

	// Step (c) probes — email format.
	{ data: { ...VALID_BODY, email: 'not-an-email' }, label: 'invalid email format (would 400 (c) if reachable)' },

	// Step (d) probes — username regex.
	{ data: { ...VALID_BODY, username: 'ab' }, label: 'too-short 2-char username (would 400 (d) if reachable)' },
	{ data: { ...VALID_BODY, username: 'a'.repeat(31) }, label: 'too-long 31-char username (would 400 (d) if reachable)' },
	{ data: { ...VALID_BODY, username: 'has spaces' }, label: 'username with spaces (would 400 (d) if reachable)' },
	{ data: { ...VALID_BODY, username: 'has.dots' }, label: 'username with dots (would 400 (d) if reachable)' },

	// Step (e) probes — name length.
	{ data: { ...VALID_BODY, name: 'a' }, label: 'too-short 1-char name (would 400 (e) if reachable)' },
	{ data: { ...VALID_BODY, name: 'a'.repeat(101) }, label: 'too-long 101-char name (would 400 (e) if reachable)' },

	// Step (f) probes — password Zod schema.
	{ data: { ...VALID_BODY, password: 'short' }, label: 'too-short password (would 400 (f) if reachable)' },
	{ data: { ...VALID_BODY, password: 'lowercase' }, label: 'lowercase-only password (would 400 (f) if reachable)' },

	// Step (g) probes — title.
	{ data: { ...VALID_BODY, title: 'a'.repeat(101) }, label: 'too-long 101-char title (would 400 (g) if reachable)' },
	{ data: { ...VALID_BODY, title: 123 }, label: 'numeric title (would 400 (g) if reachable)' },

	// Step (h) probes — avatar.
	{ data: { ...VALID_BODY, avatar: 'a'.repeat(501) }, label: 'too-long 501-char avatar (would 400 (h) if reachable)' },
	{ data: { ...VALID_BODY, avatar: 123 }, label: 'numeric avatar (would 400 (h) if reachable)' },

	// Step (i) probes — role.
	{ data: { ...VALID_BODY, role: '' }, label: 'empty role (would 400 (i)-empty if reachable)' },
	{ data: { ...VALID_BODY, role: 123 }, label: 'numeric role (would 400 (i)-type if reachable)' },
	{ data: { ...VALID_BODY, role: 'nonexistent-role' }, label: 'nonexistent role (would 400 (i)-DB-lookup if reachable)' },

	// Valid body.
	{ data: VALID_BODY, label: 'fully-valid body (would create user if reachable)' },

	// Bypass attempts.
	{ data: { ...VALID_BODY, isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { ...VALID_BODY, tenantId: 'fabricated' }, label: 'fabricated tenantId attempt' },
	{ data: { ...VALID_BODY, padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Forbidden',
	'Invalid request body',
	'Missing required fields: username, email, name, password, and role are required',
	'Invalid email format',
	'Username must be 3-30 characters and contain only letters, numbers, dashes, and underscores',
	'Name must be between 2 and 100 characters',
	'Title must be a string',
	'Title must be at most 100 characters',
	'Avatar must be a string',
	'Avatar URL must be at most 500 characters',
	'Role cannot be empty',
	'Invalid role',
	'Internal server error'
] as const;

const FORBIDDEN_KEYS = ['data', 'user', 'id'] as const;

const HYBRID_401_MESSAGE = 'Unauthorized';

test.describe('API: /api/admin/users POST body / header surface', () => {
	for (const { headers, label } of ADMIN_USERS_CREATE_HEADERS) {
		test(`POST ${USERS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(USERS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_USERS_CREATE_BODIES) {
		test(`POST ${USERS_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(USERS_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${USERS_PATH} returns 401 with the hybrid bare-message + success: false envelope`, async ({
		request
	}) => {
		const response = await request.post(USERS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: HYBRID_401_MESSAGE });
	});

	test(`POST ${USERS_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		const response = await request.post(USERS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`POST ${USERS_PATH} unauth branch lands on 401 (NOT 403)`, async ({ request }) => {
		// The 403 'Forbidden' branch only fires for an
		// authenticated-but-non-admin session. The unauth
		// client lacks any session at all, so the FIRST
		// gate-step ('Unauthorized') fires instead — the
		// unauth response must NEVER be 403, and must
		// NEVER echo 'Forbidden'.
		const response = await request.post(USERS_PATH);
		expect(response.status()).toBe(401);
		const body = await response.json();
		expect(body.error).not.toBe('Forbidden');
	});

	test(`POST ${USERS_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// Success branch: status 201 with `{ success:
		// true, data: <user> }` (the user includes `id`
		// among other keys). The unauth branch must NEVER
		// reach the create call, so the response must NOT
		// echo `data` / `user` / `id` keys, must NOT
		// contain `success: true`, and must NOT have a
		// 201 status.
		const response = await request.post(USERS_PATH, { data: VALID_BODY });
		expect(response.status()).not.toBe(201);
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
		expect(body.success).not.toBe(true);
	});

	test(`POST ${USERS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(USERS_PATH),
			request.post(USERS_PATH, { data: {} }),
			request.post(USERS_PATH, { data: VALID_BODY }),
			request.post(USERS_PATH, { data: { ...VALID_BODY, email: 'not-an-email' } }),
			request.post(USERS_PATH, { data: { ...VALID_BODY, username: 'ab' } }),
			request.post(USERS_PATH, { data: { ...VALID_BODY, role: 'nonexistent' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${USERS_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(USERS_PATH);
		const responses = await Promise.all([
			request.post(USERS_PATH, { data: {} }),
			request.post(USERS_PATH, { data: VALID_BODY }),
			request.post(USERS_PATH, { data: { ...VALID_BODY, email: 'not-an-email' } }),
			request.post(USERS_PATH, { data: { ...VALID_BODY, username: 'ab' } }),
			request.post(USERS_PATH, { data: { ...VALID_BODY, isAdmin: true } }),
			request.post(USERS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(USERS_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${USERS_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(USERS_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(USERS_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(USERS_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(USERS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(USERS_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(USERS_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(USERS_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(USERS_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${USERS_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		// The route exports `GET` and `POST`. Other
		// methods must round-trip to a `< 500` status.
		const responses = await Promise.all([
			request.put(USERS_PATH),
			request.patch(USERS_PATH),
			request.delete(USERS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${USERS_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(USERS_PATH, { data: 'not-json' }),
			request.post(USERS_PATH, { data: '{ broken: json' }),
			request.post(USERS_PATH, { data: '{"username":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${USERS_PATH} eight-step body validation chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch every step-(a)-(i) probe
		// triggers a distinct 400 envelope. On the unauth
		// branch every shape must round-trip to the same
		// 401 status.
		const baseline = await request.post(USERS_PATH);
		const responses = await Promise.all([
			// (a) probes
			request.post(USERS_PATH, { data: 'not-an-object' }),
			request.post(USERS_PATH, { data: null }),
			// (b) probes
			request.post(USERS_PATH, { data: { username: 'u' } }),
			request.post(USERS_PATH, { data: { ...VALID_BODY, password: undefined } }),
			// (c) probes
			request.post(USERS_PATH, { data: { ...VALID_BODY, email: 'not-an-email' } }),
			// (d) probes
			request.post(USERS_PATH, { data: { ...VALID_BODY, username: 'ab' } }),
			request.post(USERS_PATH, { data: { ...VALID_BODY, username: 'has spaces' } }),
			// (e) probes
			request.post(USERS_PATH, { data: { ...VALID_BODY, name: 'a' } }),
			// (f) probes
			request.post(USERS_PATH, { data: { ...VALID_BODY, password: 'short' } }),
			// (g) probes
			request.post(USERS_PATH, { data: { ...VALID_BODY, title: 'a'.repeat(101) } }),
			// (h) probes
			request.post(USERS_PATH, { data: { ...VALID_BODY, avatar: 'a'.repeat(501) } }),
			// (i) probes
			request.post(USERS_PATH, { data: { ...VALID_BODY, role: 'nonexistent' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${USERS_PATH} role DB-lookup is NOT entered on the unauth branch`, async ({ request }) => {
		// On the auth branch, `roleRepository.findById(
		// body.role)` runs on every body that passes the
		// preceding seven validation steps. The unauth
		// branch must NEVER reach this DB call; the unauth
		// response must NEVER echo `'Invalid role'` even
		// for body shapes that would fail the role lookup.
		const responses = await Promise.all([
			request.post(USERS_PATH, { data: { ...VALID_BODY, role: 'nonexistent' } }),
			request.post(USERS_PATH, { data: { ...VALID_BODY, role: 'fake-role-id' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Invalid role');
		}
	});

	test(`POST ${USERS_PATH} create call is NOT entered on the unauth branch`, async ({ request }) => {
		// A regression that re-orders
		// `userRepository.create(...)` before the gate
		// would surface here: the unauth response would
		// have status 201 with a `data` key.
		const response = await request.post(USERS_PATH, { data: VALID_BODY });
		expect(response.status()).not.toBe(201);
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).not.toBe(true);
	});
});
