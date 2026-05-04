import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the admin-only collection-level client-create endpoint
 * served by the `POST` export of
 * `apps/web/app/api/admin/clients/route.ts`.
 *
 * The companion `apps/web-e2e/tests/api/admin-clients-
 * query.spec.ts` covers the GET (paginated list) surface
 * of the same route. This spec covers the POST (create)
 * surface that no prior admin-tree smoke spec touches.
 *
 * `POST /api/admin/clients` is the **first** admin-tree
 * route the smoke layer covers as a **collection-level
 * create endpoint** that combines the **bare
 * `{ error: 'Unauthorized' }` envelope** (NO `success`
 * key — matching the `admin/clients/[clientId]` smoke and
 * `admin/companies/[id]`) with a **get-or-create user
 * side-effect chain** that uses `crypto.randomBytes(6)`
 * to generate a temporary password for newly-created
 * users.
 *
 *   1. **Single-step inline `!session?.user?.isAdmin`
 *      gate** → 401 `{ error: 'Unauthorized' }` (BARE
 *      envelope, NO `success` key — distinct from every
 *      prior collection-level POST smoke that uses a
 *      `success: false` envelope key).
 *   2. **JSON body parse via `await request.json()`**
 *      AFTER the gate. NOT wrapped in a per-call
 *      try/catch.
 *   3. **Email-or-userId fallback** — `const email =
 *      raw.email ?? raw.userId`. Distinct from prior
 *      POST smokes that have a single named required
 *      field. The unauth branch must NEVER reach this
 *      destructure.
 *   4. **Single-field required check** — `if (!email)`
 *      → 400 `{ error: 'Email is required' }`. Distinct
 *      from the canonical-longer-envelope `admin/
 *      categories` POST and `admin/items` POST which
 *      use a `success: false` envelope.
 *   5. **`getUserByEmail(email)` lookup** to find an
 *      existing user with the given email.
 *   6. **Inner-try/catch user-create branch** — if no
 *      existing user found, calls
 *      `UserDbService.createUser({ email, password:
 *      tempPassword })` with a `crypto.randomBytes(6)`-
 *      generated temporary password (`Temp<hex>!`). On
 *      failure: 400 with **dynamically-interpolated**
 *      message `'Failed to create user: <err.message>'`.
 *   7. **Get-or-create fallback validation** — `if
 *      (!user || !user.id)` → 400 `{ error: 'Failed to
 *      create or find user for client' }`.
 *   8. **`createClientProfile(clientData)` call** with
 *      defaults `status = 'active'`, `plan = 'free'`,
 *      `accountType = 'individual'`.
 *   9. **Optional CRM sync side-effect** gated by
 *      `process.env.TWENTY_CRM_ENABLED !== 'false'`,
 *      wrapped in its own try/catch. Calls
 *      `mapClientProfileToPerson(newClient)` and
 *      `syncService.upsertPerson(personPayload)`.
 *  10. **Success payload** — `{ success: true, data:
 *      <client>, message: 'Client created
 *      successfully' }` with status **200** (NOT 201).
 *      Distinct from prior collection-level POST
 *      smokes which return 201.
 *  11. **Outer catch** — 500 `{ error: 'Failed to
 *      create client' }` (BARE envelope, NO `success`
 *      key). Distinct from `admin/clients/[clientId]`
 *      which uses the same posture but for fetch/
 *      update/delete handlers.
 *  12. **Method-resolution surface** — the route
 *      exports `GET` and `POST`. PUT / PATCH /
 *      DELETE must round-trip to a `< 500` status.
 *
 * Where the immediately-preceding `admin-tags-create-
 * body.spec.ts` walks the hybrid-envelope `tag`-key
 * collection-level POST endpoint with a fixed-message
 * 500 fallback, this spec walks the bare-envelope
 * `data`-key `POST /api/admin/clients` collection-
 * level endpoint with a get-or-create user side-effect
 * chain — a complementary surface that no prior
 * admin-tree smoke spec covers.
 */
const CLIENTS_PATH = '/api/admin/clients';

const ADMIN_CLIENTS_CREATE_HEADERS = [
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

const ADMIN_CLIENTS_CREATE_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (req-email) if reachable)' },

	// Required-field probes — email-or-userId fallback.
	{ data: { displayName: 'X' }, label: 'displayName-only body (no email/userId, would 400 if reachable)' },
	{ data: { email: 'test@example.com' }, label: 'email-only body (would proceed to get-or-create if reachable)' },
	{ data: { userId: 'test@example.com' }, label: 'userId fallback (used as email if reachable)' },
	{ data: { email: '' }, label: 'empty email (would 400 (req-email) if reachable)' },
	{ data: { userId: '' }, label: 'empty userId (would 400 (req-email) if reachable)' },

	// Valid bodies (would create user + client if reachable).
	{
		data: { email: 'test@example.com', displayName: 'Test User' },
		label: 'valid email + displayName body'
	},
	{
		data: {
			email: 'test@example.com',
			displayName: 'Test User',
			username: 'testuser',
			bio: 'Test bio',
			jobTitle: 'Engineer',
			company: 'Acme'
		},
		label: 'fully-populated body'
	},
	{
		data: { email: 'test@example.com', status: 'active', plan: 'premium', accountType: 'business' },
		label: 'valid + status/plan/accountType overrides'
	},

	// Bypass attempts.
	{
		data: { isAdmin: true, email: 'test@example.com' },
		label: 'isAdmin=true bypass attempt'
	},
	{
		data: { tenantId: 'fabricated', email: 'test@example.com' },
		label: 'fabricated tenantId attempt'
	},
	{
		data: { padding: 'x'.repeat(2_000), email: 'test@example.com' },
		label: 'large padded body'
	}
] as const;

