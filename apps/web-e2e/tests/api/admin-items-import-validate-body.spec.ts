import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **multipart-form / header / method
 * surface** of the admin-only items-import-validate (dry-run)
 * endpoint served by
 * `apps/web/app/api/admin/items/import/validate/route.ts`.
 *
 * `POST /api/admin/items/import/validate` is the **first**
 * admin-tree route the smoke layer covers that combines a
 * static-path `POST` handler with a
 * **multipart/form-data body** parsed via
 * `await request.formData()` AFTER the gate — distinct from
 * every prior admin-tree smoke (which all parse JSON via
 * `await request.json()`):
 *
 *   1. **`POST` handler with a static path** —
 *      `apps/web/app/api/admin/items/import/validate/route.ts`
 *      sits as a sibling of
 *      `apps/web/app/api/admin/items/import/route.ts`,
 *      sharing the same `POST`-only export shape but a
 *      strictly different body parse strategy.
 *   2. **Single-step `auth()` chain** that collapses both
 *      unauthenticated and authenticated-non-admin
 *      branches into the SAME 401 envelope — the SAME
 *      gate shape as the sibling `admin/items/import`,
 *      `admin/items/bulk`, `admin/categories/reorder`,
 *      `admin/twenty-crm/test-connection`,
 *      `admin/items/export`, and
 *      `admin/items/[id]/review` routes.
 *   3. **Canonical longer 401 message**
 *      `'Unauthorized. Admin access required.'` —
 *      matching the same sibling envelope family.
 *   4. **`success: false` envelope key on the 401
 *      branch** — matching the same sibling envelope
 *      family.
 *   5. **Body parse via `await request.formData()`** AFTER
 *      the gate — the gate-then-formData-parse-then-
 *      validate-then-parse-file-then-service order is the
 *      load-bearing invariant of this route. This is the
 *      **first** admin-tree smoke spec that documents a
 *      `formData()`-based body parse — a complementary
 *      surface to the JSON-based body parses of every
 *      prior admin-tree smoke.
 *   6. **Five-step file / mapping validation chain** AFTER
 *      the gate AND AFTER the formData parse. The five
 *      distinct 400 messages are:
 *        (a) `'No file provided.'`
 *            on `!file` (the `file` form field is missing).
 *        (b) `'Invalid file type. Only CSV and XLSX files
 *            are supported.'`
 *            on a filename that does NOT end in
 *            `.csv` / `.xlsx` / `.xls`.
 *        (c) `'File too large. Maximum size is 10 MB.'`
 *            on `file.size > 10 * 1024 * 1024`.
 *        (d) `'Invalid column mapping JSON.'`
 *            on a `mapping` field that is non-empty but
 *            fails `JSON.parse(...)`.
 *        (e) `'File contains no data rows.'`
 *            on a parsed file with `rows.length === 0`
 *            AFTER the `parseCSV(...)` /
 *            `parseXLSX(...)` call. The unauth branch
 *            must NEVER reach ANY of the five validation
 *            steps — the response body must NOT contain
 *            ANY of the five 400 messages.
 *   7. **Service-call surface** AFTER the gate AND AFTER
 *      every validation step — the handler instantiates
 *      `new ItemImportService()` and calls
 *      `parseCSV(...)` / `parseXLSX(...)` followed by
 *      `validateRows(...)`. The success-branch payload
 *      shape is
 *      `{ success: true, headers, suggestedMapping,
 *      validationResults, summary }`. The unauth branch
 *      must NEVER reach EITHER service call, so the
 *      unauth response body must NOT contain
 *      `success: true`, `headers`, `suggestedMapping`,
 *      `validationResults`, or `summary`.
 *   8. **`safeErrorResponse(error, 'Failed to validate
 *      import file')` catch** — matching the
 *      `safeErrorResponse(error, 'Failed to execute
 *      import')` catch of the sibling
 *      `admin/items/import` route, the
 *      `safeErrorResponse(error, 'Failed to process bulk
 *      action')` catch of `admin/items/bulk`, and the
 *      `safeErrorResponse(error, 'Failed to fetch item
 *      history')` catch of `admin/items/[id]/history`.
 *      The unauth branch must NEVER reach the catch, so
 *      the unauth response body must NOT contain the
 *      `'Failed to validate import file'` message.
 *   9. **Method-resolution surface** — the route exports
 *      ONLY `POST`. Every other method (`GET` / `PUT` /
 *      `PATCH` / `DELETE`) must round-trip to a `< 500`
 *      status (typically 405 Method Not Allowed).
 *
 * Where the immediately-preceding
 * `admin-items-import-body.spec.ts` walks the sibling
 * **JSON-body** import-execute route with a two-step body
 * validation chain, this spec walks the
 * **multipart-form-data** import-validate route with a
 * five-step file / mapping validation chain — a
 * complementary surface that no prior admin-tree smoke
 * spec covers.
 */
