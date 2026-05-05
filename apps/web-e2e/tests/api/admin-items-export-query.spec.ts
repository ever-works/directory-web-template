import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * admin-only items-export endpoint served by
 * `apps/web/app/api/admin/items/export/route.ts`.
 *
 * `GET /api/admin/items/export` is **admin-gated** via
 * `auth()` + the `session.user.isAdmin` bit (NOT the
 * session-only gate the sibling `admin/featured-items`
 * route uses, NOT the bare-no-gate posture the sibling
 * `admin/roles` and `admin/roles/active` routes use). The
 * handler reads a single Zod-validated query param after
 * the gate (`format`, an enum of `'csv' | 'xlsx'` with a
 * `'csv'` default), so the unauthenticated branch returns
 * 401 with the canonical
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
 *           const result = await exportService.exportToXLSX();
 *           return new NextResponse(new Uint8Array(result.data), {…});
 *         }
 *         const result = await exportService.exportToCSV();
 *         return new NextResponse(result.data, {…});
 *       } catch (error) {
 *         return safeErrorResponse(error, 'Failed to export items');
 *       }
 *     }
 *
 * The route's single documented query param (`format`) is
 * read **after** the admin gate, so every call from this
 * spec — which carries no authenticated session — round-
 * trips to the same 401 regardless of the query string.
 *
 * The route's authorization contract is the load-bearing
 * invariant this spec pins:
 *
 *   - **Unauthenticated**: `auth()` returns `null` (or a
 *     session without `isAdmin`); the route returns 401
 *     with the canonical
 *     `{ success: false, error: 'Unauthorized. Admin access required.' }`
 *     envelope.
 *   - **Authenticated user, missing `isAdmin`**: same 401
 *     branch.
 *   - **Admin with valid `format`**: returns 200 with a
 *     binary CSV / XLSX stream and a `Content-Disposition:
 *     attachment; filename="…"` header. Out of scope for
 *     this spec.
 *   - **Admin with invalid `format`**: Zod's
 *     `exportQuerySchema.parse(…)` throws, the catch
 *     fires, and `safeErrorResponse(...)` routes the
 *     error to a 4xx. Out of scope.
 *   - **Internal error**: the catch returns a 4xx / 5xx
 *     with `{ success: false, error: 'Failed to export items' }`.
 *     Out of scope.
 *
 * The query-param surface walks the unauthenticated
 * branch because that is the branch every call from this
 * spec hits. A regression that introduces query-string-
 * based bypass — e.g. a future `?asUser=true`
 * impersonation key that fires before `auth()`, a
 * `?token=…` magic-token bypass, or any `?format=…`
 * branch that runs before the admin gate — would surface
 * immediately as a status divergence between the no-arg
 * 401 and a parameter-laden non-401.
 *
 * This spec mirrors the sibling
 * `admin-items-export-sample-query.spec.ts` smoke
 * (covering `apps/web/app/api/admin/items/export/sample/route.ts`)
 * — the two routes share the same admin-gate posture,
 * the same `exportQuerySchema` Zod parse, and the same
 * `safeErrorResponse(...)` catch envelope. The difference
 * lies in the post-gate service call:
 *
 *   1. Same admin gate (`session?.user?.isAdmin`) and
 *      same canonical 401 message
 *      (`'Unauthorized. Admin access required.'`) — the
 *      production-source convention for admin-bit-gated
 *      routes.
 *   2. Same Zod schema (`exportQuerySchema` from
 *      `@/lib/validations/item-import`) — the production-
 *      source convention for routes that gate downloads
 *      on a strict `format=csv|xlsx` enum.
 *   3. Same single documented query key (`format`) — the
 *      narrow surface means fewer bypass vectors.
 *   4. Same binary-stream return shape with a
 *      `Content-Disposition: attachment; filename="…"`
 *      header on the happy path.
 *   5. **Distinct service call**: the sample route calls
 *      `exportService.generateSampleCSV()` /
 *      `generateSampleXLSX()` (a fixed sample template
 *      the user can edit and re-import); the route under
 *      test here calls `exportService.exportToCSV()` /
 *      `exportToXLSX()` (the **per-tenant items dump**,
 *      i.e. every item in the directory's CMS / DB).
 *      The unauth branch is invariant to this distinction
 *      (still a 401 JSON envelope), but the post-auth
 *      payload is fundamentally different.
 *   6. **Distinct catch message**: the sample route's
 *      catch returns `'Failed to generate sample template'`;
 *      the route under test here returns
 *      `'Failed to export items'`. The unauth branch is
 *      invariant to this distinction.
 *   7. **Distinct purpose**: the sample template is a
 *      static schema-documentation download the admin
 *      uses to build a CSV by hand; the items export is
 *      the live data-ownership "give me my data" download
 *      that every directory needs for backup, migration,
 *      or per-tenant audit.
 *
 * The deeper `admin-protected-extra.spec.ts` smoke also
 * covers this route at the broad `< 500` level; this
 * spec adds the deep query-surface walk on top of that.
 */
const ADMIN_ITEMS_EXPORT_QUERIES = [
	// Baseline — the no-arg unauthenticated case.
	'/api/admin/items/export',

	// `?format=` — both members of the Zod enum.
	'/api/admin/items/export?format=csv',
	'/api/admin/items/export?format=xlsx',

	// `?format=` — empty string. Zod rejects (the enum
	// has no empty-string member) and the catch routes
	// the error through `safeErrorResponse(...)` to a
	// 4xx on the auth branch. The default-on-omit path
	// does not apply because the param is present-but-
	// empty.
	'/api/admin/items/export?format=',

	// `?format=` — unknown value. Same `safeErrorResponse`
	// 4xx path on the auth branch.
	'/api/admin/items/export?format=invalid',
	'/api/admin/items/export?format=json',
	'/api/admin/items/export?format=pdf',
	'/api/admin/items/export?format=xml',
	'/api/admin/items/export?format=tsv',
	'/api/admin/items/export?format=yaml',

	// `?format=` — case sensitivity. The Zod enum is
	// case-sensitive, so uppercase variants are rejected
	// (4xx) on the auth branch.
	'/api/admin/items/export?format=CSV',
	'/api/admin/items/export?format=XLSX',
	'/api/admin/items/export?format=Csv',
	'/api/admin/items/export?format=Xlsx',

	// `?userId=` / `?adminId=` / `?as=` — impersonation
	// keys a future contributor might add. The route
	// reads the user identity from `session.user.isAdmin`
	// exclusively today.
	'/api/admin/items/export?userId=anything',
	'/api/admin/items/export?user_id=anything',
	'/api/admin/items/export?adminId=anything',
	'/api/admin/items/export?as=admin',
	'/api/admin/items/export?asUser=true',
	'/api/admin/items/export?impersonate=admin',

	// `?token=` / `?secret=` / `?api_key=` /
	// `?authorization=` — magic-token bypass keys.
	'/api/admin/items/export?token=anything',
	'/api/admin/items/export?secret=anything',
	'/api/admin/items/export?api_key=anything',
	'/api/admin/items/export?authorization=Bearer+anything',
	'/api/admin/items/export?session=anything',
	'/api/admin/items/export?adminToken=anything',

	// `?bypass=` / `?admin=` / `?override=` — admin-
	// override keys.
	'/api/admin/items/export?bypass=1',
	'/api/admin/items/export?admin=1',
	'/api/admin/items/export?admin=true',
	'/api/admin/items/export?override=true',
	'/api/admin/items/export?force=true',

	// `?download=` / `?inline=` — content-disposition
	// keys for a future contributor. The route hard-
	// codes the `Content-Disposition: attachment; …`
	// header today.
	'/api/admin/items/export?download=1',
	'/api/admin/items/export?inline=1',
	'/api/admin/items/export?disposition=attachment',
	'/api/admin/items/export?disposition=inline',

	// `?filename=` — filename-override keys for a future
	// contributor. The route hard-codes the filename to
	// the export-service's per-format default today. The
	// path-traversal / null-byte variants are smoked to
	// pin the no-passthrough invariant on the unauth
	// branch (the gate fires before `searchParams` is
	// even parsed).
	'/api/admin/items/export?filename=custom.csv',
	'/api/admin/items/export?filename=../../etc/passwd',
	'/api/admin/items/export?filename=%00malicious',
	'/api/admin/items/export?filename=export.csv',

	// `?locale=` / `?lang=` — i18n keys. The export
	// service does not localise the data today.
	'/api/admin/items/export?locale=en',
	'/api/admin/items/export?locale=fr',
	'/api/admin/items/export?lang=de',

	// `?tenant=` / `?tenantId=` / `?org=` — multi-
	// tenancy keys. The export route is per-tenant
	// scoped today via the active session's tenant id.
	'/api/admin/items/export?tenant=acme',
	'/api/admin/items/export?tenantId=42',
	'/api/admin/items/export?org=ever-works',

	// `?fields=` / `?columns=` — field-projection keys
	// for a future contributor. The route returns the
	// full item column set today.
	'/api/admin/items/export?fields=id',
	'/api/admin/items/export?fields=id,name,description',
	'/api/admin/items/export?columns=name',

	// `?status=` / `?published=` / `?deleted=` — row-
	// filter keys for a future contributor. The route
	// returns every row today (no filter applied).
	'/api/admin/items/export?status=published',
	'/api/admin/items/export?status=draft',
	'/api/admin/items/export?published=true',
	'/api/admin/items/export?deleted=false',
	'/api/admin/items/export?includeDeleted=true',

	// `?from=` / `?to=` / `?since=` / `?until=` — time-
	// range filter keys.
	'/api/admin/items/export?from=2024-01-01',
	'/api/admin/items/export?to=2026-12-31',
	'/api/admin/items/export?since=2024-01-01T00:00:00Z',
	'/api/admin/items/export?until=2026-12-31T23:59:59Z',
	'/api/admin/items/export?from=invalid-date',

	// `?limit=` / `?page=` / `?offset=` — pagination
	// keys. The export route is unpaginated today
	// (returns the whole table in one stream).
	'/api/admin/items/export?limit=10',
	'/api/admin/items/export?limit=99999',
	'/api/admin/items/export?page=1',
	'/api/admin/items/export?offset=100',

	// `?refresh=` / `?force=` / `?cache=` — cache-busting
	// keys.
	'/api/admin/items/export?refresh=1',
	'/api/admin/items/export?fresh=true',
	'/api/admin/items/export?cache=bypass',
	'/api/admin/items/export?nocache=1',

	// `?metadata=` / `?includeMetadata=` —
	// metadata-toggle keys mirroring the
	// `#include-metadata` checkbox in the
	// `AdminDataExportPage` driver.
	'/api/admin/items/export?metadata=true',
	'/api/admin/items/export?metadata=false',
	'/api/admin/items/export?includeMetadata=true',
	'/api/admin/items/export?includeMetadata=false',

	// `?compress=` / `?gzip=` — compression-toggle keys.
	'/api/admin/items/export?compress=true',
	'/api/admin/items/export?gzip=1',

	// Repeated keys — `searchParams.get(name)` returns
	// the first value for every key the route reads.
	'/api/admin/items/export?format=csv&format=xlsx',
	'/api/admin/items/export?format=invalid&format=csv',
	'/api/admin/items/export?as=admin&as=user',
	'/api/admin/items/export?token=foo&token=bar',
	'/api/admin/items/export?bypass=1&bypass=0',

	// Bogus / typo'd query keys — the route reads one
	// documented key today, so any combination of unknown
	// keys is silently ignored on every branch.
	'/api/admin/items/export?unknown=value',
	'/api/admin/items/export?foo=bar&baz=qux',
	'/api/admin/items/export?userId=admin&token=foo&unknown=value&format=csv&foo=bar'
] as const;

test.describe('API: /api/admin/items/export query-param surface', () => {
	for (const path of ADMIN_ITEMS_EXPORT_QUERIES) {
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

	test('GET /api/admin/items/export returns a 401 on the unauth branch', async ({ request }) => {
		// The unauthenticated GET branch is the load-bearing
		// invariant: the admin gate must fire before any
		// `searchParams` parsing or service call. The status
		// must be exactly 401 (the route hard-codes the 401
		// status in the gate's `NextResponse.json` call).
		// The body must echo the canonical envelope —
		// regression-detection clients depend on the early-
		// return.
		const response = await request.get('/api/admin/items/export');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized. Admin access required.'
		});
	});

	test('GET /api/admin/items/export has a stable status across query permutations', async ({
		request
	}) => {
		// The route reads one documented query param today
		// after the gate, so the response status must be
		// invariant to any combination of known and unknown
		// keys. A regression that reads any query param
		// before the gate would surface here as a status
		// divergence between the no-arg baseline and the
		// parameterised variant.
		const baseline = await request.get('/api/admin/items/export');
		const parameterised = await request.get(
			'/api/admin/items/export?format=csv&userId=admin&token=anything&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
	});

	test('GET /api/admin/items/export?format=… does NOT bypass the admin gate', async ({
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
		const baseline = await request.get('/api/admin/items/export');
		const responses = await Promise.all([
			request.get('/api/admin/items/export?format=csv'),
			request.get('/api/admin/items/export?format=xlsx'),
			request.get('/api/admin/items/export?format='),
			request.get('/api/admin/items/export?format=invalid'),
			request.get('/api/admin/items/export?format=CSV'),
			request.get('/api/admin/items/export?format=XLSX'),
			request.get('/api/admin/items/export?format=json'),
			request.get('/api/admin/items/export?format=pdf')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export?userId=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The route does not read any impersonation key
		// today. A regression that adds one as a session-
		// fallback (e.g. `?asUser=…`) would change the unauth-
		// branch from "always 401" to "200 with the
		// requested user's items export" — the unauth branch
		// must be invariant to every impersonation key today.
		const baseline = await request.get('/api/admin/items/export');
		const responses = await Promise.all([
			request.get('/api/admin/items/export?userId=admin'),
			request.get('/api/admin/items/export?user_id=admin'),
			request.get('/api/admin/items/export?adminId=admin'),
			request.get('/api/admin/items/export?as=admin'),
			request.get('/api/admin/items/export?asUser=true'),
			request.get('/api/admin/items/export?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export?token=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The route does not read any magic-token / bypass
		// key today. A regression that adds magic-token-
		// based admin bypass would change the unauth-branch
		// behaviour — the smoke walk catches that as a
		// status divergence on the auth-branch.
		const baseline = await request.get('/api/admin/items/export');
		const responses = await Promise.all([
			request.get('/api/admin/items/export?token=anything'),
			request.get('/api/admin/items/export?secret=anything'),
			request.get('/api/admin/items/export?api_key=anything'),
			request.get('/api/admin/items/export?authorization=Bearer+anything'),
			request.get('/api/admin/items/export?session=anything'),
			request.get('/api/admin/items/export?adminToken=anything')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export?bypass=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The route does not read `?bypass=` / `?admin=` /
		// `?override=` today. The unauth-branch is invariant
		// to every admin-override key.
		const baseline = await request.get('/api/admin/items/export');
		const responses = await Promise.all([
			request.get('/api/admin/items/export?bypass=1'),
			request.get('/api/admin/items/export?admin=1'),
			request.get('/api/admin/items/export?admin=true'),
			request.get('/api/admin/items/export?override=true'),
			request.get('/api/admin/items/export?force=true')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export?filename=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The route hard-codes the filename in the
		// `Content-Disposition` header via the export-service
		// per-format default today. A regression that reads
		// `?filename=` before the gate would expose path-
		// traversal / null-byte attack vectors. The unauth-
		// branch must be invariant to every filename-override
		// key today.
		const baseline = await request.get('/api/admin/items/export');
		const responses = await Promise.all([
			request.get('/api/admin/items/export?filename=custom.csv'),
			request.get('/api/admin/items/export?filename=../../etc/passwd'),
			request.get('/api/admin/items/export?filename=%00malicious')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export?metadata=… does NOT bypass the admin gate', async ({
		request
	}) => {
		// The `#include-metadata` checkbox in the
		// `AdminDataExportPage` driver maps to a future
		// query key the route does not read today. The
		// unauth-branch is invariant to every metadata-
		// toggle key.
		const baseline = await request.get('/api/admin/items/export');
		const responses = await Promise.all([
			request.get('/api/admin/items/export?metadata=true'),
			request.get('/api/admin/items/export?metadata=false'),
			request.get('/api/admin/items/export?includeMetadata=true'),
			request.get('/api/admin/items/export?includeMetadata=false')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export does not branch on Accept header on the unauth path', async ({
		request
	}) => {
		// The route does not negotiate content-types on the
		// unauth branch — the gate fires before any
		// content-type negotiation. Every Accept header must
		// round-trip to the same 401.
		const baseline = await request.get('/api/admin/items/export');
		const responses = await Promise.all([
			request.get('/api/admin/items/export', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/admin/items/export', {
				headers: { Accept: 'text/csv' }
			}),
			request.get('/api/admin/items/export', {
				headers: {
					Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				}
			}),
			request.get('/api/admin/items/export', { headers: { Accept: '*/*' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('GET /api/admin/items/export does not branch on side-channel cookies / headers', async ({
		request
	}) => {
		// A regression that switches the gate to a custom
		// auth resolver that consults `request.cookies` /
		// `request.geo` / `request.ip` would change the
		// unauth-branch behaviour — the smoke envelope still
		// holds.
		const responses = await Promise.all([
			request.get('/api/admin/items/export', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get('/api/admin/items/export', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.get('/api/admin/items/export', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.get('/api/admin/items/export', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('GET /api/admin/items/export repeated query keys do not 5xx', async ({ request }) => {
		// The handler reads one documented key (`format`)
		// after the gate; `searchParams.get(name)` returns
		// the first value for repeated keys. The unauth-
		// branch is invariant to every repeated-key
		// permutation today.
		const baseline = await request.get('/api/admin/items/export');
		const responses = await Promise.all([
			request.get('/api/admin/items/export?format=csv&format=xlsx'),
			request.get('/api/admin/items/export?format=invalid&format=csv'),
			request.get('/api/admin/items/export?as=admin&as=user'),
			request.get('/api/admin/items/export?token=foo&token=bar'),
			request.get('/api/admin/items/export?bypass=1&bypass=0')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});
});
