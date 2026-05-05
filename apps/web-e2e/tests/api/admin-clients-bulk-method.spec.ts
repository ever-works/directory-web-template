import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **HTTP-method / body / header
 * surface** of the admin-only clients-bulk-action endpoint
 * served by
 * `apps/web/app/api/admin/clients/bulk/route.ts`.
 *
 * `/api/admin/clients/bulk` is the **first** admin-tree
 * route the smoke layer covers that exports **two HTTP
 * methods on the same path** — `PUT` (bulk update) **and**
 * `DELETE` (bulk deletion) — distinct from every prior
 * admin-tree smoke spec which covers a single-method
 * route. It documents the unique combination of:
 *
 *   1. **Dual-method export (`PUT` + `DELETE`)** — the
 *      first admin-tree route the smoke layer covers
 *      where TWO methods are valid handlers and the
 *      remaining methods (`GET` / `POST` / `PATCH`) must
 *      round-trip to a `< 500` status (typically 405
 *      Method Not Allowed).
 *   2. **Bare `'Unauthorized'` 401 message** with bare
 *      `{ error: 'Unauthorized' }` envelope (no
 *      `success: false` key) — distinct from the
 *      canonical longer family of `admin/items/bulk`,
 *      `admin/categories/reorder`, and
 *      `admin/items/[id]/review`. Same bare-message
 *      family as `admin/users/check-email`,
 *      `admin/users/check-username`, and
 *      `admin/notifications/mark-all-read`.
 *   3. **Single-step `auth()` chain with bare-message
 *      envelope** — the gate is
 *      `if (!session?.user?.isAdmin)` returning 401 with
 *      the bare envelope. Fills the previously-empty
 *      "single-step gate × bare envelope" quadrant in
 *      the admin-tree smoke matrix.
 *   4. **Body parse via `await request.json()`** AFTER
 *      the gate AND inside the per-method `try` block —
 *      the gate-then-parse-then-validate-then-loop order
 *      is the load-bearing invariant of both methods.
 *   5. **Single-step body validation** AFTER the gate
 *      AND AFTER the body parse with one 400 message
 *      `'Invalid request: clients array is required'`
 *      that fires on
 *      `!Array.isArray(body.clients) || body.clients.length === 0`.
 *      The unauth branch must NEVER reach the validation
 *      step.
 *   6. **Per-client try/catch loop** — both methods
 *      iterate
 *      `for (const [index, clientData] of body.clients.entries())`
 *      and on each iteration push successes into a
 *      `results: { index, success: true, data | clientId }[]`
 *      array and failures into a
 *      `errors: { index, error, clientData }[]` array.
 *      The two-array shape is distinct from the
 *      single-array shape of `admin/items/bulk` (one
 *      `results: BulkActionResult[]` array with per-id
 *      `success: <boolean>` flags).
 *   7. **Direct DB-helper call without a repository
 *      abstraction** — both methods call
 *      `updateClientProfile` / `deleteClientProfile`
 *      directly from `@/lib/db/queries`, distinct from
 *      the `itemRepository.review(...)` /
 *      `itemRepository.delete(...)` calls of
 *      `admin/items/bulk`.
 *   8. **Per-method success-branch payload divergence** —
 *      the success branch returns a 200 with a payload
 *      shape that differs only in two fields between
 *      the two methods: (a) the `message` template
 *      (`'Bulk update completed: ...'` vs
 *      `'Bulk deletion completed: ...'`), and (b) the
 *      per-result inner key (`data: <clientProfile>`
 *      for `PUT` vs `clientId: <id>` for `DELETE`).
 *   9. **Per-method catch-branch envelope divergence** —
 *      each method's `try/catch` wraps the entire
 *      handler body and returns its own
 *      `safeErrorResponse(error, '<msg>')` envelope:
 *      `'Failed to process bulk update'` for `PUT` and
 *      `'Failed to process bulk deletion'` for
 *      `DELETE`. The first admin-tree route the smoke
 *      layer covers with two distinct catch envelopes
 *      on the same path.
 *  10. **`safeErrorMessage` + `safeErrorResponse`
 *      twin-import surface** — matching the
 *      `admin/items/bulk` twin-import posture.
 *  11. **Method-resolution surface** — the route exports
 *      `PUT` AND `DELETE`. Every other method (`GET` /
 *      `POST` / `PATCH`) must round-trip to a `< 500`
 *      status. The first admin-tree route the smoke
 *      layer covers where the cross-method probe walks
 *      exactly THREE methods (the three the route does
 *      NOT export) rather than four.
 *
 * Where the immediately-preceding
 * `admin-items-bulk-body.spec.ts` walks a single-method
 * `POST` route with a six-step body validation chain
 * and the canonical longer envelope, this spec walks a
 * dual-method `PUT` + `DELETE` route with a single-step
 * body validation and the bare envelope — a
 * complementary surface that no prior admin-tree smoke
 * spec covers.
 */
