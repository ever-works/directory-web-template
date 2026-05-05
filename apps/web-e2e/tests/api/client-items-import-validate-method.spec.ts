import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multipart / body / header
 * surface** of the client-scoped item-import-validate
 * (dry-run) endpoint served by the `POST` export of
 * `apps/web/app/api/client/items/import/validate/route.ts`.
 *
 * `POST /api/client/items/import/validate` is the
 * **first per-source-file POST smoke** the docs tree
 * publishes that pins a **`requireClientAuth()`-gated
 * multipart/form-data validate-only handler** that
 * delegates to `ItemImportService.validateRows` (a
 * dry-run service entry point — distinct from the
 * sibling `client/items/import` route which calls
 * `executeImport`). UNIQUE: every prior per-source-
 * file `client-items*` smoke (`client-items-method`,
 * `client-items-id-method`, `client-items-stats-query`,
 * `client-items-import-method`) parses JSON via
 * `await request.json()`; this is the FIRST that pins
 * a `requireClientAuth()`-gated handler that parses
 * `multipart/form-data` via `await request.formData()`.
 *
 * It also pins:
 *   - the **5-step file/mapping validation chain**
 *     AFTER the gate (matches the admin sibling
 *     `admin/items/import/validate` chain BUT with the
 *     longer-message client-auth envelope on the
 *     unauth branch);
 *   - the **`safeErrorResponse(error, 'Failed to
 *     validate import file')` outer-catch helper**
 *     (matches the admin sibling 500-message);
 *   - the **`{ success: true, headers,
 *     suggestedMapping, validationResults, summary }`
 *     success payload** with the service-derived
 *     validation result aggregate;
 *   - **hard-coded `duplicateStrategy: 'skip'` +
 *     `defaultStatus: 'pending'`** validation options
 *     (UNIQUE: client requests CANNOT override either
 *     via the form data — distinct from the admin
 *     sibling which DOES accept these as form
 *     fields);
 *   - **`'Unauthorized. Please sign in to
 *     continue.'`** longer-message TWO-key 401
 *     envelope (matches the prior `client-items*`
 *     siblings).
 *
 * Distinct from EVERY prior per-source-file POST smoke:
 *
 *   - **`requireClientAuth()` + multipart/form-data
 *     pair** — UNIQUE: the FIRST per-source-file POST
 *     smoke that gates a `multipart/form-data` body
 *     parse with the `requireClientAuth`
 *     discriminated-union helper. The sibling
 *     `client-items-import-method` parses JSON; the
 *     sibling `admin-items-import-validate-body` parses
 *     multipart but uses `auth()` + `isAdmin` instead
 *     of `requireClientAuth()`.
 *   - **5-step file/mapping validation chain** AFTER
 *     the gate AND AFTER the formData parse:
 *       (a) `'No file provided.'` on `!file`,
 *       (b) `'Invalid file type. Only CSV and XLSX
 *           files are supported.'` on a filename that
 *           does NOT end in `.csv` / `.xlsx` / `.xls`,
 *       (c) `'File too large. Maximum size is 10
 *           MB.'` on `file.size > 10 * 1024 * 1024`,
 *       (d) `'Invalid column mapping JSON.'` on a
 *           non-empty `mapping` form field that fails
 *           `JSON.parse(...)`,
 *       (e) `'File contains no data rows.'` on a
 *           parsed file with `rows.length === 0`. The
 *           unauth branch must NEVER reach ANY of the
 *           five steps — the response body must NOT
 *           contain ANY of the five 400 messages.
 *   - **`validateRows`-not-`executeImport` service
 *     call** — the load-bearing call is
 *     `importService.validateRows(parsed.rows, { ...
 *     duplicateStrategy: 'skip', defaultStatus:
 *     'pending' })`. UNIQUE: the FIRST
 *     `requireClientAuth()`-gated POST smoke pinning a
 *     `validateRows` (dry-run) service entry point —
 *     prior siblings pin `executeImport` (commit-mode)
 *     or `findByUserPaginated` / `createAsClient` /
 *     `findByIdForUser` etc. (DB-helper layer).
 *   - **`{ success: true, headers, suggestedMapping,
 *     validationResults, summary }` success payload**
 *     — UNIQUE: the FIRST `requireClientAuth()`-gated
 *     POST smoke pinning a FOUR-key success payload
 *     (vs the `result`-keyed two-key payload of the
 *     `client-items-import-method` sibling, vs the
 *     `item`-keyed two-key payload of the collection
 *     POST sibling).
 *   - **`safeErrorResponse(error, 'Failed to validate
 *     import file')` outer-catch** — UNIQUE: shares
 *     the `safeErrorResponse` cross-utility helper
 *     with the sibling `client-items-import-method`
 *     (which has `'Failed to execute import'`) and the
 *     admin sibling `admin/items/import/validate`
 *     (which ALSO has `'Failed to validate import
 *     file'`). The FIRST per-source-file
 *     `requireClientAuth()`-gated POST smoke pinning
 *     a multipart-form-data validate-mode catch
 *     message that BYTE-IDENTICALLY matches the admin
 *     sibling.
 *   - **Hard-coded validation options** — the handler
 *     hard-codes `duplicateStrategy: 'skip'` and
 *     `defaultStatus: 'pending'` when calling
 *     `validateRows`. Client requests CANNOT override
 *     either via the form data — UNIQUE: the FIRST
 *     `requireClientAuth()`-gated POST smoke pinning a
 *     hard-coded validation-options contract distinct
 *     from the admin sibling which DOES accept
 *     `duplicateStrategy` + `defaultStatus` as form
 *     fields.
 *   - **`'Unauthorized. Please sign in to
 *     continue.'`** longer-message TWO-key 401
 *     envelope (matches the prior `client-items*`
 *     siblings; distinct from the admin sibling's
 *     `'Unauthorized. Admin access required.'`).
 *
 *   1. **POST handler** — outer try/catch around:
 *      `requireClientAuth()` → discriminated-union
 *      check; `await request.formData()` body parse;
 *      `formData.get('file')` `!file` guard → 400
 *      `'No file provided.'`; filename whitelist
 *      (`.csv` / `.xlsx` / `.xls`) → 400 `'Invalid
 *      file type. ...'`; `file.size > 10 * 1024 *
 *      1024` → 400 `'File too large. ...'`;
 *      `formData.get('mapping')` non-null +
 *      `JSON.parse` failure → 400 `'Invalid column
 *      mapping JSON.'`; `parseCSV(...)` /
 *      `parseXLSX(...)` then `parsed.rows.length === 0`
 *      → 400 `'File contains no data rows.'`;
 *      `validateRows(parsed.rows, { columnMapping:
 *      effectiveMapping, duplicateStrategy: 'skip',
 *      defaultStatus: 'pending' })` load-bearing
 *      service call; success returns `{ success: true,
 *      headers, suggestedMapping, validationResults,
 *      summary }`; outer catch →
 *      `safeErrorResponse(error, 'Failed to validate
 *      import file')`.
 *   2. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const VALIDATE_PATH = '/api/client/items/import/validate';