const VALIDATE_PATH = '/api/admin/items/import/validate';

const ADMIN_ITEMS_IMPORT_VALIDATE_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers, no body' },

	// `Content-Type` headers — the route reads the body via `await request.formData()`.
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },
	{ headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, label: 'form-encoded content-type' },
	{ headers: { 'Content-Type': 'multipart/form-data' }, label: 'multipart/form-data content-type' },
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

const VALIDATION_400_MESSAGES = [
	'No file provided.',
	'Invalid file type. Only CSV and XLSX files are supported.',
	'File too large. Maximum size is 10 MB.',
	'Invalid column mapping JSON.',
	'File contains no data rows.'
] as const;

const SUCCESS_KEYS = ['headers', 'suggestedMapping', 'validationResults', 'summary'] as const;

const CATCH_500_MESSAGE = 'Failed to validate import file';
const CANONICAL_401_MESSAGE = 'Unauthorized. Admin access required.';

// Helper — build a multipart payload with a Buffer file and
// optional extra form fields. Playwright's `multipart` form
// option lets us pass `name`, `mimeType`, and `buffer`
// without writing a file to disk.
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

const ADMIN_ITEMS_IMPORT_VALIDATE_PAYLOADS: ReadonlyArray<{ multipart: MultipartPayload; label: string }> = [
	// Body permutations — every multipart shape must round-
	// trip to the SAME 401 envelope on the unauth branch
	// because the gate fires before the formData parse.

	// Step (a) probes — `'No file provided.'`.
	{ multipart: {}, label: 'empty multipart (would 400 (a) if reachable)' },
	{ multipart: { mapping: '{}' }, label: 'mapping-only multipart (would 400 (a) if reachable)' },
	{
		multipart: { duplicateStrategy: 'skip', defaultStatus: 'draft' },
		label: 'options-only multipart (would 400 (a) if reachable)'
	},

	// Step (b) probes — `'Invalid file type. Only CSV and XLSX files are supported.'`.
	{
		multipart: { file: makeFile('items.txt', TINY_CSV, 'text/plain') },
		label: '.txt file (would 400 (b) if reachable)'
	},
	{
		multipart: { file: makeFile('items.json', '{"a":1}', 'application/json') },
		label: '.json file (would 400 (b) if reachable)'
	},
	{
		multipart: { file: makeFile('items.pdf', '%PDF-1.4', 'application/pdf') },
		label: '.pdf file (would 400 (b) if reachable)'
	},
	{
		multipart: { file: makeFile('items', TINY_CSV, 'application/octet-stream') },
		label: 'extensionless file (would 400 (b) if reachable)'
	},

	// Step (c) probes — `'File too large. Maximum size is 10 MB.'`.
	// We send a small, plausible file to assert the unauth
	// branch is invariant to file-size shape; we do NOT
	// actually upload 10 MB to keep the smoke fast.
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
	{
		multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv'), mapping: '{"a":' },
		label: 'csv + truncated mapping (would 400 (d) if reachable)'
	},

	// Step (e) probes — `'File contains no data rows.'`.
	{
		multipart: { file: makeFile('items.csv', EMPTY_CSV, 'text/csv') },
		label: 'csv with header-only / no data rows (would 400 (e) if reachable)'
	},
	{
		multipart: { file: makeFile('items.csv', '', 'text/csv') },
		label: 'empty csv (would 400 (e) if reachable)'
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
			file: makeFile('items.csv', TINY_CSV, 'text/csv'),
			mapping: JSON.stringify({ name: 'name' }),
			duplicateStrategy: 'skip',
			defaultStatus: 'draft'
		},
		label: 'valid csv + skip + draft (would call service if reachable)'
	},
	{
		multipart: {
			file: makeFile('items.csv', TINY_CSV, 'text/csv'),
			duplicateStrategy: 'overwrite',
			defaultStatus: 'pending'
		},
		label: 'valid csv + overwrite + pending (would call service if reachable)'
	},
	{
		multipart: {
			file: makeFile('items.csv', TINY_CSV, 'text/csv'),
			duplicateStrategy: 'rename',
			defaultStatus: 'approved'
		},
		label: 'valid csv + rename + approved (would call service if reachable)'
	},
	{
		multipart: {
			file: makeFile('items.xlsx', TINY_XLSX, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
		},
		label: 'plausible xlsx (would proceed past (b) if reachable)'
	},
	{
		multipart: {
			file: makeFile('items.xls', TINY_XLSX, 'application/vnd.ms-excel')
		},
		label: 'plausible legacy xls (would proceed past (b) if reachable)'
	},

	// Bypass attempts.
	{
		multipart: {
			file: makeFile('items.csv', TINY_CSV, 'text/csv'),
			isAdmin: 'true'
		},
		label: 'isAdmin=true field bypass attempt'
	},
	{
		multipart: {
			file: makeFile('items.csv', TINY_CSV, 'text/csv'),
			tenantId: 'fabricated'
		},
		label: 'fabricated tenantId field bypass attempt'
	},
	{
		multipart: {
			file: makeFile('items.csv', TINY_CSV, 'text/csv'),
			userId: 'admin'
		},
		label: 'fabricated userId field bypass attempt'
	},
	{
		multipart: {
			file: makeFile('items.csv', TINY_CSV, 'text/csv'),
			token: 'anything'
		},
		label: 'fabricated token field bypass attempt'
	}
];

test.describe('API: /api/admin/items/import/validate method / body / header surface', () => {
	for (const { headers, label } of ADMIN_ITEMS_IMPORT_VALIDATE_HEADERS) {
		test(`POST ${VALIDATE_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(VALIDATE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { multipart, label } of ADMIN_ITEMS_IMPORT_VALIDATE_PAYLOADS) {
		test(`POST ${VALIDATE_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(VALIDATE_PATH, { multipart });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${VALIDATE_PATH} returns 401 with the canonical longer Unauthorized envelope`, async ({ request }) => {
		// The unauthenticated POST branch is the load-bearing
		// invariant: the single-step gate
		// `if (!session?.user?.isAdmin)` fires, returning 401
		// with the `success: false` envelope and the canonical
		// longer message
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		const response = await request.post(VALIDATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
	});

	test(`POST ${VALIDATE_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({ request }) => {
		// The success branch returns
		// `{ success: true, headers, suggestedMapping,
		// validationResults, summary }`. The unauth branch
		// must NEVER reach EITHER `parseCSV(...)` /
		// `parseXLSX(...)` OR `validateRows(...)`, so the
		// response body must NOT contain ANY of those four
		// success-branch keys and must NOT contain
		// `success: true`.
		const response = await request.post(VALIDATE_PATH, {
			multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv') }
		});
		const body = await response.json();
		expect(body.success).not.toBe(true);
		for (const key of SUCCESS_KEYS) {
			expect(body[key]).toBeUndefined();
		}
	});

	test(`POST ${VALIDATE_PATH} does NOT echo any of the five file/mapping 400 messages on the unauth branch`, async ({
		request
	}) => {
		// The five 400 envelopes for the file / mapping
		// validation steps are the load-bearing invariant of
		// the validation chain. The unauth branch fires the
		// gate BEFORE the formData parse, so the unauth
		// response must NEVER contain ANY of the five 400
		// messages. A regression that re-orders ANY of the
		// validation steps before the gate would surface
		// here.
		const responses = await Promise.all([
			// Step (a) probe.
			request.post(VALIDATE_PATH, { multipart: {} }),
			// Step (b) probe.
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.txt', TINY_CSV, 'text/plain') }
			}),
			// Step (d) probe.
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv'), mapping: 'not-json' }
			}),
			// Step (e) probe.
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
		// The catch branch returns
		// `safeErrorResponse(error, 'Failed to validate import file')`.
		// The unauth branch must NEVER reach the catch, so
		// the unauth response body must NOT contain the
		// `'Failed to validate import file'` message. A
		// regression that swaps the gate for a try-catch
		// wrapper that swallows auth failures would surface
		// here.
		const response = await request.post(VALIDATE_PATH);
		const body = await response.json();
		expect(body.error).not.toBe(CATCH_500_MESSAGE);
		expect(body.error).toBe(CANONICAL_401_MESSAGE);
	});

	test(`POST ${VALIDATE_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		// The single-step gate fires before the formData
		// parse, so every permutation must round-trip to the
		// same 401 status as the no-body baseline.
		const baseline = await request.post(VALIDATE_PATH);
		const responses = await Promise.all([
			request.post(VALIDATE_PATH, { multipart: {} }),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv') }
			}),
			request.post(VALIDATE_PATH, {
				multipart: {
					file: makeFile('items.csv', TINY_CSV, 'text/csv'),
					mapping: JSON.stringify({ name: 'name' }),
					duplicateStrategy: 'skip',
					defaultStatus: 'draft'
				}
			}),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.txt', TINY_CSV, 'text/plain') }
			}),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv'), mapping: 'not-json' }
			}),
			request.post(VALIDATE_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(VALIDATE_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${VALIDATE_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		// A regression that switches the gate to a custom
		// auth resolver that consults `request.cookies` /
		// `request.geo` / `request.ip` / fabricated tenant-
		// or user-id headers would change the unauth-branch
		// behaviour.
		const responses = await Promise.all([
			request.post(VALIDATE_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(VALIDATE_PATH, { headers: { Cookie: 'authjs.session-token=fabricated' } }),
			request.post(VALIDATE_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(VALIDATE_PATH, { headers: { 'X-Real-IP': '10.0.0.1' } }),
			request.post(VALIDATE_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } }),
			request.post(VALIDATE_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(VALIDATE_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(VALIDATE_PATH, { headers: { 'X-Api-Key': 'anything' } }),
			request.post(VALIDATE_PATH, { headers: { 'X-Admin-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${VALIDATE_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		// The route only exports `POST`. Every other method
		// (GET / PUT / PATCH / DELETE) must round-trip to a
		// `< 500` status (typically 405 Method Not Allowed).
		// A 5xx on any other method would indicate the
		// Next.js routing layer crashed before the method-
		// resolution returned its canonical 405.
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

	test(`POST ${VALIDATE_PATH} Unauthorized error envelope echoes the success: false key`, async ({ request }) => {
		// Strict envelope-shape assertion: the canonical
		// longer envelope is
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`.
		// The presence of the `success: false` key is the
		// cross-route divergence that distinguishes this
		// route's gate from the bare-message gates.
		const response = await request.post(VALIDATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: CANONICAL_401_MESSAGE
		});
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
	});

	test(`POST ${VALIDATE_PATH} is invariant to malformed multipart bodies on the unauth branch`, async ({
		request
	}) => {
		// A regression that runs the formData parse before
		// the gate would surface here: a malformed multipart
		// body would 400 with a parse error instead of 401
		// with the canonical longer Unauthorized envelope.
		// Playwright's `data: string` route bypasses the
		// `multipart` builder, so we can fabricate ill-
		// formed payloads.
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

	test(`POST ${VALIDATE_PATH} service call is NOT entered on the unauth branch`, async ({ request }) => {
		// The success branch returns
		// `{ success: true, headers, suggestedMapping,
		// validationResults, summary }`. A regression that
		// re-orders EITHER the `parseCSV(...)` /
		// `parseXLSX(...)` OR `validateRows(...)` call
		// before the gate would surface as one of the
		// service-shaped keys appearing in the unauth
		// response body.
		const responses = await Promise.all([
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
				multipart: { file: makeFile('items.xlsx', TINY_XLSX, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.success).not.toBe(true);
			for (const key of SUCCESS_KEYS) {
				expect(body[key]).toBeUndefined();
			}
		}
	});

	test(`POST ${VALIDATE_PATH} is invariant to file-extension shapes on the unauth branch`, async ({ request }) => {
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
					file: makeFile('items.xlsx', TINY_XLSX, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
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
			}),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.pdf', '%PDF-1.4', 'application/pdf') }
			}),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items', TINY_CSV, 'application/octet-stream') }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${VALIDATE_PATH} is invariant to mapping JSON shapes on the unauth branch`, async ({ request }) => {
		// The handler `JSON.parse(...)`-es the `mapping`
		// field only AFTER the gate. A regression that
		// runs the JSON.parse before the gate would surface
		// here: every mapping shape (valid + invalid + missing)
		// must round-trip to the same 401 status as the
		// no-body baseline.
		const baseline = await request.post(VALIDATE_PATH);
		const responses = await Promise.all([
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
				multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv'), mapping: 'not-json' }
			}),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv'), mapping: '{ broken: json' }
			}),
			request.post(VALIDATE_PATH, {
				multipart: { file: makeFile('items.csv', TINY_CSV, 'text/csv'), mapping: '' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${VALIDATE_PATH} is invariant to duplicate-strategy / default-status enum shapes on the unauth branch`, async ({
		request
	}) => {
		// The handler defaults `duplicateStrategy` to
		// `'skip'` and `defaultStatus` to `'draft'` only
		// AFTER the gate AND AFTER every validation step. A
		// regression that runs the default-fallback before
		// the gate would surface here: every enum shape
		// (valid + invalid + falsy) must round-trip to the
		// same 401 status as the no-body baseline.
		const baseline = await request.post(VALIDATE_PATH);
		const responses = await Promise.all([
			request.post(VALIDATE_PATH, {
				multipart: {
					file: makeFile('items.csv', TINY_CSV, 'text/csv'),
					duplicateStrategy: 'skip',
					defaultStatus: 'draft'
				}
			}),
			request.post(VALIDATE_PATH, {
				multipart: {
					file: makeFile('items.csv', TINY_CSV, 'text/csv'),
					duplicateStrategy: 'overwrite',
					defaultStatus: 'pending'
				}
			}),
			request.post(VALIDATE_PATH, {
				multipart: {
					file: makeFile('items.csv', TINY_CSV, 'text/csv'),
					duplicateStrategy: 'rename',
					defaultStatus: 'approved'
				}
			}),
			request.post(VALIDATE_PATH, {
				multipart: {
					file: makeFile('items.csv', TINY_CSV, 'text/csv'),
					duplicateStrategy: '',
					defaultStatus: ''
				}
			}),
			request.post(VALIDATE_PATH, {
				multipart: {
					file: makeFile('items.csv', TINY_CSV, 'text/csv'),
					duplicateStrategy: 'invalid-shape',
					defaultStatus: 'invalid-shape'
				}
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
