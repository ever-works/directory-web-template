import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET / query-param / header
 * surface** of the client-scoped sample-template
 * download endpoint served by the `GET` export of
 * `apps/web/app/api/client/items/import/sample/route.ts`.
 *
 * `GET /api/client/items/import/sample` is the **first
 * per-source-file GET smoke** the docs tree publishes
 * that pins a **`requireClientAuth()`-gated binary-
 * stream sample-template handler** that delegates to
 * `ItemExportService.generateSampleCSV()` /
 * `generateSampleXLSX()`. UNIQUE: every prior per-
 * source-file `client-items*` GET smoke
 * (`client-items-method`, `client-items-id-method`,
 * `client-items-stats-query`) returns a JSON envelope;
 * this is the FIRST `requireClientAuth()`-gated GET
 * smoke that returns a **binary stream** with a
 * `Content-Disposition: attachment; filename="..."`
 * header on the happy path.
 *
 * The handler shape is:
 *
 *     export async function GET(request: NextRequest) {
 *       try {
 *         const authResult = await requireClientAuth();
 *         if (!authResult.success) return authResult.response;
 *         const { searchParams } = new URL(request.url);
 *         const { format } = exportQuerySchema.parse(Object.fromEntries(searchParams));
 *         const exportService = new ItemExportService();
 *         if (format === 'xlsx') {
 *           const result = await exportService.generateSampleXLSX();
 *           return new NextResponse(new Uint8Array(result.data), {…});
 *         }
 *         const result = exportService.generateSampleCSV();
 *         return new NextResponse(result.data, {…});
 *       } catch (error) {
 *         return safeErrorResponse(error, 'Failed to generate sample template');
 *       }
 *     }
 *
 * The route's documented query param (`format`) is
 * read **after** the `requireClientAuth()` gate, so
 * every call from this spec — which carries no
 * authenticated session — round-trips to the same 401
 * regardless of the query string. A regression that
 * reads any query param before the gate (e.g. a
 * future `?asUser=true` impersonation key, a
 * `?token=…` magic-token bypass, a `?as=admin` admin-
 * override, or any other dangerous-passthrough that
 * bypasses `requireClientAuth()`) would change the
 * unauth branch's behaviour from "always 401" to
 * "200 / 400 / 500 if the right query is present" —
 * and that change is exactly what this spec catches.
 *
 * Distinct from EVERY prior per-source-file GET smoke:
 *
 *   - **`requireClientAuth()` + `exportQuerySchema`
 *     pair** — UNIQUE: the FIRST per-source-file GET
 *     smoke that gates a Zod `exportQuerySchema.parse(...)`
 *     query parse with the `requireClientAuth`
 *     discriminated-union helper. The sibling
 *     `client-items-method` / `client-items-id-method`
 *     / `client-items-stats-query` parse no query
 *     schema; the admin sibling
 *     `admin-items-export-sample-query` uses the SAME
 *     `exportQuerySchema` but gates with bare `auth()`
 *     + `session.user.isAdmin` instead of
 *     `requireClientAuth()`.
 *   - **Binary-stream success contract** — UNIQUE:
 *     the FIRST `requireClientAuth()`-gated GET smoke
 *     pinning a `NextResponse(new Uint8Array(…), {
 *     headers: { 'Content-Type': …, 'Content-
 *     Disposition': 'attachment; filename="…"' } })`
 *     binary-stream success contract. Distinct from
 *     the JSON-envelope shape every prior
 *     `client-items*` GET smoke pins. The unauth
 *     branch is invariant to this distinction (still a
 *     401 JSON envelope), but the post-auth contract
 *     is fundamentally different.
 *   - **`safeErrorResponse(error, 'Failed to generate
 *     sample template')` outer-catch** — UNIQUE: the
 *     FIRST `requireClientAuth()`-gated GET smoke
 *     pinning a `safeErrorResponse` cross-utility
 *     helper (NOT `serverErrorResponse` like the
 *     `client-items-stats-query` sibling). The catch
 *     message BYTE-IDENTICALLY matches the admin
 *     sibling `admin/items/export/sample` route's
 *     catch message (both use `'Failed to generate
 *     sample template'`) — distinct from the client
 *     sibling `client-items-import-method`'s
 *     `'Failed to execute import'` and
 *     `client-items-import-validate-method`'s
 *     `'Failed to validate import file'`.
 *   - **`ItemExportService` direct service-class
 *     posture** — UNIQUE: the FIRST
 *     `requireClientAuth()`-gated GET smoke pinning a
 *     `new ItemExportService()` direct-instantiation
 *     pattern (NOT a repository factory). Distinct
 *     from the `getClientItemRepository()` factory
 *     pattern of the `client-items-stats-query`
 *     sibling and the `ItemImportService`
 *     instantiation of the `client-items-import-method`
 *     / `client-items-import-validate-method`
 *     siblings.
 *   - **`'Unauthorized. Please sign in to continue.'`**
 *     longer-message TWO-key 401 envelope (matches the
 *     prior `client-items*` siblings; distinct from
 *     the admin sibling
 *     `admin-items-export-sample-query`'s
 *     `'Unauthorized. Admin access required.'`
 *     envelope).
 *   - **`format=` Zod-enum case-sensitivity** — Zod
 *     enums match exactly, so `format=CSV` /
 *     `format=XLSX` round-trip to 4xx on the auth
 *     branch via the `safeErrorResponse(...)` catch.
 *     The unauth branch is invariant to this
 *     distinction (still 401).
 *   - **`format=` enum default** — the schema has a
 *     `.default('csv')`, so omitting `format` yields
 *     CSV on the auth branch. The unauth branch is
 *     invariant to this distinction (still 401).
 *
 * The route's authorization contract is the load-
 * bearing invariant this spec pins:
 *
 *   - **Unauthenticated**: `requireClientAuth()`
 *     returns `{ success: false, response: ... }`; the
 *     route returns 401 with the canonical
 *     `{ success: false, error: 'Unauthorized.
 *     Please sign in to continue.' }` envelope. This
 *     is the contract every assertion below pins,
 *     because the e2e runner does not carry an
 *     authenticated session by default.
 *   - **Authenticated client + valid `format`**:
 *     returns 200 with a binary CSV / XLSX stream
 *     and a `Content-Disposition: attachment;
 *     filename="…"` header. Out of scope for this
 *     spec because the gate fires before the export-
 *     service call on every unauth invocation.
 *   - **Authenticated client + invalid `format`**:
 *     Zod's `exportQuerySchema.parse(...)` throws,
 *     the catch fires, and `safeErrorResponse(error,
 *     'Failed to generate sample template')` routes
 *     the error to a 4xx. Out of scope for this spec
 *     because the auth gate fires before the schema
 *     parse on every unauth invocation.
 *   - **Internal error**: the catch returns 500 (or
 *     whatever `safeErrorResponse(...)` chooses) with
 *     `{ success: false, error: 'Failed to generate
 *     sample template' }`. Out of scope for this spec
 *     because the gate fires before any service call
 *     on every unauth invocation.
 *
 * The deeper `client-protected.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of
 * that.
 *
 * The shape mirrors the sibling
 * `admin-items-export-sample-query.spec.ts` — both
 * share the same "gate + Zod-parsed `format` enum +
 * binary-stream success contract" posture; the
 * difference is the auth helper and 401-envelope
 * message.
 */
const SAMPLE_PATH = '/api/client/items/import/sample';

const CLIENT_ITEMS_IMPORT_SAMPLE_QUERIES = [
	// Baseline — the no-arg unauthenticated case. The
	// `format` schema has a `.default('csv')`, so the
	// auth-branch happy path emits a CSV; the unauth
	// branch returns 401 before the schema parse runs.
	SAMPLE_PATH,

	// `?format=` — both members of the Zod enum.
	`${SAMPLE_PATH}?format=csv`,
	`${SAMPLE_PATH}?format=xlsx`,

	// `?format=` — empty string. Zod rejects (the enum
	// has no empty-string member; the `.default('csv')`
	// kicks in only on omit, not on present-but-empty).
	`${SAMPLE_PATH}?format=`,

	// `?format=` — unknown values. Zod rejects on the
	// auth branch via the `safeErrorResponse(...)` catch.
	`${SAMPLE_PATH}?format=invalid`,
	`${SAMPLE_PATH}?format=json`,
	`${SAMPLE_PATH}?format=pdf`,
	`${SAMPLE_PATH}?format=xml`,

	// `?format=` — case sensitivity. The Zod enum is
	// case-sensitive, so uppercase variants are
	// rejected (4xx) on the auth branch.
	`${SAMPLE_PATH}?format=CSV`,
	`${SAMPLE_PATH}?format=XLSX`,
	`${SAMPLE_PATH}?format=Csv`,
	`${SAMPLE_PATH}?format=Xlsx`,

	// `?userId=` / `?adminId=` / `?as=` —
	// impersonation keys a future contributor might
	// add. The route reads the user identity from
	// `requireClientAuth()` exclusively today.
	`${SAMPLE_PATH}?userId=anything`,
	`${SAMPLE_PATH}?user_id=anything`,
	`${SAMPLE_PATH}?adminId=anything`,
	`${SAMPLE_PATH}?as=admin`,
	`${SAMPLE_PATH}?asUser=true`,
	`${SAMPLE_PATH}?impersonate=admin`,

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	`${SAMPLE_PATH}?token=anything`,
	`${SAMPLE_PATH}?secret=anything`,
	`${SAMPLE_PATH}?api_key=anything`,
	`${SAMPLE_PATH}?authorization=Bearer+anything`,
	`${SAMPLE_PATH}?session=anything`,
	`${SAMPLE_PATH}?clientToken=anything`,

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	`${SAMPLE_PATH}?bypass=1`,
	`${SAMPLE_PATH}?admin=1`,
	`${SAMPLE_PATH}?admin=true`,
	`${SAMPLE_PATH}?override=true`,
	`${SAMPLE_PATH}?force=true`,

	// `?download=` / `?inline=` — content-disposition
	// keys for a future contributor. The route hard-
	// codes the `Content-Disposition: attachment; …`
	// header today.
	`${SAMPLE_PATH}?download=1`,
	`${SAMPLE_PATH}?inline=1`,
	`${SAMPLE_PATH}?disposition=attachment`,
	`${SAMPLE_PATH}?disposition=inline`,

	// `?filename=` — filename-override keys for a
	// future contributor. The route hard-codes the
	// filename to the export-service's per-format
	// default today. A future contributor who lets the
	// caller override the filename via `?filename=…`
	// must NOT propagate path-traversal sequences
	// (`../../etc/passwd`) or null-byte injection
	// (`%00`) to the `Content-Disposition` header.
	`${SAMPLE_PATH}?filename=custom.csv`,
	`${SAMPLE_PATH}?filename=../../etc/passwd`,
	`${SAMPLE_PATH}?filename=%00malicious`,

	// `?locale=` / `?lang=` — i18n keys.
	`${SAMPLE_PATH}?locale=en`,
	`${SAMPLE_PATH}?locale=fr`,
	`${SAMPLE_PATH}?lang=de`,

	// `?tenant=` / `?tenantId=` / `?org=` — multi-
	// tenancy keys. The sample template is per-tenant
	// invariant today (it's a fixed CSV / XLSX).
	`${SAMPLE_PATH}?tenant=acme`,
	`${SAMPLE_PATH}?tenantId=42`,
	`${SAMPLE_PATH}?org=ever-works`,

	// `?fields=` / `?columns=` — field-projection keys
	// for a future contributor. The route returns the
	// full sample-template column set today.
	`${SAMPLE_PATH}?fields=id`,
	`${SAMPLE_PATH}?fields=id,name,description`,
	`${SAMPLE_PATH}?columns=name`,

	// `?refresh=` / `?force=` / `?cache=` — cache-
	// busting keys.
	`${SAMPLE_PATH}?refresh=1`,
	`${SAMPLE_PATH}?fresh=true`,
	`${SAMPLE_PATH}?cache=bypass`,
	`${SAMPLE_PATH}?nocache=1`,

	// Repeated keys — `searchParams.get(name)` returns
	// the first value for every key the route reads.
	`${SAMPLE_PATH}?format=csv&format=xlsx`,
	`${SAMPLE_PATH}?format=invalid&format=csv`,

	// Bogus / typo'd query keys — the route reads one
	// documented key today, so any combination of
	// unknown keys is silently ignored on every branch.
	`${SAMPLE_PATH}?unknown=value`,
	`${SAMPLE_PATH}?foo=bar&baz=qux`,
	`${SAMPLE_PATH}?userId=admin&token=foo&unknown=value&format=csv&foo=bar`
] as const;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: 'text/csv' }, label: 'text/csv accept' },
	{
		headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
		label: 'xlsx accept'
	},
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Cookie: 'authjs.session-token=fabricated' }, label: 'fabricated authjs cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'fabricated X-Forwarded-For header' },
	{ headers: { 'X-Real-IP': '10.0.0.1' }, label: 'fabricated X-Real-IP header' }
] as const;

test.describe('API: /api/client/items/import/sample query-param surface', () => {
	for (const path of CLIENT_ITEMS_IMPORT_SAMPLE_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's `requireClientAuth()` gate fires
			// before any `searchParams` parsing or service
			// call, so the unauthenticated GET surface
			// returns a 4xx (typically 401)
			// deterministically. There is no 5xx branch
			// reachable on the unauthenticated GET surface
			// because the catch can only fire after the
			// gate has already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { headers, label } of HEADERS) {
		test(`GET ${SAMPLE_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(SAMPLE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${SAMPLE_PATH} returns a 401 with the longer-message TWO-key envelope on the unauth branch`, async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the `requireClientAuth()`
		// gate must fire before any `searchParams`
		// parsing or service call. The status must be
		// exactly 401 (the helper hard-codes the 401
		// status in the gate's `NextResponse.json` call).
		// Either way the response must NOT echo any
		// sample-template data — every consuming client
		// depends on the early-return.
		const response = await request.get(SAMPLE_PATH);

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized. Please sign in to continue.'
		});
	});

	test(`GET ${SAMPLE_PATH} 401 envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		// Strict envelope-shape preservation: the unauth
		// branch must return EXACTLY the two-key envelope
		// `{ success, error }` with no extra keys leaking
		// from the post-auth happy-path / catch branches.
		const response = await request.get(SAMPLE_PATH);
		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.data).toBeUndefined();
		expect(body.format).toBeUndefined();
		expect(body.filename).toBeUndefined();
	});

	test(`GET ${SAMPLE_PATH} does NOT echo the catch-branch 500 message on the unauth branch`, async ({
		request
	}) => {
		// The catch-branch message
		// (`'Failed to generate sample template'`) must
		// NEVER appear on the unauth branch. A regression
		// that runs the schema parse before the gate
		// would surface here as the catch-branch message
		// leaking into the 4xx body.
		const response = await request.get(SAMPLE_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('Failed to generate sample template');
	});

	test(`GET ${SAMPLE_PATH} does NOT leak Content-Disposition attachment header on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the binary-stream success branch
		// emits a `Content-Disposition: attachment;
		// filename="…"` header. The unauth branch must
		// NEVER emit this header — every consuming
		// client depends on the early-return JSON
		// envelope. A regression that runs the export-
		// service before the gate would surface here as
		// an attachment header leaking on the 401 branch.
		const response = await request.get(SAMPLE_PATH);
		const disposition = response.headers()['content-disposition'];
		// Either absent OR a non-attachment value (e.g. inline) is acceptable —
		// the load-bearing invariant is that the unauth branch does NOT
		// trigger a binary-stream attachment download.
		if (disposition) {
			expect(disposition).not.toContain('attachment');
		}
	});

	test(`GET ${SAMPLE_PATH} does NOT leak a binary content-type on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the binary-stream success branch
		// emits a `Content-Type: text/csv` (CSV format)
		// or `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
		// (XLSX format) header. The unauth branch must
		// emit a JSON content-type instead. A regression
		// that runs the export-service before the gate
		// would surface here as a binary content-type on
		// the 401 branch.
		const response = await request.get(SAMPLE_PATH);
		const contentType = response.headers()['content-type'] ?? '';
		expect(contentType).toContain('application/json');
		expect(contentType).not.toContain('text/csv');
		expect(contentType).not.toContain('spreadsheetml');
	});

	test(`GET ${SAMPLE_PATH} has a stable status across query permutations on the unauth branch`, async ({
		request
	}) => {
		// The route reads one documented query param
		// (`format`) today after the gate, so the
		// response status must be invariant to any
		// combination of known and unknown keys. A
		// regression that reads any query param before
		// the gate would surface here as a status
		// divergence between the no-arg baseline and the
		// parameterised variant.
		const baseline = await request.get(SAMPLE_PATH);
		const parameterised = await request.get(
			`${SAMPLE_PATH}?format=csv&userId=admin&token=anything&unknown=value`
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test(`GET ${SAMPLE_PATH}?format=… does NOT bypass the requireClientAuth gate`, async ({
		request
	}) => {
		// The `?format=` param is parsed via Zod's
		// `exportQuerySchema.parse(...)` after the gate,
		// with the `'csv' | 'xlsx'` enum gating the
		// happy-path branch and the `safeErrorResponse(...)`
		// catch routing every other value to a 4xx on the
		// auth branch. The unauth branch must always
		// return 401 regardless of the format value. A
		// regression that runs the schema parse before
		// the gate would surface here as a 4xx on
		// `?format=invalid`.
		const baseline = await request.get(SAMPLE_PATH);
		const responses = await Promise.all([
			request.get(`${SAMPLE_PATH}?format=csv`),
			request.get(`${SAMPLE_PATH}?format=xlsx`),
			request.get(`${SAMPLE_PATH}?format=`),
			request.get(`${SAMPLE_PATH}?format=invalid`),
			request.get(`${SAMPLE_PATH}?format=json`),
			request.get(`${SAMPLE_PATH}?format=CSV`),
			request.get(`${SAMPLE_PATH}?format=XLSX`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${SAMPLE_PATH}?userId=… does NOT bypass the requireClientAuth gate`, async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `requireClientAuth()`'s session-driven user
		// resolution would change the unauth branch from
		// "always 401" to "200 if ?userId=… is present"
		// — silently granting any anonymous caller
		// client-level export access. This assertion
		// catches that change immediately.
		const baseline = await request.get(SAMPLE_PATH);
		const responses = await Promise.all([
			request.get(`${SAMPLE_PATH}?userId=admin`),
			request.get(`${SAMPLE_PATH}?user_id=admin`),
			request.get(`${SAMPLE_PATH}?adminId=admin`),
			request.get(`${SAMPLE_PATH}?as=admin`),
			request.get(`${SAMPLE_PATH}?asUser=true`),
			request.get(`${SAMPLE_PATH}?impersonate=admin`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${SAMPLE_PATH}?token=… does NOT bypass the requireClientAuth gate`, async ({
		request
	}) => {
		// A future contributor who adds magic-token-
		// based bypass — e.g. a `?token=…` shortcut for
		// an internal cron job that pre-warms the sample
		// template, a `?secret=…` shortcut for a
		// staging-environment integration test, or a
		// `?authorization=Bearer …` header-mirroring
		// key — would change the unauth branch from
		// "always 401" to "200 if the right token is
		// present". This assertion catches that change
		// immediately.
		const baseline = await request.get(SAMPLE_PATH);
		const responses = await Promise.all([
			request.get(`${SAMPLE_PATH}?token=anything`),
			request.get(`${SAMPLE_PATH}?secret=anything`),
			request.get(`${SAMPLE_PATH}?api_key=anything`),
			request.get(`${SAMPLE_PATH}?authorization=Bearer+anything`),
			request.get(`${SAMPLE_PATH}?session=anything`),
			request.get(`${SAMPLE_PATH}?clientToken=anything`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${SAMPLE_PATH}?filename=… does NOT introduce a path-traversal bypass`, async ({
		request
	}) => {
		// The route hard-codes the filename to the
		// export-service's per-format default today. A
		// future contributor who lets the caller
		// override the filename via `?filename=…` must
		// NOT propagate path-traversal sequences
		// (`../../etc/passwd`) or null-byte injection
		// (`%00`) to the `Content-Disposition` header.
		// The unauth branch must always return 401
		// regardless of the filename override value.
		const baseline = await request.get(SAMPLE_PATH);
		const responses = await Promise.all([
			request.get(`${SAMPLE_PATH}?filename=custom.csv`),
			request.get(`${SAMPLE_PATH}?filename=../../etc/passwd`),
			request.get(`${SAMPLE_PATH}?filename=%00malicious`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${SAMPLE_PATH} does NOT branch on Accept header`, async ({ request }) => {
		// The route does not negotiate content-types
		// today; every Accept header must round-trip to
		// the same status on the unauth branch. The
		// happy-path content-type is determined by the
		// `?format=` enum post-gate (CSV vs XLSX), not
		// by the Accept header.
		const baseline = await request.get(SAMPLE_PATH);
		const responses = await Promise.all([
			request.get(SAMPLE_PATH, { headers: { Accept: 'application/json' } }),
			request.get(SAMPLE_PATH, { headers: { Accept: 'text/csv' } }),
			request.get(SAMPLE_PATH, {
				headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
			}),
			request.get(SAMPLE_PATH, { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${SAMPLE_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		// A future regression that adds a cookie / IP-
		// based client-auth bypass would surface here as
		// a 200 on the unauth branch with a fabricated
		// session cookie. This assertion pins the unauth-
		// branch contract by sweeping a few known-bogus
		// cookie / header values.
		const baseline = await request.get(SAMPLE_PATH);
		const responses = await Promise.all([
			request.get(SAMPLE_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get(SAMPLE_PATH, {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get(SAMPLE_PATH, { headers: { Authorization: 'Bearer fabricated' } }),
			request.get(SAMPLE_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.get(SAMPLE_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.get(SAMPLE_PATH, { headers: { 'X-Real-IP': '10.0.0.1' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${SAMPLE_PATH} repeated query keys do NOT bypass the gate`, async ({ request }) => {
		// `searchParams.get(name)` returns the first
		// value of any repeated key, so repetition is
		// irrelevant on every branch. The unauth branch
		// must return 401 regardless of whether the
		// repeated value is valid or invalid.
		const baseline = await request.get(SAMPLE_PATH);
		const responses = await Promise.all([
			request.get(`${SAMPLE_PATH}?format=csv&format=xlsx`),
			request.get(`${SAMPLE_PATH}?format=invalid&format=csv`),
			request.get(`${SAMPLE_PATH}?format=&format=csv`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`GET ${SAMPLE_PATH} cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// GET is the only exported method.
		const responses = await Promise.all([
			request.post(SAMPLE_PATH),
			request.put(SAMPLE_PATH),
			request.patch(SAMPLE_PATH),
			request.delete(SAMPLE_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${SAMPLE_PATH} cross-permutation status invariance — every permutation produces an IDENTICAL unauth envelope`, async ({
		request
	}) => {
		// Three different parameter sets, all of which
		// must round-trip to the same status on the
		// unauth branch. The shape guarantees the
		// route's `requireClientAuth()` gate fires
		// before any branching on the documented
		// `format` query param or any potential future
		// query schemas.
		const responses = await Promise.all([
			request.get(SAMPLE_PATH),
			request.get(`${SAMPLE_PATH}?format=csv`),
			request.get(
				`${SAMPLE_PATH}?userId=admin&token=foo&format=invalid&filename=../../etc/passwd&unknown=bar`
			)
		]);

		const baselineStatus = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}

		const bodies = await Promise.all(responses.map((r) => r.json()));
		for (const body of bodies) {
			expect(body).toEqual({
				success: false,
				error: 'Unauthorized. Please sign in to continue.'
			});
		}
	});
});