const SUCCESS_KEYS = ['headers', 'suggestedMapping', 'validationResults', 'summary'] as const;

const VALIDATION_400_MESSAGES = [
	'No file provided.',
	'Invalid file type. Only CSV and XLSX files are supported.',
	'File too large. Maximum size is 10 MB.',
	'Invalid column mapping JSON.',
	'File contains no data rows.'
] as const;

const CATCH_500_MESSAGE = 'Failed to validate import file';
const CANONICAL_401_MESSAGE = 'Unauthorized. Please sign in to continue.';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers, no body' },

	// Content-Type headers — the route reads the body via `await request.formData()`.
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },
	{ headers: { 'Content-Type': 'multipart/form-data' }, label: 'multipart/form-data content-type' },

	// Accept headers — the route does not negotiate content-types today.
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel cookies / headers.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

// Helper — build a multipart payload with a Buffer
// file and optional extra form fields. Playwright's
// `multipart` form option lets us pass `name`,
// `mimeType`, and `buffer` without writing a file to
// disk.
type MultipartFilePart = { name: string; mimeType: string; buffer: Buffer };
type MultipartField = string | number | boolean | MultipartFilePart;
type MultipartPayload = Record<string, MultipartField>;

function makeFile(filename: string, contents: string, mimeType: string): MultipartFilePart {
	return {
		name: filename,
		mimeType,
		buffer: Buffer.from(contents)
	};
}

const TINY_CSV = 'name,description\nItem 1,desc 1\nItem 2,desc 2';
const EMPTY_CSV = 'name,description';
const TINY_XLSX = 'fake-xlsx-bytes-that-the-route-never-reads-because-the-gate-fires-first';

