import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header
 * surface** of the client-scoped item-import endpoint
 * served by the `POST` export of
 * `apps/web/app/api/client/items/import/route.ts`.
 *
 * `POST /api/client/items/import` is the **first per-
 * source-file POST smoke** the docs tree publishes
 * that pins a **`requireClientAuth()`-gated batch-
 * import handler** that delegates to the
 * `ItemImportService.executeImport` service entry
 * point. UNIQUE: every prior per-source-file
 * `client-items*` smoke pins a CRUD-style handler
 * (collection GET / POST list, per-id GET / PUT /
 * DELETE, stats GET); this is the FIRST that pins a
 * batch-import handler that fans out to a service
 * layer.
 *
 * It also pins the **NESTED `body.rows` array
 * contract**, the **`'Missing or invalid rows
 * array.'`** Zod-free 400 message (UNIQUE: a manual
 * `Array.isArray` guard, NOT a Zod `safeParse`),
 * the **`safeErrorResponse(error, 'Failed to execute
 * import')` outer-catch helper** (UNIQUE — sourced
 * from `@/lib/utils/api-error`, NOT
 * `client-auth.serverErrorResponse`), and the
 * **`{ success, result }` success payload** with the
 * service-derived result aggregate
 * (`{ total, created, updated, skipped, errors }`).
 *
 * Distinct from EVERY prior per-source-file POST
 * smoke:
 *
 *   - **`requireClientAuth()` + service delegation**
 *     pair — UNIQUE: the FIRST per-source-file POST
 *     smoke that gates a service-layer batch entry
 *     point with the `requireClientAuth` helper.
 *   - **Nested `body.rows` array contract** —
 *     `body.rows` MUST be an `Array.isArray` non-
 *     null array, otherwise 400 with the message
 *     `'Missing or invalid rows array.'`. UNIQUE: the
 *     FIRST per-source-file POST smoke pinning a
 *     manual `Array.isArray` guard (vs Zod
 *     `safeParse`).
 *   - **`safeErrorResponse(error, 'Failed to execute
 *     import')` outer-catch** — UNIQUE: this helper
 *     comes from `@/lib/utils/api-error` (NOT
 *     `client-auth.serverErrorResponse`).
 *   - **`{ success, result }` success payload with
 *     service-derived result aggregate** — `result`
 *     has the shape `{ total, created, updated,
 *     skipped, errors }`. UNIQUE: the FIRST per-
 *     source-file POST smoke pinning a `result`-keyed
 *     success payload (vs `item`-keyed,
 *     `subscription`-keyed, `data`-keyed,
 *     `stats`-keyed prior siblings).
 *   - **`'Unauthorized. Please sign in to
 *     continue.'`** longer-message TWO-key 401
 *     envelope (matches `client-items-method-spec.md`,
 *     `client-items-id-method-spec.md`, and
 *     `client-items-stats-query-spec.md`).
 *
 *   1. **POST handler** — `requireClientAuth()` →
 *      discriminated-union check; JSON body parse
 *      (`request.json()` cast as
 *      `ClientImportRequestBody`); `Array.isArray`
 *      guard on `body.rows` → 400
 *      `'Missing or invalid rows array.'`;
 *      `new ItemImportService().executeImport(rows, {
 *      duplicateStrategy: 'skip', defaultStatus:
 *      'pending', submittedBy: userId })`; success
 *      returns `{ success: true, result }`; outer
 *      catch → `safeErrorResponse(error, 'Failed to
 *      execute import')`.
 *   2. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const CLIENT_IMPORT_PATH = '/api/client/items/import';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const POST_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '{}', label: 'empty object body' },

	{ data: { rows: [] }, label: 'empty rows array' },
	{
		data: {
			rows: [
				{ valid: true, rowIndex: 0, data: { name: 'Sample', description: 'Sample import row', source_url: 'https://example.com' }, errors: [] }
			]
		},
		label: 'minimal single valid row'
	},
	{
		data: {
			rows: [
				{ valid: true, rowIndex: 0, data: { name: 'A', description: 'A', source_url: 'https://example.com/a' }, errors: [] },
				{ valid: true, rowIndex: 1, data: { name: 'B', description: 'B', source_url: 'https://example.com/b' }, errors: [] }
			]
		},
		label: 'two valid rows'
	},

	// Manual Array.isArray-guard probes.
	{ data: { rows: null }, label: 'rows=null (Array.isArray fail)' },
	{ data: { rows: 'not-an-array' }, label: 'rows=string (Array.isArray fail)' },
	{ data: { rows: { 0: 'fake-array-shape' } }, label: 'rows=object (Array.isArray fail)' },
	{ data: { notRows: [] }, label: 'missing rows key' },

	// Bypass attempts.
	{
		data: {
			rows: [{ valid: true, rowIndex: 0, data: { name: 'Sample', description: 'X', source_url: 'https://example.com' }, errors: [] }],
			submittedBy: 'fabricated',
			defaultStatus: 'approved'
		},
		label: 'fabricated submittedBy + defaultStatus (handler ignores)'
	}
] as const;

