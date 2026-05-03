import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multi-method / dynamic-clientId /
 * body / header surface** of the admin-only single-client
 * profile CRUD endpoint served by
 * `apps/web/app/api/admin/clients/[clientId]/route.ts`.
 *
 * `GET /api/admin/clients/{clientId}`,
 * `PUT /api/admin/clients/{clientId}`, and
 * `DELETE /api/admin/clients/{clientId}` are the **first**
 * admin-tree routes the smoke layer covers as a triple-
 * method export with a **non-canonical `[clientId]` dynamic-
 * segment param name** (every prior dynamic-segment admin
 * smoke uses `[id]`). They are also the **first** triple-
 * method admin smoke that combines the bare
 * `{ error: 'Unauthorized' }` envelope (NO `success: false`
 * key) with the bare `console.error` + per-handler
 * `'Failed to <verb> client'` 500 catch family — distinct
 * from the canonical-longer / `success: false` envelope
 * shape of the sibling `admin/items/[id]` triple-method
 * route.
 *
 * All three handlers share:
 *   1. **Single-step inline `!session?.user?.isAdmin` gate**
 *      → 401 `{ error: 'Unauthorized' }` (bare envelope, NO
 *      `success` key — distinct from the canonical-longer
 *      `{ success: false, error: 'Unauthorized. Admin
 *      access required.' }` envelope of every prior
 *      dynamic-segment-`[id]` admin smoke).
 *   2. **`[clientId]` dynamic-segment param name** —
 *      `await params` resolves to `{ clientId: string }`
 *      AFTER the gate.
 *   3. **Direct query-function calls** (NOT a repository
 *      class) —
 *      `getClientProfileById` / `updateClientProfile` /
 *      `deleteClientProfile` from `@/lib/db/queries`.
 *   4. **`console.error` + bare `{ error: '<msg>' }` 500
 *      catch** with handler-specific messages
 *      (`'Failed to fetch client'` /
 *      `'Failed to update client'` /
 *      `'Failed to delete client'`).
 *
 * Each handler also has its own divergent post-gate
 * surface:
 *
 *   GET:
 *     - No body parse.
 *     - `getClientProfileById(clientId)` → 404
 *       `{ error: 'Client not found' }` if missing.
 *     - Success payload `{ success: true, data:
 *       <client> }`.
 *
 *   PUT:
 *     - JSON body parse via `await request.json()` AFTER
 *       the gate (NOT wrapped in a per-call try/catch —
 *       a malformed body would 500 via the outer
 *       `console.error` catch on the auth branch).
 *     - `updateClientProfile(clientId, data)` → 404
 *       `{ error: 'Client not found' }` if missing.
 *     - Optional CRM sync gated by
 *       `process.env.TWENTY_CRM_ENABLED !== 'false'`,
 *       walking a two-step (company → person) sync
 *       chain wrapped in its own try/catch.
 *     - Success payload `{ success: true, data:
 *       <client> }` (NOTE: NO `message` key — distinct
 *       from the sibling `admin/items/[id]` PUT
 *       success payload which includes
 *       `'Item updated successfully'`).
 *
 *   DELETE:
 *     - No body parse.
 *     - `deleteClientProfile(clientId)` → 404
 *       `{ error: 'Client not found' }` if returns
 *       falsy.
 *     - Success payload `{ success: true, message:
 *       'Client deleted successfully' }` (NOTE: NO
 *       `data` key — distinct from GET / PUT success
 *       payloads).
 *
 * Where the immediately-preceding
 * `admin-items-id-method.spec.ts` walks the canonical-
 * longer / `success: false` envelope triple-method
 * `admin/items/[id]` route, this spec walks the bare /
 * no-`success`-key envelope triple-method
 * `admin/clients/[clientId]` route — a complementary
 * surface that no prior admin-tree smoke spec covers.
 */
const CLIENT_IDS = [
	'client_1',
	'client_test',
	'client-with-dashes',
	'00000000-0000-4000-8000-000000000000',
	'%E2%9C%93',
	'a'.repeat(64)
] as const;

const CLIENT_PATH = (clientId: string) => `/api/admin/clients/${clientId}`;
const PROBE_ID = CLIENT_IDS[0];

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
	{ headers: { 'X-Real-IP': '10.0.0.1' }, label: 'X-Real-IP header' },
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

	// Plausible update bodies.
	{ data: { displayName: 'Updated' }, label: 'displayName-only update' },
	{ data: { username: 'newuser' }, label: 'username-only update' },
	{ data: { bio: 'Updated bio' }, label: 'bio-only update' },
	{ data: { jobTitle: 'New Title' }, label: 'jobTitle-only update' },
	{ data: { company: 'Acme Inc.' }, label: 'company update (would trigger CRM sync if reachable)' },
	{ data: { website: 'https://example.com' }, label: 'website update (would trigger CRM sync if reachable)' },
	{ data: { status: 'active' }, label: 'status active update' },
	{ data: { status: 'suspended' }, label: 'status suspended update' },
	{ data: { plan: 'premium' }, label: 'plan premium update' },
	{ data: { accountType: 'business' }, label: 'accountType business update' },

	// Bypass attempts.
	{ data: { isAdmin: true, displayName: 'pwn' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'fabricated', displayName: 'pwn' }, label: 'fabricated tenantId attempt' },
	{ data: { userId: 'admin', displayName: 'pwn' }, label: 'fabricated userId attempt' },
	{ data: { padding: 'x'.repeat(2_000), displayName: 'pwn' }, label: 'large padded body' }
] as const;

