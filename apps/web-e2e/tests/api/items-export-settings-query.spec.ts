import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **query-param surface** of the
 * public items-export-settings endpoint served by
 * `apps/web/app/api/items/export/settings/route.ts`.
 *
 * `GET /api/items/export/settings` is intentionally
 * **public, zero-argument, side-effect-free**: the route
 * exposes a single boolean flag (`export_enabled`) that the
 * frontend reads to decide whether to render the export
 * affordances at all. The handler signature is the
 * **zero-argument** Next 16 form (the route does not take
 * a `NextRequest` argument and reads no `searchParams` at
 * all today):
 *
 *     export async function GET() {
 *       return NextResponse.json({
 *         export_enabled: getExportEnabled(),
 *       });
 *     }
 *
 * Because the handler signature is **zero-argument**, the
 * route reads zero query params today — every assertion
 * below pins that the response is deterministically 200 on
 * the public GET branch regardless of which keys the caller
 * appends to the URL, AND that the response body's shape is
 * the canonical single-key envelope
 * `{ export_enabled: boolean }`. A regression that switches
 * the signature to `GET(request: NextRequest)` and starts
 * reading `request.nextUrl.searchParams.get(...)` would not
 * change the public branch's status today (the response is
 * still 200), but a regression that branches on a query
 * param to gate the boolean (e.g. `?asUser=…` returning a
 * per-user override or `?tenant=…` returning a per-tenant
 * override) would silently change the response body — and
 * that change is exactly what this spec catches.
 *
 * The route's contract is the load-bearing invariant this
 * spec pins:
 *
 *   - **Public**: the route returns 200 with
 *     `{ export_enabled: <boolean> }` for every caller.
 *     No authentication is checked because the response
 *     body carries no PII (only the boolean feature flag).
 *   - **Single-key envelope**: the body has exactly one
 *     key today (`export_enabled`) and that key's value
 *     is a `boolean`. This shape is what the host app's
 *     export-button-rendering logic depends on.
 *   - **Parameter-invariance**: the body must be byte-
 *     identical across any query-string permutation
 *     today, because no key is read.
 *
 * Note: the related `apps/web/app/api/items/export/route.ts`
 * route (which actually performs the export) is documented
 * by the sibling [`items-export-query.spec.ts`](./items-export-query.spec.ts)
 * smoke spec — that route reads a `?format=csv|xlsx` query
 * param and gates on `getExportEnabled()` itself. This spec
 * documents the **public feature-flag boundary** that the
 * frontend reads to decide whether to surface the export UI
 * at all, not the export action itself.
 *
 * The shape mirrors the sibling
 * `apps/web/app/api/version/route.ts`,
 * `apps/web/app/api/health/route.ts`, and other zero-argument
 * public endpoints — but the items-export-settings route is
 * the **only** one whose response payload is a single-key
 * boolean feature-flag envelope today, making the
 * invariant-shape assertion doubly load-bearing because the
 * frontend's conditional-render logic reads the boolean
 * directly without a deeper schema validation step.
 */
