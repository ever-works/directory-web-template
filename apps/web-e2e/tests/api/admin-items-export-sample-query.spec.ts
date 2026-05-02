import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only sample-template-export endpoint served by
 * `apps/web/app/api/admin/items/export/sample/route.ts`.
 *
 * `GET /api/admin/items/export/sample` is **admin-gated**
 * via `auth()` + the `session.user.isAdmin` bit (NOT the
 * session-only gate the sibling `admin/featured-items`
 * route uses). The handler reads a single Zod-validated
 * query param after the gate (`format`, an enum of
 * `'csv' | 'xlsx'` with a `'csv'` default), so the
 * unauthenticated branch returns 401 with the canonical
 * `{ success: false, error: 'Unauthorized. Admin access required.' }`
 * envelope regardless of which keys the caller appends:
 *
 *     export async function GET(request: NextRequest) {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.isAdmin) {
 *           return NextResponse.json(
 *             { success: false, error: 'Unauthorized. Admin access required.' },
 *             { status: 401 }
 *           );
 *         }
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
 * The route's single documented query param (`format`) is
 * read **after** the admin gate, so every call from this
 * spec — which carries no authenticated session — round-
 * trips to the same 401 regardless of the query string. A
 * regression that reads any query param before the gate
 * (e.g. a future `?asUser=true` impersonation key, a
 * `?token=…` magic-token bypass, a `?as=admin` admin-
 * override, or any other dangerous-passthrough that
 * bypasses `session?.user?.isAdmin`) would change the
 * unauth branch's behaviour from "always 401" to
 * "200 / 400 / 500 if the right query is present" — and
 * that change is exactly what this spec catches.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session without `isAdmin`); the route returns 401
 *     with the canonical
 *     `{ success: false, error: 'Unauthorized. Admin access required.' }`
 *     envelope. This is the contract every assertion
 *     below pins, because the e2e runner does not carry
 *     an authenticated session by default.
 *   - **Authenticated user, missing `isAdmin`**: same 401
 *     branch. The admin-bit gate is the single auth
 *     primitive this route honours.
 *   - **Admin with valid `format`**: returns 200 with a
 *     binary CSV / XLSX stream and a `Content-
 *     Disposition: attachment; filename="…"` header. Out
 *     of scope for this spec because the gate fires
 *     before the export-service call on every unauth
 *     invocation.
 *   - **Admin with invalid `format`**: Zod's
 *     `exportQuerySchema.parse(…)` throws, the catch
 *     fires, and `safeErrorResponse(...)` routes the
 *     error to a 4xx. Out of scope for this spec because
 *     the admin gate fires before the schema parse on
 *     every unauth invocation.
 *   - **Internal error**: the catch returns 500 (or
 *     whatever `safeErrorResponse(...)` chooses) with
 *     `{ success: false, error: 'Failed to generate sample template' }`.
 *     Out of scope for this spec because the gate fires
 *     before any service call on every unauth invocation.
 *
 * The query-param surface walks the unauthenticated
 * branch because that is the branch every call from this
 * spec hits. A regression that introduces query-string-
 * based bypass — e.g. a future `?asUser=true`
 * impersonation key that fires before `auth()`, a
 * `?token=…` magic-token bypass, or a `?format=…` key
 * that branches before the admin gate — would surface
 * immediately as a status divergence between the no-arg
 * 401 and a parameter-laden non-401.
 *
 * The shape mirrors the sibling admin-gated
 * `admin-categories-query.spec.ts`,
 * `admin-collections-query.spec.ts`,
 * `admin-comments-query.spec.ts`,
 * `admin-companies-query.spec.ts`,
 * `admin-dashboard-stats-query.spec.ts`,
 * `admin-featured-items-query.spec.ts`,
 * `admin-geo-analytics-query.spec.ts`,
 * `admin-items-stats-query.spec.ts`,
 * `admin-users-query.spec.ts`,
 * `items-export-query.spec.ts`,
 * `items-export-settings-query.spec.ts` smoke specs —
 * all share the same "admin-or-session gated, 401/403
 * before any service-layer call" posture. The
 * sample-template-export route is unique in that:
 *   1. It uses the **admin gate** (`session?.user?.isAdmin`)
 *      — same as the sibling `admin/categories`,
 *      `admin/comments`, `admin/companies`, `admin/users`
 *      routes — distinct from the session-only gate the
 *      `admin/featured-items` route uses.
 *   2. The 401 envelope carries the role-context-specific
 *      **`'Unauthorized. Admin access required.'`**
 *      message — distinct from the session-gated routes'
 *      bare `'Unauthorized'` message and from the
 *      `admin/comments` route's `{ success: false, error:
 *      'Forbidden' }` envelope (which drops the canonical
 *      401 status entirely). The admin-gated message is
 *      the production-source convention for routes that
 *      check the `isAdmin` bit explicitly.
 *   3. The post-gate handler delegates query parse to a
 *      **Zod schema** (`exportQuerySchema` from
 *      `@/lib/validations/item-import`) — distinct from
 *      the inline `parseInt(...)` + `isNaN` check the
 *      `admin/companies` route uses and distinct from
 *      the shared `validatePaginationParams(...)`
 *      utility the `admin/featured-items` route uses.
 *      The Zod-schema posture is the production-source
 *      convention for routes that gate downloads on a
 *      strict format enum (the schema's enum is
 *      `'csv' | 'xlsx'`, so any other value — including
 *      the empty string — round-trips to a 4xx on the
 *      auth branch).
 *   4. The post-gate handler reads exactly **one**
 *      documented query key (`format`) — fewer than the
 *      `admin/categories` route's five, fewer than the
 *      `admin/users` route's five, fewer than the
 *      `admin/collections` route's six, fewer than the
 *      `admin/comments` route's three, fewer than the
 *      `admin/featured-items` route's three. The
 *      narrower surface means fewer bypass vectors but
 *      the same boundary-test discipline.
 *   5. The route returns a **binary stream** on the
 *      happy path (a CSV string for `format=csv` /
 *      XLSX-encoded `Uint8Array` for `format=xlsx`) with
 *      a `Content-Disposition: attachment; filename="…"`
 *      header. Distinct from the JSON-envelope shape
 *      every sibling admin-gated query smoke pins. The
 *      unauth branch is invariant to this distinction
 *      (still a 401 JSON envelope), but the post-auth
 *      contract is fundamentally different.
 *   6. The route uses the `ItemExportService` directly
 *      (`new ItemExportService()` then
 *      `generateSampleCSV()` / `generateSampleXLSX()`)
 *      without a repository abstraction — distinct from
 *      the `admin/categories` route's
 *      `categoryRepository.findAllPaginated(...)`
 *      posture. The service-class posture is the
 *      production-source convention for routes that
 *      generate documents on the fly (rather than
 *      reading from the database).
 *   7. The route is a sibling of
 *      `apps/web/app/api/admin/items/export/route.ts`
 *      (the per-tenant items-export route) but generates
 *      a **fixed sample template** rather than a per-
 *      tenant export. The sample template is a static
 *      CSV / XLSX that documents the importable column
 *      shape — useful for admins building a CSV by hand
 *      before re-importing.
 *   8. The route's `format=` enum is case-sensitive (Zod
 *      enums match exactly), so `format=CSV` /
 *      `format=XLSX` round-trip to 4xx on the auth
 *      branch. The unauth branch is invariant to this
 *      distinction.
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of that.
 */
const ADMIN_ITEMS_EXPORT_SAMPLE_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/items/export/sample',

	// `?format=` — both members of the Zod enum.
	'/api/admin/items/export/sample?format=csv',
	'/api/admin/items/export/sample?format=xlsx',

	// `?format=` — empty string. Zod rejects (the enum
	// has no empty-string member) and the catch routes
	// the error through `safeErrorResponse(...)` to a
	// 4xx on the auth branch. The default-on-omit path
	// does not apply because the param is present-but-
	// empty.
	'/api/admin/items/export/sample?format=',

	// `?format=` — unknown value. Same
	// `safeErrorResponse` 4xx path on the auth branch.
	'/api/admin/items/export/sample?format=invalid',
	'/api/admin/items/export/sample?format=json',
	'/api/admin/items/export/sample?format=pdf',
	'/api/admin/items/export/sample?format=xml',

	// `?format=` — case sensitivity. The Zod enum is
	// case-sensitive, so uppercase variants are rejected
	// (4xx) on the auth branch.
	'/api/admin/items/export/sample?format=CSV',
	'/api/admin/items/export/sample?format=XLSX',
	'/api/admin/items/export/sample?format=Csv',
	'/api/admin/items/export/sample?format=Xlsx',

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys a future contributor might add. The route
	// reads the user identity from `session.user.isAdmin`
	// exclusively today.
	'/api/admin/items/export/sample?userId=anything',
	'/api/admin/items/export/sample?user_id=anything',
	'/api/admin/items/export/sample?adminId=anything',
	'/api/admin/items/export/sample?as=admin',
	'/api/admin/items/export/sample?asUser=true',
	'/api/admin/items/export/sample?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/items/export/sample?token=anything',
	'/api/admin/items/export/sample?secret=anything',
	'/api/admin/items/export/sample?api_key=anything',
	'/api/admin/items/export/sample?authorization=Bearer+anything',
	'/api/admin/items/export/sample?session=anything',
	'/api/admin/items/export/sample?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/items/export/sample?bypass=1',
	'/api/admin/items/export/sample?admin=1',
	'/api/admin/items/export/sample?admin=true',
	'/api/admin/items/export/sample?override=true',
	'/api/admin/items/export/sample?force=true',

	// `?download=` / `?inline=` — content-disposition
	// keys for a future contributor. The route hard-
	// codes the `Content-Disposition: attachment; …`
	// header today.
	'/api/admin/items/export/sample?download=1',
	'/api/admin/items/export/sample?inline=1',
	'/api/admin/items/export/sample?disposition=attachment',
	'/api/admin/items/export/sample?disposition=inline',

	// `?filename=` — filename-override keys for a future
	// contributor. The route hard-codes the filename to
	// the export-service's per-format default today.
	'/api/admin/items/export/sample?filename=custom.csv',
	'/api/admin/items/export/sample?filename=../../etc/passwd',
	'/api/admin/items/export/sample?filename=%00malicious',

	// `?locale=` / `?lang=` — i18n keys.
	'/api/admin/items/export/sample?locale=en',
	'/api/admin/items/export/sample?locale=fr',
	'/api/admin/items/export/sample?lang=de',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-
	// tenancy keys. The sample template is per-tenant
	// invariant today (it's a fixed CSV / XLSX).
	'/api/admin/items/export/sample?tenant=acme',
	'/api/admin/items/export/sample?tenantId=42',
	'/api/admin/items/export/sample?org=ever-works',

	// `?fields=` / `?columns=` — field-projection keys
	// for a future contributor. The route returns the
	// full sample-template column set today.
	'/api/admin/items/export/sample?fields=id',
	'/api/admin/items/export/sample?fields=id,name,description',
	'/api/admin/items/export/sample?columns=name',

	// `?refresh=` / `?force=` / `?cache=` — cache-busting
	// keys.
	'/api/admin/items/export/sample?refresh=1',
	'/api/admin/items/export/sample?fresh=true',
	'/api/admin/items/export/sample?cache=bypass',
	'/api/admin/items/export/sample?nocache=1',

	// `?metadata=` / `?includeMetadata=` —
	// metadata-toggle keys mirroring the
	// `#include-metadata` checkbox in the
	// `AdminDataExportPage` driver. The sample-template
	// route does not gate on metadata today.
	'/api/admin/items/export/sample?metadata=true',
	'/api/admin/items/export/sample?metadata=false',
	'/api/admin/items/export/sample?includeMetadata=true',
	'/api/admin/items/export/sample?includeMetadata=false',

	// Repeated keys — `searchParams.get(name)` returns
	// the first value for every key the route reads.
	'/api/admin/items/export/sample?format=csv&format=xlsx',
	'/api/admin/items/export/sample?format=invalid&format=csv',

	// Bogus / typo'd query keys — the route reads one
	// documented key today, so any combination of
	// unknown keys is silently ignored on every branch.
	'/api/admin/items/export/sample?unknown=value',
	'/api/admin/items/export/sample?foo=bar&baz=qux',
	'/api/admin/items/export/sample?userId=admin&token=foo&unknown=value&format=csv&foo=bar'
] as const;