const FORBIDDEN_MESSAGES = [
	'Client not found',
	'Failed to fetch client',
	'Failed to update client',
	'Failed to delete client',
	'Client deleted successfully'
] as const;

const CANONICAL_LONGER_401_MESSAGE = 'Unauthorized. Admin access required.';
const BARE_401_MESSAGE = 'Unauthorized';

test.describe('API: /api/admin/clients/[clientId] GET / PUT / DELETE method / id / body / header surface', () => {
	for (const clientId of CLIENT_IDS) {
		test(`GET ${CLIENT_PATH(clientId)} responds without a server error`, async ({ request }) => {
			const response = await request.get(CLIENT_PATH(clientId));
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${CLIENT_PATH(clientId)} responds without a server error`, async ({ request }) => {
			const response = await request.put(CLIENT_PATH(clientId));
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${CLIENT_PATH(clientId)} responds without a server error`, async ({ request }) => {
			const response = await request.delete(CLIENT_PATH(clientId));
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of COMMON_HEADERS) {
		test(`GET ${CLIENT_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(CLIENT_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`PUT ${CLIENT_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(CLIENT_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
		test(`DELETE ${CLIENT_PATH(PROBE_ID)} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.delete(CLIENT_PATH(PROBE_ID), { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${CLIENT_PATH(PROBE_ID)} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.put(CLIENT_PATH(PROBE_ID), { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${CLIENT_PATH(PROBE_ID)} returns 401 with the bare Unauthorized envelope (NOT the canonical longer envelope)`, async ({
		request
	}) => {
		const response = await request.get(CLIENT_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: BARE_401_MESSAGE });
		// Pin the envelope-message divergence vs the canonical
		// longer envelope of the sibling `admin/items/[id]`
		// route.
		expect(body.error).not.toBe(CANONICAL_LONGER_401_MESSAGE);
	});

	test(`PUT ${CLIENT_PATH(PROBE_ID)} returns 401 with the bare Unauthorized envelope (NOT the canonical longer envelope)`, async ({
		request
	}) => {
		const response = await request.put(CLIENT_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: BARE_401_MESSAGE });
		expect(body.error).not.toBe(CANONICAL_LONGER_401_MESSAGE);
	});

	test(`DELETE ${CLIENT_PATH(PROBE_ID)} returns 401 with the bare Unauthorized envelope (NOT the canonical longer envelope)`, async ({
		request
	}) => {
		const response = await request.delete(CLIENT_PATH(PROBE_ID));
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: BARE_401_MESSAGE });
		expect(body.error).not.toBe(CANONICAL_LONGER_401_MESSAGE);
	});

	test(`GET / PUT / DELETE ${CLIENT_PATH(PROBE_ID)} unauth envelope has NO success key`, async ({ request }) => {
		// Strict envelope-shape assertion across all three
		// methods: each returns only `{ error: ... }`. The
		// ABSENCE of a `success` key is the cross-route
		// divergence that distinguishes this route's gate
		// from the `{ success: false, error: ... }` envelope
		// of the canonical-longer-envelope family.
		const responses = await Promise.all([
			request.get(CLIENT_PATH(PROBE_ID)),
			request.put(CLIENT_PATH(PROBE_ID)),
			request.delete(CLIENT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(Object.keys(body)).toEqual(['error']);
			expect(body.success).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${CLIENT_PATH(PROBE_ID)} share the SAME 401 envelope shape on the unauth branch`, async ({
		request
	}) => {
		// All three handlers delegate to the SAME inline
		// `!session?.user?.isAdmin` gate, so the unauth
		// envelope must be observably identical across
		// methods.
		const [getResponse, putResponse, deleteResponse] = await Promise.all([
			request.get(CLIENT_PATH(PROBE_ID)),
			request.put(CLIENT_PATH(PROBE_ID)),
			request.delete(CLIENT_PATH(PROBE_ID))
		]);

		expect(getResponse.status()).toBe(401);
		expect(putResponse.status()).toBe(401);
		expect(deleteResponse.status()).toBe(401);

		const [getBody, putBody, deleteBody] = await Promise.all([
			getResponse.json(),
			putResponse.json(),
			deleteResponse.json()
		]);

		expect(getBody).toEqual(putBody);
		expect(getBody).toEqual(deleteBody);
	});

	test(`GET / PUT / DELETE ${CLIENT_PATH(PROBE_ID)} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// GET / PUT success: { success: true, data: <client> }.
		// DELETE success: { success: true, message: 'Client deleted successfully' } (no data key).
		const responses = await Promise.all([
			request.get(CLIENT_PATH(PROBE_ID)),
			request.put(CLIENT_PATH(PROBE_ID), { data: { displayName: 'pwn' } }),
			request.delete(CLIENT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${CLIENT_PATH(PROBE_ID)} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(CLIENT_PATH(PROBE_ID)),
			request.put(CLIENT_PATH(PROBE_ID)),
			request.put(CLIENT_PATH(PROBE_ID), { data: { displayName: 'pwn' } }),
			request.put(CLIENT_PATH(PROBE_ID), { data: { company: 'Acme Inc.' } }),
			request.delete(CLIENT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`GET / PUT / DELETE ${CLIENT_PATH(PROBE_ID)} has a stable status across distinct clientId shapes`, async ({
		request
	}) => {
		const getBaseline = await request.get(CLIENT_PATH(PROBE_ID));
		const putBaseline = await request.put(CLIENT_PATH(PROBE_ID));
		const deleteBaseline = await request.delete(CLIENT_PATH(PROBE_ID));

		const getResponses = await Promise.all(CLIENT_IDS.map((id) => request.get(CLIENT_PATH(id))));
		const putResponses = await Promise.all(CLIENT_IDS.map((id) => request.put(CLIENT_PATH(id))));
		const deleteResponses = await Promise.all(CLIENT_IDS.map((id) => request.delete(CLIENT_PATH(id))));

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

	test(`PUT ${CLIENT_PATH(PROBE_ID)} has a stable status across body permutations`, async ({ request }) => {
		const baseline = await request.put(CLIENT_PATH(PROBE_ID));
		const responses = await Promise.all([
			request.put(CLIENT_PATH(PROBE_ID), { data: {} }),
			request.put(CLIENT_PATH(PROBE_ID), { data: { displayName: 'pwn' } }),
			request.put(CLIENT_PATH(PROBE_ID), { data: { status: 'active' } }),
			request.put(CLIENT_PATH(PROBE_ID), { data: { status: 'suspended' } }),
			request.put(CLIENT_PATH(PROBE_ID), { data: { company: 'Acme Inc.' } }),
			request.put(CLIENT_PATH(PROBE_ID), { data: { isAdmin: true, displayName: 'pwn' } }),
			request.put(CLIENT_PATH(PROBE_ID), { data: { plan: 'premium' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET / PUT / DELETE ${CLIENT_PATH(PROBE_ID)} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(CLIENT_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(CLIENT_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.get(CLIENT_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.put(CLIENT_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(CLIENT_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(CLIENT_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } }),
			request.delete(CLIENT_PATH(PROBE_ID), { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(CLIENT_PATH(PROBE_ID), { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(CLIENT_PATH(PROBE_ID), { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${CLIENT_PATH(PROBE_ID)} cross-method probe (POST / PATCH) does NOT 5xx`, async ({ request }) => {
		// The route exports only `GET`, `PUT`, `DELETE`.
		const responses = await Promise.all([
			request.post(CLIENT_PATH(PROBE_ID)),
			request.patch(CLIENT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT ${CLIENT_PATH(PROBE_ID)} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, malformed JSON would 500 via
		// the outer `console.error` catch (the body parse
		// is NOT wrapped in a per-call try/catch). On the
		// unauth branch the gate fires before any parse.
		const responses = await Promise.all([
			request.put(CLIENT_PATH(PROBE_ID), { data: 'not-json' }),
			request.put(CLIENT_PATH(PROBE_ID), { data: '{ broken: json' }),
			request.put(CLIENT_PATH(PROBE_ID), { data: '{"displayName":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET / PUT / DELETE ${CLIENT_PATH(PROBE_ID)} service call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders ANY of the three
		// query-function calls before the gate would
		// surface here.
		const responses = await Promise.all([
			request.get(CLIENT_PATH(PROBE_ID)),
			request.put(CLIENT_PATH(PROBE_ID), { data: { displayName: 'pwn' } }),
			request.delete(CLIENT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).not.toBe(true);
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET / PUT / DELETE ${CLIENT_PATH(PROBE_ID)} unauth response does NOT echo any of the per-handler catch messages`, async ({
		request
	}) => {
		// The three per-handler `console.error` catches use
		// distinct 500 messages (`'Failed to fetch client'`,
		// `'Failed to update client'`, `'Failed to delete
		// client'`). A regression that swapped any of the
		// three would surface as the wrong message echoing
		// on the auth branch.
		const responses = await Promise.all([
			request.get(CLIENT_PATH(PROBE_ID)),
			request.put(CLIENT_PATH(PROBE_ID), { data: { displayName: 'pwn' } }),
			request.delete(CLIENT_PATH(PROBE_ID))
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Failed to fetch client');
			expect(body.error).not.toBe('Failed to update client');
			expect(body.error).not.toBe('Failed to delete client');
		}
	});
});