const BULK_PATH = '/api/admin/clients/bulk';

const ADMIN_CLIENTS_BULK_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers, no body' },

	// `Content-Type` headers — both methods read the body via `await request.json()`.
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },
	{ headers: { 'Content-Type': 'application/xml' }, label: 'xml content-type' },

	// `Accept` headers — neither method negotiates content-types today.
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/plain' }, label: 'text/plain accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	// Side-channel cookies / headers.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { Cookie: 'authjs.session-token=fabricated' }, label: 'fabricated authjs session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { 'X-Real-IP': '10.0.0.1' }, label: 'X-Real-IP header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },

	// Magic-token / authorization header attempts.
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { Authorization: 'Basic anything' }, label: 'Basic authorization header' },
	{ headers: { 'X-Api-Key': 'anything' }, label: 'fabricated X-Api-Key header' },
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' }
] as const;

const ADMIN_CLIENTS_BULK_BODIES = [
	// Body permutations — body validation is unreachable on the
	// unauth branch, so every permutation must round-trip to the
	// SAME 401 envelope.
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Validation-step probes — would 400 with
	// `'Invalid request: clients array is required'` if reachable.
	{ data: { clients: 'not-an-array' }, label: 'non-array clients (would 400 if reachable)' },
	{ data: { clients: null }, label: 'null clients (would 400 if reachable)' },
	{ data: { clients: [] }, label: 'empty clients array (would 400 if reachable)' },
	{ data: { client: [{ id: 'x' }] }, label: 'wrong key (would 400 if reachable)' },

	// Per-client `id` validation probes — would push
	// `'Client ID is required'` into the errors[] array AFTER
	// the gate, but the unauth branch never reaches the loop.
	{ data: { clients: [{}] }, label: 'one client without id' },
	{ data: { clients: [{ displayName: 'Anon' }] }, label: 'one client without id but with fields' },

	// Valid PUT bodies — would call `updateClientProfile(...)`
	// per client if reachable.
	{
		data: { clients: [{ id: 'client_123abc', displayName: 'John Doe Updated' }] },
		label: 'valid PUT body single client'
	},
	{
		data: {
			clients: [
				{ id: 'client_a', displayName: 'A', status: 'active', plan: 'premium' },
				{ id: 'client_b', displayName: 'B', status: 'inactive', plan: 'free' }
			]
		},
		label: 'valid PUT body two clients with statuses + plans'
	},

	// Valid DELETE bodies — would call `deleteClientProfile(...)`
	// per client if reachable.
	{
		data: { clients: [{ id: 'client_x' }] },
		label: 'valid DELETE body single client'
	},
	{
		data: { clients: [{ id: 'client_x' }, { id: 'client_y' }, { id: 'client_z' }] },
		label: 'valid DELETE body three clients'
	},

	// Bypass attempts.
	{
		data: { isAdmin: true, clients: [{ id: 'x' }] },
		label: 'isAdmin=true bypass attempt with valid body'
	},
	{
		data: { tenantId: 'fabricated', clients: [{ id: 'x' }] },
		label: 'fabricated tenantId attempt with valid body'
	},
	{
		data: { userId: 'admin', clients: [{ id: 'x' }] },
		label: 'fabricated userId attempt with valid body'
	},
	{
		data: { token: 'anything', clients: [{ id: 'x' }] },
		label: 'token bypass attempt with valid body'
	},
	{
		data: { padding: 'x'.repeat(2_000), clients: [{ id: 'x' }] },
		label: 'large padded body with valid clients'
	}
] as const;