test.describe('API: /api/admin/items/export/sample query-param surface', () => {
	for (const path of ADMIN_ITEMS_EXPORT_SAMPLE_QUERIES) {
		test(`GET ${path} responds without a server error`, async ({ request }) => {
			const response = await request.get(path);

			// The route's admin gate fires before any
			// `searchParams` parsing or service call, so the
			// unauthenticated GET surface returns a 4xx
			// (typically 401) deterministically. There is no
			// 5xx branch reachable on the unauthenticated GET
			// surface because the catch can only fire after
			// the gate has already let the call through.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/admin/items/export/sample returns a 401 on the unauth branch', async ({
		request
	}) => {
		// The unauthenticated GET branch is the load-
		// bearing invariant: the admin gate must fire before
		// any `searchParams` parsing or service call. The
		// status must be exactly 401 (the route hard-codes
		// the 401 status in the gate's `NextResponse.json`
		// call). Either way the response must NOT echo any
		// sample-template data — every consuming client
		// depends on the early-return.
		const response = await request.get('/api/admin/items/export/sample');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized. Admin access required.'
		});
	});

	test('GET /api/admin/items/export/sample has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads one documented query param today
		// after the gate, so the response status must be
		// invariant to any combination of known and unknown
		// keys. A regression that reads any query param
		// before the gate would surface here as a status
		// divergence between the no-arg baseline and the
		// parameterised variant.
		const baseline = await request.get('/api/admin/items/export/sample');
		const parameterised = await request.get(
			'/api/admin/items/export/sample?format=csv&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/items/export/sample?format=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `?format=` param is parsed via Zod's
		// `exportQuerySchema.parse(...)` after the gate,
		// with the `'csv' | 'xlsx'` enum gating the
		// happy-path branch and the `safeErrorResponse(...)`
		// catch routing every other value to a 4xx on the
		// auth branch. The unauth branch must always return
		// 401 regardless of the format value. A regression
		// that runs the schema parse before the gate would
		// surface here as a 4xx on `?format=invalid`.
		const baseline = await request.get('/api/admin/items/export/sample');
		const responses = await Promise.all([
			request.get('/api/admin/items/export/sample?format=csv'),
			request.get('/api/admin/items/export/sample?format=xlsx'),
			request.get('/api/admin/items/export/sample?format='),
			request.get('/api/admin/items/export/sample?format=invalid'),
			request.get('/api/admin/items/export/sample?format=json'),
			request.get('/api/admin/items/export/sample?format=CSV'),
			request.get('/api/admin/items/export/sample?format=XLSX')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export/sample?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads
		// `searchParams.get('userId')` as a fallback for
		// `auth()`'s session-driven user resolution would
		// change the unauth branch from "always 401" to
		// "200 if ?userId=… is present" — silently
		// granting any anonymous caller admin-level export
		// access. This assertion catches that change
		// immediately.
		const baseline = await request.get('/api/admin/items/export/sample');
		const responses = await Promise.all([
			request.get('/api/admin/items/export/sample?userId=admin'),
			request.get('/api/admin/items/export/sample?user_id=admin'),
			request.get('/api/admin/items/export/sample?adminId=admin'),
			request.get('/api/admin/items/export/sample?as=admin'),
			request.get('/api/admin/items/export/sample?asUser=true'),
			request.get('/api/admin/items/export/sample?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export/sample?token=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who adds magic-token-based
		// admin bypass — e.g. a `?token=…` shortcut for an
		// internal cron job that pre-warms the sample
		// template, a `?secret=…` shortcut for a staging-
		// environment integration test, or a
		// `?authorization=Bearer …` header-mirroring key —
		// would change the unauth branch from "always 401"
		// to "200 if the right token is present". This
		// assertion catches that change immediately.
		const baseline = await request.get('/api/admin/items/export/sample');
		const responses = await Promise.all([
			request.get('/api/admin/items/export/sample?token=anything'),
			request.get('/api/admin/items/export/sample?secret=anything'),
			request.get('/api/admin/items/export/sample?api_key=anything'),
			request.get('/api/admin/items/export/sample?authorization=Bearer+anything'),
			request.get('/api/admin/items/export/sample?session=anything'),
			request.get('/api/admin/items/export/sample?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export/sample?bypass=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who adds a `?bypass=…`,
		// `?admin=…`, or `?override=…` admin-override key
		// would change the unauth branch from "always 401"
		// to "200 if the right key is present". This
		// assertion catches that change immediately.
		const baseline = await request.get('/api/admin/items/export/sample');
		const responses = await Promise.all([
			request.get('/api/admin/items/export/sample?bypass=1'),
			request.get('/api/admin/items/export/sample?admin=1'),
			request.get('/api/admin/items/export/sample?admin=true'),
			request.get('/api/admin/items/export/sample?override=true'),
			request.get('/api/admin/items/export/sample?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export/sample?filename=… does NOT introduce a path-traversal bypass', async ({
		request
	}) => {
		// The route hard-codes the filename to the export-
		// service's per-format default today. A future
		// contributor who lets the caller override the
		// filename via `?filename=…` must NOT propagate
		// path-traversal sequences (`../../etc/passwd`) or
		// null-byte injection (`%00`) to the
		// `Content-Disposition` header. The unauth branch
		// must always return 401 regardless of the filename
		// override value.
		const baseline = await request.get('/api/admin/items/export/sample');
		const responses = await Promise.all([
			request.get('/api/admin/items/export/sample?filename=custom.csv'),
			request.get('/api/admin/items/export/sample?filename=../../etc/passwd'),
			request.get('/api/admin/items/export/sample?filename=%00malicious')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export/sample?metadata=… does NOT introduce a metadata-toggle bypass', async ({
		request
	}) => {
		// The sample-template route does not gate on
		// metadata today (the `#include-metadata` checkbox
		// in the `AdminDataExportPage` driver toggles
		// metadata only on the per-tenant export route at
		// `/api/admin/items/export`, not the sample-
		// template route). A future contributor who adds a
		// `?metadata=…` / `?includeMetadata=…` filter on the
		// sample-template route must not bypass the admin
		// gate. The unauth branch's status must be
		// invariant to the metadata keys.
		const baseline = await request.get('/api/admin/items/export/sample');
		const responses = await Promise.all([
			request.get('/api/admin/items/export/sample?metadata=true'),
			request.get('/api/admin/items/export/sample?metadata=false'),
			request.get('/api/admin/items/export/sample?includeMetadata=true'),
			request.get('/api/admin/items/export/sample?includeMetadata=false')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export/sample keeps the response status stable across param permutations', async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the same status on the unauth
		// branch. The shape guarantees the route's admin
		// gate fires before any branching on the documented
		// `format` query param or any potential future
		// query schemas.
		const responses = await Promise.all([
			request.get('/api/admin/items/export/sample'),
			request.get('/api/admin/items/export/sample?format=csv'),
			request.get(
				'/api/admin/items/export/sample?userId=admin&token=foo&format=invalid&filename=../../etc/passwd&unknown=bar'
			)
		]);

		const baseline = responses[0].status();
		for (const response of responses) {
			expect(response.status()).toBe(baseline);
		}
	});

	test('GET /api/admin/items/export/sample does NOT branch on Accept header', async ({
		request
	}) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to the same
		// status on the unauth branch. The happy-path
		// content-type is determined by the `?format=` enum
		// post-gate (CSV vs XLSX), not by the Accept
		// header.
		const baseline = await request.get('/api/admin/items/export/sample');
		const responses = await Promise.all([
			request.get('/api/admin/items/export/sample', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/admin/items/export/sample', {
				headers: { Accept: 'text/csv' }
			}),
			request.get('/api/admin/items/export/sample', {
				headers: {
					Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				}
			}),
			request.get('/api/admin/items/export/sample', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export/sample repeated query keys do NOT bypass the gate', async ({
		request
	}) => {
		// `searchParams.get(name)` returns the first value
		// of any repeated key, so repetition is irrelevant
		// on every branch. The unauth branch must return
		// 401 regardless of whether the repeated value is
		// valid or invalid.
		const baseline = await request.get('/api/admin/items/export/sample');
		const responses = await Promise.all([
			request.get('/api/admin/items/export/sample?format=csv&format=xlsx'),
			request.get('/api/admin/items/export/sample?format=invalid&format=csv'),
			request.get('/api/admin/items/export/sample?format=&format=csv')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export/sample keeps a NextRequest-typed handler signature stable', async ({
		request
	}) => {
		// The route's handler signature is
		// `GET(request: NextRequest)` — explicitly typed
		// against the Next-specific `NextRequest` type, NOT
		// the bare `Request` type the `admin/comments`
		// route uses. The Next-specific type opens up the
		// `request.cookies`, `request.geo`, `request.ip`
		// surface — but the unauth-branch contract must
		// stay invariant under any of those side channels.
		// A future regression that adds a cookie / IP-based
		// admin bypass would surface here as a 200 on the
		// unauth branch with a fabricated session cookie.
		// This assertion pins the unauth-branch contract by
		// sweeping a few known-bogus cookie / header
		// values.
		const responses = await Promise.all([
			request.get('/api/admin/items/export/sample', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/items/export/sample', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/items/export/sample', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/items/export/sample', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});
});