const ITEMS_EXPORT_SETTINGS_QUERIES = [
	// Baseline — the no-arg public case. Included so a
	// future reader of this file sees the canonical case
	// alongside the variants it parametrises.
	'/api/items/export/settings',

	// `?format=` / `?type=` — keys that the **adjacent**
	// `/api/items/export` route does read. The settings
	// route does not read them today; appending them must
	// not change the response.
	'/api/items/export/settings?format=csv',
	'/api/items/export/settings?format=xlsx',
	'/api/items/export/settings?format=json',
	'/api/items/export/settings?type=approved',
	'/api/items/export/settings?type=pending',

	// `?userId=` / `?asUser=` / `?impersonate=` — keys that
	// a future "per-user feature-flag override" might add.
	// The route returns the host-wide flag today.
	'/api/items/export/settings?userId=anyone',
	'/api/items/export/settings?asUser=admin',
	'/api/items/export/settings?impersonate=admin',

	// `?tenant=` / `?tenantId=` / `?org=` — keys that a
	// future "per-tenant feature-flag override" might add.
	// The route returns a single host-wide flag today.
	'/api/items/export/settings?tenant=acme',
	'/api/items/export/settings?tenantId=42',
	'/api/items/export/settings?org=ever-works',

	// `?token=` / `?secret=` / `?api_key=` — the obvious
	// "I have a magic auth token" keys. The route does not
	// authenticate at all today; appending these keys must
	// not change the response.
	'/api/items/export/settings?token=anything',
	'/api/items/export/settings?secret=anything',
	'/api/items/export/settings?api_key=anything',

	// `?refresh=` / `?force=` / `?fresh=` / `?cache=` —
	// the obvious cache-busting keys. The handler does
	// not branch on any cache-control query param today.
	'/api/items/export/settings?refresh=1',
	'/api/items/export/settings?force=true',
	'/api/items/export/settings?fresh=true',
	'/api/items/export/settings?cache=bypass',
	'/api/items/export/settings?nocache=1',

	// `?locale=` / `?lang=` — i18n keys. The route returns
	// a language-agnostic boolean today.
	'/api/items/export/settings?locale=en',
	'/api/items/export/settings?locale=fr',
	'/api/items/export/settings?lang=de',

	// `?fields=` / `?select=` / `?include=` — the obvious
	// "only-give-me-these-columns" keys. The route returns
	// the full single-key payload today.
	'/api/items/export/settings?fields=export_enabled',
	'/api/items/export/settings?select=export_enabled',
	'/api/items/export/settings?include=export_enabled',

	// `?env=` / `?stage=` — the obvious environment-override
	// keys. The route reads from `getExportEnabled()` which
	// is anchored on the host app's `config.yml` today.
	'/api/items/export/settings?env=production',
	'/api/items/export/settings?env=staging',
	'/api/items/export/settings?stage=preview',

	// Empty values — `searchParams.get(key)` on `?key=`
	// returns `''`. The route reads zero keys, so empty
	// values must round-trip to the same response as the
	// no-arg case.
	'/api/items/export/settings?format=',
	'/api/items/export/settings?token=',
	'/api/items/export/settings?tenant=',

	// Repeated keys — `searchParams.get(name)` returns the
	// first value, but the route reads zero keys, so
	// repetition is irrelevant.
	'/api/items/export/settings?format=csv&format=xlsx',
	'/api/items/export/settings?token=foo&token=bar',

	// Special-character values that would tempt a future
	// regex match, LIKE-prefix, or path-injection wiring.
	// The route does not pass any value into a SQL or
	// filesystem path today.
	'/api/items/export/settings?token=%3Cscript%3E',
	"/api/items/export/settings?token=%27%20OR%201%3D1",
	'/api/items/export/settings?token=%2F..%2F..%2Fetc%2Fpasswd',

	// Long values — guard against any future regex /
	// regex-based indexing bug that might trip on long
	// inputs. The route reads zero keys today.
	`/api/items/export/settings?token=${'x'.repeat(500)}`,
	`/api/items/export/settings?fields=${'y'.repeat(500)}`,

	// Bogus / typo'd query keys — the route reads zero
	// query keys today, so any combination of unknown
	// keys is silently ignored on every branch.
	'/api/items/export/settings?unknown=value',
	'/api/items/export/settings?foo=bar&baz=qux',
	'/api/items/export/settings?format=csv&token=foo&unknown=value&tenant=acme&fields=export_enabled&foo=bar'
] as const;

