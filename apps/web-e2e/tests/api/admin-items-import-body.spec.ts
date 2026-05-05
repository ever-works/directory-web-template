import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **request-body / header / method
 * surface** of the admin-only items-import-execute endpoint
 * served by
 * `apps/web/app/api/admin/items/import/route.ts`.
 *
 * `POST /api/admin/items/import` is the **first** admin-tree
 * route the smoke layer covers that combines a static-path
 * `POST` handler with a **two-step body validation chain**
 * AFTER the gate AND AFTER the body parse — distinct from
 * the **single-step** body validation of
 * `admin/items/[id]/review`, the **three-step** body
 * validation of `admin/categories/reorder`, and the
 * **six-step** body validation of `admin/items/bulk`. It
 * documents the unique combination of:
 *
 *   1. **`POST` handler with a static path** — distinct
 *      from the dynamic-segment `[id]` routes covered by
 *      `admin-items-id-review-body.spec.ts` and
 *      `admin-items-id-history-query.spec.ts`.
 *   2. **Single-step `auth()` chain** that collapses both
 *      unauthenticated and authenticated-non-admin
 *      branches into the SAME 401 envelope — the SAME
 *      gate shape as the sibling `admin/items/bulk`,
 *      `admin/categories/reorder`,
 *      `admin/twenty-crm/test-connection`,
 *      `admin/items/export`, and
 *      `admin/items/[id]/review` routes.
 *   3. **Canonical longer 401 message**
 *      `'Unauthorized. Admin access required.'` —
 *      matching the sibling `admin/items/bulk`,
 *      `admin/categories/reorder`, and
 *      `admin/items/[id]/review` envelope.
 *   4. **`success: false` envelope key on the 401
 *      branch** — matching the same sibling envelope
 *      family.
 *   5. **Body parse via `await request.json()`** AFTER
 *      the gate — the gate-then-parse-then-validate-then-
 *      service order is the load-bearing invariant of
 *      this route.
 *   6. **Two-step body validation chain** AFTER the gate
 *      AND AFTER the body parse. The two distinct 400
 *      messages are:
 *        (a) `'Missing or invalid rows array.'`
 *            on `!body.rows || !Array.isArray(body.rows)`.
 *        (b) `'Missing import options.'`
 *            on `!body.options`.
 *      The unauth branch must NEVER reach either
 *      validation step — the response body must NOT
 *      contain either of the two 400 messages.
 *   7. **Service-call surface** AFTER the gate AND AFTER
 *      both validation steps — the handler instantiates
 *      `new ItemImportService()` and calls
 *      `executeImport(rows, options)` with the body's
 *      `rows` and the body's `options` merged with two
 *      defaults:
 *        - `duplicateStrategy` defaults to `'skip'` if
 *          `body.options.duplicateStrategy` is falsy.
 *        - `defaultStatus` defaults to `'draft'` if
 *          `body.options.defaultStatus` is falsy.
 *        - `submittedBy` defaults to `'admin'` if
 *          `session.user.email` is falsy.
 *      The success-branch payload shape is
 *      `{ success: true, result }` where `result` is
 *      the `ImportExecutionResult` returned by the
 *      service. The unauth branch must NEVER reach
 *      `executeImport`, so the unauth response body must
 *      NOT contain a `result` key and must NOT contain
 *      `success: true`.
 *   8. **`safeErrorResponse(error, 'Failed to execute import')`
 *      catch** — matching the
 *      `safeErrorResponse(error, 'Failed to process bulk action')`
 *      catch of `admin/items/bulk` and the
 *      `safeErrorResponse(error, 'Failed to fetch item history')`
 *      catch of `admin/items/[id]/history`. The unauth
 *      branch must NEVER reach the catch, so the unauth
 *      response body must NOT contain the
 *      `'Failed to execute import'` message.
 *   9. **Method-resolution surface** — the route exports
 *      ONLY `POST`. Every other method (`GET` / `PUT` /
 *      `PATCH` / `DELETE`) must round-trip to a `< 500`
 *      status (typically 405 Method Not Allowed).
 *
 * Where the immediately-preceding
 * `admin-items-id-history-query.spec.ts` walks a
 * dynamic-segment `GET` route with a query-param surface
 * and a 404 item-existence branch, this spec walks a
 * static-path `POST` route with a JSON body and a
 * two-step body validation chain — a complementary
 * surface that no prior admin-tree smoke spec covers.
 */
const IMPORT_PATH = '/api/admin/items/import';