const FORBIDDEN_MESSAGES = [
	'Email is required',
	'Failed to create or find user for client',
	'Failed to create client',
	'Client created successfully'
] as const;

const FORBIDDEN_KEYS = ['data', 'success'] as const;

const FORBIDDEN_USER_CREATE_PREFIX = /^Failed to create user:/;

const BARE_401_MESSAGE = 'Unauthorized';
const CANONICAL_LONGER_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/clients POST body / header surface', () => {
	for (const { headers, label } of ADMIN_CLIENTS_CREATE_HEADERS) {
		test(`POST ${CLIENTS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(CLIENTS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_CLIENTS_CREATE_BODIES) {
		test(`POST ${CLIENTS_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(CLIENTS_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${CLIENTS_PATH} returns 401 with the bare Unauthorized envelope (NOT canonical longer)`, async ({
		request
	}) => {
		const response = await request.post(CLIENTS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: BARE_401_MESSAGE });
		expect(body.error).not.toBe(CANONICAL_LONGER_401_MESSAGE);
	});

	test(`POST ${CLIENTS_PATH} unauth envelope has NO success key`, async ({ request }) => {
		// Strict envelope-shape assertion: the bare
		// envelope is `{ error: 'Unauthorized' }`. The
		// ABSENCE of a `success` key is the cross-route
		// divergence that distinguishes this route's gate
		// from the canonical-longer-envelope and hybrid-
		// envelope POST smokes.
		const response = await request.post(CLIENTS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
	});

	test(`POST ${CLIENTS_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// Success branch: status 200 with `{ success:
		// true, data: <client>, message: 'Client created
		// successfully' }`. The unauth branch must NEVER
		// reach the create call.
		const response = await request.post(CLIENTS_PATH, {
			data: { email: 'test@example.com', displayName: 'Test' }
		});
		const body = await response.json();
		for (const key of FORBIDDEN_KEYS) {
			expect(body[key]).toBeUndefined();
		}
		expect(body.message).toBeUndefined();
	});

	test(`POST ${CLIENTS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(CLIENTS_PATH),
			request.post(CLIENTS_PATH, { data: {} }),
			request.post(CLIENTS_PATH, { data: { email: 'test@example.com' } }),
			request.post(CLIENTS_PATH, { data: { displayName: 'X' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
			// Dynamic 'Failed to create user: ...' message
			// uses regex prefix.
			if (typeof body.error === 'string') {
				expect(body.error).not.toMatch(FORBIDDEN_USER_CREATE_PREFIX);
			}
		}
	});

	test(`POST ${CLIENTS_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(CLIENTS_PATH);
		const responses = await Promise.all([
			request.post(CLIENTS_PATH, { data: {} }),
			request.post(CLIENTS_PATH, { data: { email: 'test@example.com' } }),
			request.post(CLIENTS_PATH, { data: { userId: 'test@example.com' } }),
			request.post(CLIENTS_PATH, { data: { isAdmin: true, email: 'test@example.com' } }),
			request.post(CLIENTS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(CLIENTS_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${CLIENTS_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(CLIENTS_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(CLIENTS_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(CLIENTS_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(CLIENTS_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(CLIENTS_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(CLIENTS_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(CLIENTS_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(CLIENTS_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CLIENTS_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		const responses = await Promise.all([
			request.put(CLIENTS_PATH),
			request.patch(CLIENTS_PATH),
			request.delete(CLIENTS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CLIENTS_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(CLIENTS_PATH, { data: 'not-json' }),
			request.post(CLIENTS_PATH, { data: '{ broken: json' }),
			request.post(CLIENTS_PATH, { data: '{"email":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CLIENTS_PATH} required-email check is NOT entered on the unauth branch`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(CLIENTS_PATH, { data: {} }),
			request.post(CLIENTS_PATH, { data: { email: '' } }),
			request.post(CLIENTS_PATH, { data: { displayName: 'X' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Email is required');
		}
	});

	test(`POST ${CLIENTS_PATH} get-or-create user side-effect is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, a body with `email` triggers
		// `getUserByEmail(email)` and conditionally
		// `UserDbService.createUser(...)` with a crypto-
		// random temp password. The unauth branch must
		// NEVER reach the get-or-create chain, so the
		// unauth response must NEVER match the dynamic
		// `'Failed to create user: <err.message>'` regex
		// prefix.
		const responses = await Promise.all([
			request.post(CLIENTS_PATH, { data: { email: 'newuser@example.com' } }),
			request.post(CLIENTS_PATH, { data: { email: 'existing@example.com', displayName: 'Existing' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			if (typeof body.error === 'string') {
				expect(body.error).not.toMatch(FORBIDDEN_USER_CREATE_PREFIX);
			}
			expect(body.error).not.toBe('Failed to create or find user for client');
		}
	});

	test(`POST ${CLIENTS_PATH} createClientProfile call is NOT entered on the unauth branch`, async ({ request }) => {
		// A regression that re-orders
		// `createClientProfile(...)` before the gate would
		// surface here: the unauth response would echo a
		// `data` key with the created client (and a 200
		// status, NOT the typical 201 of other create
		// endpoints).
		const response = await request.post(CLIENTS_PATH, {
			data: {
				email: 'test@example.com',
				displayName: 'Test',
				status: 'active',
				plan: 'premium'
			}
		});
		expect(response.status()).not.toBe(200);
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBeUndefined();
		expect(body.message).toBeUndefined();
	});
});