test.describe('API: /api/items/export/settings query-param surface', () => {
	for (const path of ITEMS_EXPORT_SETTINGS_QUERIES) {
		test(`GET ${path} responds with 200 and a stable envelope`, async ({ request }) => {
			const response = await request.get(path);

			// The route is unconditionally public today, so
			// every parameterised request must land on the same
			// 200 / `{ export_enabled: <boolean> }` envelope.
			expect(response.status()).toBe(200);

			const body = (await response.json()) as {
				export_enabled?: unknown;
			};

			expect(typeof body.export_enabled).toBe('boolean');
		});
	}

	test(`GET /api/items/export/settings returns the canonical { export_enabled: boolean } single-key envelope`, async ({
		request
	}) => {
		// The single-key envelope is the load-bearing contract:
		// the frontend's export-button-rendering logic reads
		// `body.export_enabled` directly. Any change to the
		// envelope shape (rename to `enabled`, wrap in
		// `{ success: true, data: {...} }`, add a sibling
		// `export_format` key, etc.) would silently break the
		// host app's UI even though every other smoke spec
		// would still pass.
		const response = await request.get('/api/items/export/settings');

		expect(response.status()).toBe(200);

		const body = (await response.json()) as Record<string, unknown>;

		// The body has exactly one key today.
		expect(Object.keys(body)).toEqual(['export_enabled']);
		expect(typeof body.export_enabled).toBe('boolean');
	});

	test(`GET /api/items/export/settings is byte-identical with and without bogus query parameters`, async ({
		request
	}) => {
		// The route reads zero query params today, so the
		// response body must be byte-identical to any
		// combination of unknown keys. This invariant is
		// stronger than a status-only assertion — it catches a
		// regression that branches on a query param to gate
		// the boolean (e.g. `?asUser=admin` returning a
		// per-user override).
		const baseline = await request.get('/api/items/export/settings');
		const parameterised = await request.get(
			'/api/items/export/settings?format=csv&token=anything&tenant=acme&unknown=value'
		);

		expect(parameterised.status()).toBe(baseline.status());
		expect(parameterised.status()).toBe(200);

		const baselineBody = await baseline.text();
		const parameterisedBody = await parameterised.text();
		expect(parameterisedBody).toBe(baselineBody);
	});

	test(`GET /api/items/export/settings?token=… does NOT introduce a query-token override`, async ({
		request
	}) => {
		// The route is unconditionally public today and does
		// not authenticate. A regression that wires
		// `searchParams.get('token')` as a per-user override
		// for `getExportEnabled()` would change the body
		// shape on the per-token branch. This assertion pins
		// the "feature flag is read from `config.yml`, never
		// from the query string" invariant.
		const baseline = await request.get('/api/items/export/settings');
		const baselineBody = await baseline.text();

		const responses = await Promise.all([
			request.get('/api/items/export/settings?token=anything'),
			request.get('/api/items/export/settings?secret=anything'),
			request.get('/api/items/export/settings?api_key=anything'),
			request.get('/api/items/export/settings?asUser=admin'),
			request.get('/api/items/export/settings?impersonate=admin')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);
			expect(await response.text()).toBe(baselineBody);
		}
	});

	test(`GET /api/items/export/settings?tenant=… does NOT introduce a per-tenant override`, async ({
		request
	}) => {
		// The route returns a single host-wide flag today
		// from `getExportEnabled()` (which reads
		// `config.yml`). A regression that wires
		// `searchParams.get('tenant')` as a per-tenant
		// override would change the body on the per-tenant
		// branch. The unauth body must be invariant to the
		// tenant-scope keys.
		const baseline = await request.get('/api/items/export/settings');
		const baselineBody = await baseline.text();

		const responses = await Promise.all([
			request.get('/api/items/export/settings?tenant=acme'),
			request.get('/api/items/export/settings?tenantId=42'),
			request.get('/api/items/export/settings?org=ever-works'),
			request.get('/api/items/export/settings?env=production'),
			request.get('/api/items/export/settings?env=staging')
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);
			expect(await response.text()).toBe(baselineBody);
		}
	});

	test(`GET /api/items/export/settings keeps the response shape stable across param permutations`, async ({
		request
	}) => {
		// Three different parameter sets, all of which must
		// round-trip to the canonical 200 / single-key envelope
		// today. The shape guarantees the route's body is
		// invariant to the query string.
		const responses = await Promise.all([
			request.get('/api/items/export/settings'),
			request.get(
				'/api/items/export/settings?format=csv&tenant=acme&fields=export_enabled&token=foo'
			),
			request.get(
				'/api/items/export/settings?format=invalid&token=anything&unknown=bar'
			)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);

			const body = (await response.json()) as Record<string, unknown>;
			expect(Object.keys(body)).toEqual(['export_enabled']);
			expect(typeof body.export_enabled).toBe('boolean');
		}
	});

	test(`GET /api/items/export/settings does NOT branch on Accept header`, async ({
		request
	}) => {
		// The route does not negotiate content-types today;
		// every Accept header must round-trip to JSON. A
		// regression that adds `?format=xml` content
		// negotiation to the settings route (mirroring the
		// `/api/items/export` route's actual `?format=` key)
		// would change the body type on the per-Accept branch.
		const responses = await Promise.all([
			request.get('/api/items/export/settings', {
				headers: { Accept: 'application/json' }
			}),
			request.get('/api/items/export/settings', {
				headers: { Accept: 'application/xml' }
			}),
			request.get('/api/items/export/settings', {
				headers: { Accept: 'text/html' }
			}),
			request.get('/api/items/export/settings', {
				headers: { Accept: '*/*' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(200);
			expect(response.headers()['content-type']).toContain('application/json');

			const body = (await response.json()) as Record<string, unknown>;
			expect(typeof body.export_enabled).toBe('boolean');
		}
	});
});