const ADMIN_ITEMS_IMPORT_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers, no body' },

	// `Content-Type` headers — the route reads the body via `await request.json()`.
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },
	{ headers: { 'Content-Type': 'application/xml' }, label: 'xml content-type' },

	// `Accept` headers — the route does not negotiate content-types today.
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
	{ headers: { 'X-Admin-Token': 'anything' }, label: 'fabricated X-Admin-Token header' },
	{ headers: { 'X-Forwarded-Host': 'admin.evil.example' }, label: 'fabricated X-Forwarded-Host header' },
	{ headers: { 'User-Agent': 'admin-bot/1.0' }, label: 'spoofed User-Agent' },
	{ headers: { 'Accept-Language': 'en-US,en;q=0.9' }, label: 'Accept-Language header' }
] as const;

const VALID_OPTIONS = { duplicateStrategy: 'skip', defaultStatus: 'draft' } as const;

const ADMIN_ITEMS_IMPORT_BODIES = [
	// Body permutations — body validation is unreachable on
	// the unauth branch, so every permutation must round-trip
	// to the SAME 401 envelope.
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Step (a) probes — `'Missing or invalid rows array.'`.
	{ data: { options: VALID_OPTIONS }, label: 'no rows key (would 400 if reachable)' },
	{ data: { rows: null, options: VALID_OPTIONS }, label: 'null rows (would 400 if reachable)' },
	{ data: { rows: 'not-an-array', options: VALID_OPTIONS }, label: 'string rows (would 400 if reachable)' },
	{ data: { rows: 123, options: VALID_OPTIONS }, label: 'numeric rows (would 400 if reachable)' },
	{ data: { rows: {}, options: VALID_OPTIONS }, label: 'object rows (would 400 if reachable)' },
	{ data: { rows: false, options: VALID_OPTIONS }, label: 'boolean rows (would 400 if reachable)' },

	// Step (b) probes — `'Missing import options.'`.
	{ data: { rows: [] }, label: 'no options key (would 400 if reachable)' },
	{ data: { rows: [], options: null }, label: 'null options (would 400 if reachable)' },
	{ data: { rows: [], options: undefined }, label: 'undefined options (would 400 if reachable)' },
	{ data: { rows: [], options: 0 }, label: 'falsy zero options (would 400 if reachable)' },
	{ data: { rows: [], options: '' }, label: 'empty string options (would 400 if reachable)' },
	{ data: { rows: [], options: false }, label: 'false options (would 400 if reachable)' },

	// Valid bodies — would call `executeImport(...)` if reachable.
	{ data: { rows: [], options: VALID_OPTIONS }, label: 'valid empty-rows body (would call service if reachable)' },
	{
		data: {
			rows: [
				{ rowNumber: 1, data: { name: 'Item 1', description: 'desc' }, errors: [], warnings: [] },
				{ rowNumber: 2, data: { name: 'Item 2', description: 'desc' }, errors: [], warnings: [] }
			],
			options: { duplicateStrategy: 'skip', defaultStatus: 'draft' }
		},
		label: 'valid two-row body (would call service if reachable)'
	},
	{
		data: { rows: [], options: { duplicateStrategy: 'overwrite', defaultStatus: 'pending' } },
		label: 'valid overwrite + pending body (would call service if reachable)'
	},
	{
		data: { rows: [], options: { duplicateStrategy: 'rename', defaultStatus: 'approved' } },
		label: 'valid rename + approved body (would call service if reachable)'
	},
	{
		data: { rows: [], options: { duplicateStrategy: '', defaultStatus: '' } },
		label: 'valid options with falsy fields (would default to skip + draft)'
	},

	// Bypass attempts.
	{ data: { isAdmin: true, rows: [], options: VALID_OPTIONS }, label: 'isAdmin=true bypass attempt with valid body' },
	{
		data: { tenantId: 'fabricated', rows: [], options: VALID_OPTIONS },
		label: 'fabricated tenantId attempt with valid body'
	},
	{
		data: { userId: 'admin', rows: [], options: VALID_OPTIONS },
		label: 'fabricated userId attempt with valid body'
	},
	{ data: { token: 'anything', rows: [], options: VALID_OPTIONS }, label: 'token bypass attempt with valid body' },
	{
		data: { padding: 'x'.repeat(2_000), rows: [], options: VALID_OPTIONS },
		label: 'large padded body with valid rows + options'
	}
] as const;

const VALIDATION_400_MESSAGES = ['Missing or invalid rows array.', 'Missing import options.'] as const;

const CATCH_500_MESSAGE = 'Failed to execute import';
const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