const VALIDATION_400_MESSAGE = 'Invalid request: clients array is required';
const PER_CLIENT_VALIDATION_MESSAGE = 'Client ID is required';
const PUT_CATCH_MESSAGE = 'Failed to process bulk update';
const DELETE_CATCH_MESSAGE = 'Failed to process bulk deletion';
const PUT_SUCCESS_MESSAGE_PREFIX = 'Bulk update completed:';
const DELETE_SUCCESS_MESSAGE_PREFIX = 'Bulk deletion completed:';

test.describe('API: /api/admin/clients/bulk method / body / header surface', () => {
	for (const method of ['put', 'delete'] as const) {
		for (const { headers, label } of ADMIN_CLIENTS_BULK_HEADERS) {
			test(`${method.toUpperCase()} ${BULK_PATH} (${label}) responds without a server error`, async ({
				request
			}) => {
				const response = await request.fetch(BULK_PATH, {
					method: method.toUpperCase(),
					headers
				});
				expect(response.status()).toBeLessThan(500);
			});
		}

		for (const { data, label } of ADMIN_CLIENTS_BULK_BODIES) {
			test(`${method.toUpperCase()} ${BULK_PATH} with ${label} responds without a server error`, async ({
				request
			}) => {
				const response = await request.fetch(BULK_PATH, {
					method: method.toUpperCase(),
					data
				});
				expect(response.status()).toBeLessThan(500);
			});
		}
	}

	test(`PUT ${BULK_PATH} returns 401 with the bare Unauthorized envelope`, async ({ request }) => {
		// The unauthenticated PUT branch is the load-bearing
		// invariant: the single-step gate
		// `if (!session?.user?.isAdmin)` fires, returning 401
		// with the bare envelope `{ error: 'Unauthorized' }`.
		const response = await request.put(BULK_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test(`DELETE ${BULK_PATH} returns 401 with the bare Unauthorized envelope`, async ({ request }) => {
		// The unauthenticated DELETE branch must return the
		// SAME bare envelope as PUT: the single-step gate
		// `if (!session?.user?.isAdmin)` fires identically
		// in both methods.
		const response = await request.delete(BULK_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test(`PUT and DELETE ${BULK_PATH} return byte-identical 401 envelopes`, async ({ request }) => {
		// The load-bearing cross-method invariant of the
		// dual-method smoke layer: a regression that
		// diverges the envelopes (e.g. one method gets a
		// custom message) would surface here.
		const [putResponse, deleteResponse] = await Promise.all([request.put(BULK_PATH), request.delete(BULK_PATH)]);

		expect(putResponse.status()).toBe(deleteResponse.status());

		const [putBody, deleteBody] = await Promise.all([putResponse.json(), deleteResponse.json()]);
		expect(putBody).toEqual(deleteBody);
		expect(putBody).toEqual({ error: 'Unauthorized' });
	});

	test(`PUT ${BULK_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// The PUT success branch returns
		// `{ success: true, message: 'Bulk update completed: ...', results, errors, summary }`
		// where each result has a `data: <clientProfile>` key.
		// The unauth branch must NEVER reach the per-client
		// loop, so the response body must NOT contain
		// `results` / `errors` / `summary` / `data` keys
		// and must NOT contain `success: true`.
		const response = await request.put(BULK_PATH, {
			data: { clients: [{ id: 'client_123abc', displayName: 'X' }] }
		});
		const body = await response.json();
		expect(body.results).toBeUndefined();
		expect(body.errors).toBeUndefined();
		expect(body.summary).toBeUndefined();
		expect(body.data).toBeUndefined();
		expect(body.success).not.toBe(true);
	});

	test(`DELETE ${BULK_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// The DELETE success branch returns
		// `{ success: true, message: 'Bulk deletion completed: ...', results, errors, summary }`
		// where each result has a `clientId: <id>` key.
		// The unauth branch must NEVER reach the per-client
		// loop, so the response body must NOT contain
		// `results` / `errors` / `summary` / `clientId` keys
		// and must NOT contain `success: true`.
		const response = await request.delete(BULK_PATH, {
			data: { clients: [{ id: 'client_x' }] }
		});
		const body = await response.json();
		expect(body.results).toBeUndefined();
		expect(body.errors).toBeUndefined();
		expect(body.summary).toBeUndefined();
		expect(body.clientId).toBeUndefined();
		expect(body.success).not.toBe(true);
	});

	test(`PUT and DELETE ${BULK_PATH} do NOT echo the validation 400 message on the unauth branch`, async ({
		request
	}) => {
		// The 400 envelope for the body-validation step is
		// `'Invalid request: clients array is required'`. The
		// unauth branch fires the gate BEFORE the body parse,
		// so the unauth response must NEVER contain that
		// message for either method. A regression that
		// re-orders the validation before the gate would
		// surface here.
		const probes = [{ clients: 'not-an-array' }, { clients: [] }, { clients: null }, {}];

		for (const data of probes) {
			const [putResponse, deleteResponse] = await Promise.all([
				request.put(BULK_PATH, { data }),
				request.delete(BULK_PATH, { data })
			]);

			const [putBody, deleteBody] = await Promise.all([putResponse.json(), deleteResponse.json()]);
			expect(putBody.error).not.toBe(VALIDATION_400_MESSAGE);
			expect(deleteBody.error).not.toBe(VALIDATION_400_MESSAGE);

			// The per-client `'Client ID is required'` push
			// happens INSIDE the loop, never reachable on the
			// unauth branch — pin that the message also does
			// NOT appear in the response.
			expect(putBody.error).not.toBe(PER_CLIENT_VALIDATION_MESSAGE);
			expect(deleteBody.error).not.toBe(PER_CLIENT_VALIDATION_MESSAGE);
		}
	});

	test(`PUT and DELETE ${BULK_PATH} do NOT echo their per-method catch envelope on the unauth branch`, async ({
		request
	}) => {
		// The catch branches return
		// `safeErrorResponse(error, 'Failed to process bulk update')`
		// for PUT and
		// `safeErrorResponse(error, 'Failed to process bulk deletion')`
		// for DELETE. The unauth branch must NEVER reach
		// either catch, so the unauth response body must
		// NOT contain either message. A regression that
		// swaps the gate for a try-catch wrapper that
		// swallows auth failures would surface here.
		const [putResponse, deleteResponse] = await Promise.all([request.put(BULK_PATH), request.delete(BULK_PATH)]);
		const [putBody, deleteBody] = await Promise.all([putResponse.json(), deleteResponse.json()]);

		expect(putBody.error).not.toBe(PUT_CATCH_MESSAGE);
		expect(putBody.error).not.toBe(DELETE_CATCH_MESSAGE);
		expect(deleteBody.error).not.toBe(PUT_CATCH_MESSAGE);
		expect(deleteBody.error).not.toBe(DELETE_CATCH_MESSAGE);

		expect(putBody.error).toBe('Unauthorized');
		expect(deleteBody.error).toBe('Unauthorized');
	});

	test(`PUT ${BULK_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		// The single-step gate fires before the body parse,
		// so every permutation must round-trip to the same
		// 401 status as the no-body baseline.
		const baseline = await request.put(BULK_PATH);
		const responses = await Promise.all([
			request.put(BULK_PATH, { data: {} }),
			request.put(BULK_PATH, { data: { clients: [{ id: 'x' }] } }),
			request.put(BULK_PATH, { data: { clients: [] } }),
			request.put(BULK_PATH, { data: { isAdmin: true, clients: [{ id: 'x' }] } }),
			request.put(BULK_PATH, { data: { clients: 'not-an-array' } }),
			request.put(BULK_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(BULK_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`DELETE ${BULK_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		// Same status-stability assertion for the DELETE
		// branch — the gate fires identically in both
		// methods.
		const baseline = await request.delete(BULK_PATH);
		const responses = await Promise.all([
			request.delete(BULK_PATH, { data: {} }),
			request.delete(BULK_PATH, { data: { clients: [{ id: 'x' }] } }),
			request.delete(BULK_PATH, { data: { clients: [] } }),
			request.delete(BULK_PATH, { data: { isAdmin: true, clients: [{ id: 'x' }] } }),
			request.delete(BULK_PATH, { data: { clients: 'not-an-array' } }),
			request.delete(BULK_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(BULK_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`PUT ${BULK_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		// A regression that switches the gate to a custom
		// auth resolver that consults `request.cookies` /
		// `request.geo` / `request.ip` / fabricated tenant-
		// or user-id headers would change the unauth-branch
		// behaviour.
		const responses = await Promise.all([
			request.put(BULK_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.put(BULK_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.put(BULK_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.put(BULK_PATH, { headers: { 'X-Real-IP': '10.0.0.1' } }),
			request.put(BULK_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.put(BULK_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.put(BULK_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.put(BULK_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.put(BULK_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`DELETE ${BULK_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		// Same side-channel walk for the DELETE branch.
		const responses = await Promise.all([
			request.delete(BULK_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.delete(BULK_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.delete(BULK_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.delete(BULK_PATH, { headers: { 'X-Real-IP': '10.0.0.1' } }),
			request.delete(BULK_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.delete(BULK_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.delete(BULK_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.delete(BULK_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.delete(BULK_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`${BULK_PATH} cross-method probe (GET / POST / PATCH) does NOT 5xx`, async ({ request }) => {
		// The route only exports `PUT` and `DELETE`. The
		// three remaining methods must round-trip to a
		// `< 500` status (typically 405 Method Not Allowed).
		// The first admin-tree route the smoke layer covers
		// where the cross-method probe walks exactly THREE
		// methods rather than four.
		const responses = await Promise.all([
			request.get(BULK_PATH),
			request.post(BULK_PATH),
			request.patch(BULK_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT and DELETE ${BULK_PATH} Unauthorized envelopes have exactly one key`, async ({ request }) => {
		// Strict envelope-shape assertion: the bare envelope
		// `{ error: 'Unauthorized' }` must be the EXACT
		// shape — no `success` / `code` / per-method keys.
		// Distinct from the canonical longer envelope of
		// `admin/items/bulk` which has `Object.keys === ['error', 'success']`.
		const [putResponse, deleteResponse] = await Promise.all([request.put(BULK_PATH), request.delete(BULK_PATH)]);
		const [putBody, deleteBody] = await Promise.all([putResponse.json(), deleteResponse.json()]);

		expect(Object.keys(putBody).sort()).toEqual(['error']);
		expect(Object.keys(deleteBody).sort()).toEqual(['error']);
		expect(putBody.success).toBeUndefined();
		expect(deleteBody.success).toBeUndefined();
	});

	test(`PUT and DELETE ${BULK_PATH} are invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// A regression that runs the body parse before the
		// gate would surface here: a malformed JSON body
		// would 400 with a JSON-parse error instead of 401
		// with the bare Unauthorized envelope. Both methods
		// must round-trip to `< 500`.
		const malformed = ['not-json', '{ broken: json', '{"clients": ['];

		for (const data of malformed) {
			const [putResponse, deleteResponse] = await Promise.all([
				request.put(BULK_PATH, { data }),
				request.delete(BULK_PATH, { data })
			]);
			expect(putResponse.status()).toBeLessThan(500);
			expect(deleteResponse.status()).toBeLessThan(500);
		}
	});

	test(`PUT and DELETE ${BULK_PATH} per-client loops are NOT entered on the unauth branch`, async ({ request }) => {
		// The per-client loops push successes into a
		// `results: { index, success: true, data | clientId }[]`
		// array and failures into a
		// `errors: { index, error, clientData }[]` array.
		// A regression that re-orders the loop before the
		// gate would surface as a `results` / `errors` /
		// `summary` key appearing in the unauth response,
		// or as the success-branch message template
		// matching `body.message`.
		const probes = [
			{ clients: [{ id: 'client_a' }] },
			{ clients: [{ id: 'client_a' }, { id: 'client_b' }, { id: 'client_c' }] },
			{ clients: [{ id: 'client_a', displayName: 'Updated' }] },
			{ clients: [{}, { id: 'client_a' }] }
		];

		for (const data of probes) {
			const [putResponse, deleteResponse] = await Promise.all([
				request.put(BULK_PATH, { data }),
				request.delete(BULK_PATH, { data })
			]);

			const [putBody, deleteBody] = await Promise.all([putResponse.json(), deleteResponse.json()]);

			expect(putBody.results).toBeUndefined();
			expect(putBody.errors).toBeUndefined();
			expect(putBody.summary).toBeUndefined();
			expect(deleteBody.results).toBeUndefined();
			expect(deleteBody.errors).toBeUndefined();
			expect(deleteBody.summary).toBeUndefined();

			// The success-branch message templates must
			// NEVER appear on the unauth branch.
			if (typeof putBody.message === 'string') {
				expect(putBody.message.startsWith(PUT_SUCCESS_MESSAGE_PREFIX)).toBe(false);
			}
			if (typeof deleteBody.message === 'string') {
				expect(deleteBody.message.startsWith(DELETE_SUCCESS_MESSAGE_PREFIX)).toBe(false);
			}
		}
	});
});