const PAYLOADS: ReadonlyArray<{ multipart: MultipartPayload; label: string }> = [
	// Body permutations — every multipart shape must
	// round-trip to the SAME 401 envelope on the unauth
	// branch because the gate fires before the formData
	// parse.

	// Step (a) probes — `'No file provided.'`.
	{ multipart: {}, label: 'empty multipart (would 400 (a) if reachable)' },
	{ multipart: { mapping: '{}' }, label: 'mapping-only multipart (would 400 (a) if reachable)' },

	// Step (b) probes — `'Invalid file type.'`.
	{
		multipart: { file: makeFile('items.txt', TINY_CSV, 'text/plain') },
		label: '.txt file (would 400 (b) if reachable)'
	},
	{
		multipart: { file: makeFile('items.json', '{"a":1}', 'application/json') },
		label: '.json file (would 400 (b) if reachable)'
	},

	// Step (c) probes — small file proxy.
	{
		multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv') },
		label: 'small csv file (would proceed past (c) if reachable)'
	},

	// Step (d) probes — `'Invalid column mapping JSON.'`.
	{
		multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv'), mapping: 'not-json' },
		label: 'csv + invalid mapping (would 400 (d) if reachable)'
	},
	{
		multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv'), mapping: '{ broken: json' },
		label: 'csv + broken mapping (would 400 (d) if reachable)'
	},

	// Step (e) probes — `'File contains no data rows.'`.
	{
		multipart: { file: makeFile('items.csv', EMPTY_CSV, 'text/csv') },
		label: 'csv with header-only / no data rows (would 400 (e) if reachable)'
	},

	// Valid bodies — would call `validateRows(...)` if reachable.
	{
		multipart: {
			file: makeFile('items.csv', TINY_CSV, 'text/csv'),
			mapping: JSON.stringify({ name: 'name', description: 'description' })
		},
		label: 'valid csv + valid mapping (would call service if reachable)'
	},
	{
		multipart: {
			file: makeFile('items.xlsx', TINY_XLSX, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
		},
		label: 'plausible xlsx (would proceed past (b) if reachable)'
	},

	// Bypass attempts — client requests must NOT be
	// able to override the hard-coded `duplicateStrategy`
	// / `defaultStatus`.
	{
		multipart: {
			file: makeFile('items.csv', TINY_CSV, 'text/csv'),
			duplicateStrategy: 'overwrite',
			defaultStatus: 'approved'
		},
		label: 'fabricated duplicateStrategy + defaultStatus (handler ignores)'
	},
	{
		multipart: {
			file: makeFile('items.csv', TINY_CSV, 'text/csv'),
			submittedBy: 'fabricated',
			userId: 'fabricated'
		},
		label: 'fabricated submittedBy + userId fields'
	}
];

test.describe('API: /api/client/items/import/validate POST method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${VALIDATE_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(VALIDATE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { multipart, label } of PAYLOADS) {
		test(`POST ${VALIDATE_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(VALIDATE_PATH, { multipart });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${VALIDATE_PATH} returns 401 with the longer-message TWO-key envelope`, async ({
		request
	}) => {
		const response = await request.post(VALIDATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`POST ${VALIDATE_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.post(VALIDATE_PATH);
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		// None of the success-branch keys must leak.
		for (const key of SUCCESS_KEYS) {
			expect(body[key]).toBeUndefined();
		}
	});

	test(`POST ${VALIDATE_PATH} does NOT echo any of the five file/mapping 400 messages on the unauth branch`, async ({
		request
	}) => {
		// Pin the gate-before-validation-chain ordering.
		// Every multipart permutation that would otherwise
		// trigger one of the five 400 envelopes must
		// collapse to the canonical 401 envelope.
		const responses = await Promise.all([
			request.post(VALIDATE_PATH, { multipart: {} }),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.txt', TINY_CSV, 'text/plain') }
			}),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv'), mapping: 'not-json' }
			}),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.csv', EMPTY_CSV, 'text/csv') }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of VALIDATION_400_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
		}
	});

	test(`POST ${VALIDATE_PATH} does NOT echo the catch-branch 500 message on the unauth branch`, async ({
		request
	}) => {
		// `safeErrorResponse(error, 'Failed to validate
		// import file')` must NEVER fire on the unauth
		// branch.
		const response = await request.post(VALIDATE_PATH);
		const body = await response.json();
		expect(body.error).not.toBe(CATCH_500_MESSAGE);
		expect(body.error).toBe(CANONICAL_401_MESSAGE);
	});

	test(`POST ${VALIDATE_PATH} validateRows is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: pin that XSS markers in the multipart
		// body are NEVER echoed back AND that the load-
		// bearing `validateRows` service call NEVER
		// executes.
		const response = await request.post(VALIDATE_PATH, {
			multipart: {
				file: makeFile(
					'items.csv',
					'name,description,source_url\nXSS-VALIDATE-NAME-MARKER-12345,XSS-VALIDATE-DESC,https://xss-validate-marker-67890.test',
					'text/csv'
				),
				mapping: JSON.stringify({ name: 'name', description: 'description', source_url: 'source_url' })
			}
		});

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('XSS-VALIDATE-NAME-MARKER-12345');
		expect(serialized).not.toContain('xss-validate-marker-67890');
	});

	test(`POST ${VALIDATE_PATH} success-branch keys do NOT leak on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(VALIDATE_PATH, {
			multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv') }
		});
		expect(response.status()).toBe(401);
		const body = await response.json();
		expect(body.success).not.toBe(true);
		for (const key of SUCCESS_KEYS) {
			expect(body[key]).toBeUndefined();
		}
		// Strict assertion: serialized body does NOT contain
		// any of the success-branch keys as JSON keys.
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('"headers"');
		expect(serialized).not.toContain('"suggestedMapping"');
		expect(serialized).not.toContain('"validationResults"');
		expect(serialized).not.toContain('"summary"');
	});

	test(`POST ${VALIDATE_PATH} is invariant to malformed multipart bodies on the unauth branch`, async ({
		request
	}) => {
		// A regression that runs the formData parse before
		// the gate would surface here: a malformed multipart
		// body would 400 with a parse error instead of 401
		// with the canonical longer Unauthorized envelope.
		const responses = await Promise.all([
			request.post(VALIDATE_PATH, {
				headers: { 'Content-Type': 'multipart/form-data; boundary=---x' },
				data: 'not-multipart'
			}),
			request.post(VALIDATE_PATH, {
				headers: { 'Content-Type': 'multipart/form-data; boundary=---x' },
				data: '------x\r\nbroken'
			}),
			request.post(VALIDATE_PATH, {
				headers: { 'Content-Type': 'multipart/form-data' },
				data: ''
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${VALIDATE_PATH} is invariant to file-extension shapes on the unauth branch`, async ({
		request
	}) => {
		// The handler whitelists `.csv` / `.xlsx` / `.xls`
		// extensions only AFTER the gate. A regression that
		// runs the extension-whitelist before the gate
		// would surface here: every extension shape
		// (whitelisted + non-whitelisted) must round-trip
		// to the same 401 status as the no-body baseline.
		const baseline = await request.post(VALIDATE_PATH);
		const responses = await Promise.all([
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv') }
			}),
			request.post(VALIDATE_PATH, {
				multipart: {
					file: makeFile(
						'items.xlsx',
						TINY_XLSX,
						'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					)
				}
			}),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.xls', TINY_XLSX, 'application/vnd.ms-excel') }
			}),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.txt', TINY_CSV, 'text/plain') }
			}),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.json', '{"a":1}', 'application/json') }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${VALIDATE_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// POST is the ONLY exported method. Every other
		// method must round-trip to `< 500`.
		const responses = await Promise.all([
			request.get(VALIDATE_PATH),
			request.put(VALIDATE_PATH),
			request.patch(VALIDATE_PATH),
			request.delete(VALIDATE_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${VALIDATE_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		// A regression that switches the gate to a custom
		// auth resolver that consults `request.cookies` /
		// fabricated user-id headers / `Authorization`
		// would change the unauth-branch behaviour.
		const baseline = await request.post(VALIDATE_PATH);
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.post(VALIDATE_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(VALIDATE_PATH, {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.post(VALIDATE_PATH, {
				headers: { Authorization: 'Bearer fabricated' }
			}),
			request.post(VALIDATE_PATH, {
				headers: { 'X-User-Id': 'fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`POST ${VALIDATE_PATH} cross-permutation status invariance — every body produces an IDENTICAL unauth envelope`, async ({
		request
	}) => {
		// Pins that the auth gate is THE first thing the
		// handler does — every multipart permutation
		// (empty, valid CSV, valid CSV + mapping, mapping-
		// only, file-extension fail, mapping-JSON fail,
		// hard-coded-options bypass) collapses to a byte-
		// identical 401 envelope.
		const responses = await Promise.all([
			request.post(VALIDATE_PATH),
			request.post(VALIDATE_PATH, { multipart: {} }),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv') }
			}),
			request.post(VALIDATE_PATH, {
				multipart: {
					file: makeFile('items.csv', TINY_CSV, 'text/csv'),
					mapping: JSON.stringify({ name: 'name' })
				}
			}),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.txt', TINY_CSV, 'text/plain') }
			}),
			request.post(VALIDATE_PATH, {
				multipart: {
					file: makeFile('items.csv', TINY_CSV, 'text/csv'),
					mapping: 'not-json'
				}
			}),
			request.post(VALIDATE_PATH, {
				multipart: {
					file: makeFile('items.csv', TINY_CSV, 'text/csv'),
					duplicateStrategy: 'overwrite',
					defaultStatus: 'approved'
				}
			})
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