test.describe('API: /api/admin/items/import method / body / header surface', () => {
	for (const { headers, label } of ADMIN_ITEMS_IMPORT_HEADERS) {
		test(`POST ${IMPORT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(IMPORT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of ADMIN_ITEMS_IMPORT_BODIES) {
		test(`POST ${IMPORT_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(IMPORT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${IMPORT_PATH} returns 401 with the canonical longer Unauthorized envelope`, async ({ request }) => {
		// The unauthenticated POST branch is the load-bearing
		// invariant: the single-step gate
		// `if (!session?.user?.isAdmin)` fires, returning 401
		// with the `success: false` envelope and the canonical
		// longer message
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		const response = await request.post(IMPORT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`POST ${IMPORT_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// The success branch returns
		// `{ success: true, result }`. The unauth branch must
		// NEVER reach the `executeImport(...)` call, so the
		// response body must NOT contain a `result` key and
		// must NOT contain `success: true`.
		const response = await request.post(IMPORT_PATH, {
			data: { rows: [], options: VALID_OPTIONS }
		});
		const body = await response.json();
		expect(body.result).toBeUndefined();
		expect(body.success).not.toBe(true);
	});

	test(`POST ${IMPORT_PATH} does NOT echo either of the two body-validation 400 messages on the unauth branch`, async ({
		request
	}) => {
		// The two 400 envelopes for the body-validation steps
		// are the load-bearing invariant of the body
		// validation chain. The unauth branch fires the gate
		// BEFORE the body parse, so the unauth response must
		// NEVER contain EITHER of the two 400 messages. A
		// regression that re-orders EITHER of the validation
		// steps before the gate would surface here.
		const responses = await Promise.all([
			// Step (a) probe: missing rows.
			request.post(IMPORT_PATH, { data: { options: VALID_OPTIONS } }),
			// Step (a) probe: non-array rows.
			request.post(IMPORT_PATH, { data: { rows: 'not-an-array', options: VALID_OPTIONS } }),
			// Step (b) probe: missing options.
			request.post(IMPORT_PATH, { data: { rows: [] } }),
			// Step (b) probe: null options.
			request.post(IMPORT_PATH, { data: { rows: [], options: null } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of VALIDATION_400_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
		}
	});

	test(`POST ${IMPORT_PATH} does NOT echo the catch-branch 500 message on the unauth branch`, async ({ request }) => {
		// The catch branch returns
		// `safeErrorResponse(error, 'Failed to execute import')`.
		// The unauth branch must NEVER reach the catch, so
		// the unauth response body must NOT contain the
		// `'Failed to execute import'` message. A regression
		// that swaps the gate for a try-catch wrapper that
		// swallows auth failures would surface here.
		const response = await request.post(IMPORT_PATH);
		const body = await response.json();
		expect(body.error).not.toBe(CATCH_500_MESSAGE);
		expect(body.error).toBe(CANONICAL_401_MESSAGE);
	});

	test(`POST ${IMPORT_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		// The single-step gate fires before the body parse,
		// so every permutation must round-trip to the same
		// 401 status as the no-body baseline.
		const baseline = await request.post(IMPORT_PATH);
		const responses = await Promise.all([
			request.post(IMPORT_PATH, { data: {} }),
			request.post(IMPORT_PATH, { data: { rows: [], options: VALID_OPTIONS } }),
			request.post(IMPORT_PATH, {
				data: { rows: [], options: { duplicateStrategy: 'overwrite', defaultStatus: 'pending' } }
			}),
			request.post(IMPORT_PATH, { data: { rows: 'not-an-array', options: VALID_OPTIONS } }),
			request.post(IMPORT_PATH, { data: { rows: [] } }),
			request.post(IMPORT_PATH, { data: { isAdmin: true, rows: [], options: VALID_OPTIONS } }),
			request.post(IMPORT_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(IMPORT_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${IMPORT_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		// A regression that switches the gate to a custom
		// auth resolver that consults `request.cookies` /
		// `request.geo` / `request.ip` / fabricated tenant-
		// or user-id headers would change the unauth-branch
		// behaviour.
		const responses = await Promise.all([
			request.post(IMPORT_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(IMPORT_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(IMPORT_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(IMPORT_PATH, { headers: { 'X-Real-IP': '10.0.0.1' } }),
			request.post(IMPORT_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(IMPORT_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(IMPORT_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(IMPORT_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(IMPORT_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${IMPORT_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		// The route only exports `POST`. Every other method
		// (GET / PUT / PATCH / DELETE) must round-trip to a
		// `< 500` status (typically 405 Method Not Allowed).
		// A 5xx on any other method would indicate the
		// Next.js routing layer crashed before the method-
		// resolution returned its canonical 405.
		const responses = await Promise.all([
			request.get(IMPORT_PATH),
			request.put(IMPORT_PATH),
			request.patch(IMPORT_PATH),
			request.delete(IMPORT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${IMPORT_PATH} Unauthorized error envelope echoes the success: false key`, async ({ request }) => {
		// Strict envelope-shape assertion: the canonical
		// longer envelope is
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		// The presence of the `success: false` key is the
		// cross-route divergence that distinguishes this
		// route's gate from the bare-message gates.
		const response = await request.post(IMPORT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`POST ${IMPORT_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({ request }) => {
		// A regression that runs the body parse before the
		// gate would surface here: a malformed JSON body
		// would 400 with a JSON-parse error instead of 401
		// with the canonical longer Unauthorized envelope.
		const responses = await Promise.all([
			request.post(IMPORT_PATH, { data: 'not-json' }),
			request.post(IMPORT_PATH, { data: '{ broken: json' }),
			request.post(IMPORT_PATH, { data: '{"rows": []' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${IMPORT_PATH} service call is NOT entered on the unauth branch`, async ({ request }) => {
		// The success branch returns
		// `{ success: true, result }` where `result` is the
		// `ImportExecutionResult` from `executeImport(...)`.
		// A regression that re-orders the service call
		// before the gate would surface as a `result` object
		// (with `successful` / `failed` / `skipped` keys, or
		// any other service-shaped key) appearing in the
		// unauth response body.
		const responses = await Promise.all([
			request.post(IMPORT_PATH, { data: { rows: [], options: VALID_OPTIONS } }),
			request.post(IMPORT_PATH, {
				data: { rows: [], options: { duplicateStrategy: 'overwrite', defaultStatus: 'pending' } }
			}),
			request.post(IMPORT_PATH, {
				data: {
					rows: [{ rowNumber: 1, data: { name: 'Item 1' }, errors: [], warnings: [] }],
					options: VALID_OPTIONS
				}
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.result).toBeUndefined();
			expect(body.success).not.toBe(true);
		}
	});

	test(`POST ${IMPORT_PATH} is invariant to duplicate-strategy / default-status enum shapes on the unauth branch`, async ({
		request
	}) => {
		// The handler defaults `duplicateStrategy` to
		// `'skip'` and `defaultStatus` to `'draft'` only
		// AFTER the gate AND AFTER both validation steps. A
		// regression that runs the default-fallback before
		// the gate would surface here: every enum shape
		// (valid + invalid + falsy) must round-trip to the
		// same 401 status as the no-body baseline.
		const baseline = await request.post(IMPORT_PATH);
		const responses = await Promise.all([
			request.post(IMPORT_PATH, {
				data: { rows: [], options: { duplicateStrategy: 'skip', defaultStatus: 'draft' } }
			}),
			request.post(IMPORT_PATH, {
				data: { rows: [], options: { duplicateStrategy: 'overwrite', defaultStatus: 'pending' } }
			}),
			request.post(IMPORT_PATH, {
				data: { rows: [], options: { duplicateStrategy: 'rename', defaultStatus: 'approved' } }
			}),
			request.post(IMPORT_PATH, {
				data: { rows: [], options: { duplicateStrategy: '', defaultStatus: '' } }
			}),
			request.post(IMPORT_PATH, {
				data: { rows: [], options: { duplicateStrategy: 'invalid-shape', defaultStatus: 'invalid-shape' } }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${IMPORT_PATH} is invariant to large rows-array shapes on the unauth branch`, async ({ request }) => {
		// A regression that streams the `rows` array into
		// the service before the gate would surface here:
		// a 100-row body and a 1000-row body must round-trip
		// to the same 401 status as the empty-rows body.
		const baseline = await request.post(IMPORT_PATH, { data: { rows: [], options: VALID_OPTIONS } });
		const responses = await Promise.all([
			request.post(IMPORT_PATH, {
				data: {
					rows: Array.from({ length: 10 }, (_, i) => ({
						rowNumber: i + 1,
						data: { name: `Item ${i + 1}` },
						errors: [],
						warnings: []
					})),
					options: VALID_OPTIONS
				}
			}),
			request.post(IMPORT_PATH, {
				data: {
					rows: Array.from({ length: 100 }, (_, i) => ({
						rowNumber: i + 1,
						data: { name: `Item ${i + 1}` },
						errors: [],
						warnings: []
					})),
					options: VALID_OPTIONS
				}
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