test.describe('API: /api/client/items/import POST method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${CLIENT_IMPORT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(CLIENT_IMPORT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of POST_BODIES) {
		test(`POST ${CLIENT_IMPORT_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(CLIENT_IMPORT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${CLIENT_IMPORT_PATH} returns 401 with the longer-message TWO-key envelope`, async ({
		request
	}) => {
		const response = await request.post(CLIENT_IMPORT_PATH, {
			data: { rows: [] }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized. Please sign in to continue.');
	});

	test(`POST ${CLIENT_IMPORT_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.post(CLIENT_IMPORT_PATH, { data: { rows: [] } });
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.result).toBeUndefined();
		expect(body.total).toBeUndefined();
		expect(body.created).toBeUndefined();
		expect(body.updated).toBeUndefined();
		expect(body.skipped).toBeUndefined();
		expect(body.errors).toBeUndefined();
	});

	test(`POST ${CLIENT_IMPORT_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(CLIENT_IMPORT_PATH, {
			data: { rows: [] }
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// Post-auth messages must NEVER appear on
		// unauth.
		expect(serialized).not.toContain('Missing or invalid rows array.');
		expect(serialized).not.toContain('Failed to execute import');
		// Service-derived `result`-aggregate keys must
		// also NEVER leak on unauth.
		expect(serialized).not.toContain('"result"');
		expect(serialized).not.toContain('"created"');
		expect(serialized).not.toContain('"updated"');
		expect(serialized).not.toContain('"skipped"');
	});

	test(`POST ${CLIENT_IMPORT_PATH} executeImport is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: pin that XSS markers in the rows
		// array body are NEVER echoed back on unauth
		// AND that the load-bearing service call NEVER
		// executes.
		const response = await request.post(CLIENT_IMPORT_PATH, {
			data: {
				rows: [
					{
						valid: true,
						rowIndex: 0,
						data: {
							name: 'XSS-IMPORT-NAME-MARKER-12345',
							description: 'XSS import description marker',
							source_url: 'https://xss-import-marker-67890.test'
						},
						errors: []
					}
				]
			}
		});

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('XSS-IMPORT-NAME-MARKER-12345');
		expect(serialized).not.toContain('xss-import-marker-67890');
	});

	test(`POST ${CLIENT_IMPORT_PATH} Array.isArray rows-guard is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Pin the gate-before-Array.isArray-guard
		// order. Even with rows missing or non-array,
		// response is 401 NOT 400.
		const responses = await Promise.all([
			request.post(CLIENT_IMPORT_PATH, { data: {} }),
			request.post(CLIENT_IMPORT_PATH, { data: { rows: null } }),
			request.post(CLIENT_IMPORT_PATH, { data: { rows: 'not-an-array' } }),
			request.post(CLIENT_IMPORT_PATH, { data: { rows: { 0: 'fake' } } }),
			request.post(CLIENT_IMPORT_PATH, { data: { notRows: [] } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Unauthorized. Please sign in to continue.');
			// The 400-branch message must NEVER leak.
			const serialized = JSON.stringify(body);
			expect(serialized).not.toContain('Missing or invalid rows array.');
		}
	});

	test(`POST ${CLIENT_IMPORT_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// POST is the ONLY exported method. GET / PUT
		// / PATCH / DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.get(CLIENT_IMPORT_PATH),
			request.put(CLIENT_IMPORT_PATH),
			request.patch(CLIENT_IMPORT_PATH),
			request.delete(CLIENT_IMPORT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${CLIENT_IMPORT_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.post(CLIENT_IMPORT_PATH, { data: { rows: [] } });
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.post(CLIENT_IMPORT_PATH, {
				data: { rows: [] },
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(CLIENT_IMPORT_PATH, {
				data: { rows: [] },
				headers: { 'X-User-Id': 'fabricated' }
			}),
			request.post(CLIENT_IMPORT_PATH, {
				data: { rows: [] },
				headers: { Authorization: 'Bearer fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`POST ${CLIENT_IMPORT_PATH} cross-permutation status invariance — every body produces an IDENTICAL unauth status`, async ({
		request
	}) => {
		// Pins that the auth gate is THE first thing
		// the handler does — every body permutation
		// (including the Array.isArray fail, including
		// the bypass-attempt body, including the
		// minimal valid body) collapses to 401.
		const responses = await Promise.all([
			request.post(CLIENT_IMPORT_PATH, { data: { rows: [] } }),
			request.post(CLIENT_IMPORT_PATH, { data: { rows: null } }),
			request.post(CLIENT_IMPORT_PATH, {
				data: {
					rows: [
						{
							valid: true,
							rowIndex: 0,
							data: { name: 'X', description: 'X', source_url: 'https://example.com' },
							errors: []
						}
					]
				}
			}),
			request.post(CLIENT_IMPORT_PATH, { data: { notRows: [] } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
		}

		// All envelopes must be byte-identical.
		const bodies = await Promise.all(responses.map((r) => r.json()));
		const baseline = bodies[0];
		for (const body of bodies.slice(1)) {
			expect(body).toEqual(baseline);
		}
	});
});
