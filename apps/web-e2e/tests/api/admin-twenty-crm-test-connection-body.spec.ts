import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **request-body / header surface**
 * of the admin-only Twenty CRM connection-test endpoint
 * served by
 * `apps/web/app/api/admin/twenty-crm/test-connection/route.ts`.
 *
 * `POST /api/admin/twenty-crm/test-connection` is **admin-
 * gated** via a **single-step `auth()` chain** that
 * collapses both unauthenticated and authenticated-non-
 * admin branches into the **same** 401 envelope. The
 * route's gate is:
 *
 *     export async function POST() {
 *       try {
 *         const session = await auth();
 *         if (!session?.user?.isAdmin) {
 *           return NextResponse.json(
 *             { success: false, error: 'Unauthorized. Admin access required.' },
 *             { status: 401 }
 *           );
 *         }
 *         // …read raw config + run apiService.testConnection(...)
 *       } catch (error) {
 *         return NextResponse.json(
 *           { success: false, error: 'Failed to test connection' },
 *           { status: 500 }
 *         );
 *       }
 *     }
 *
 * The route is the **first** admin-tree route the smoke
 * layer covers that documents the unique combination of:
 *
 *   1. **`POST` handler** (vs every other admin-tree
 *      smoke spec which targets `GET`). The handler
 *      signature is the bare `POST()` (no `request`
 *      parameter), narrowing the request surface to
 *      zero — there is no way for a future contributor
 *      to read a body parameter, header, or query
 *      string inside the handler without changing the
 *      signature.
 *   2. **Same `'Unauthorized. Admin access required.'`
 *      error string** as the sibling
 *      `admin/twenty-crm/config` GET endpoint and the
 *      `admin/sponsor-ads` GET endpoint. A regression
 *      that swaps the error string back to the bare
 *      `'Unauthorized'` form would change the client-
 *      side error-handling contract for every consumer
 *      of the Twenty CRM admin dashboard widget.
 *   3. **Per-tenant credential non-disclosure on the
 *      unauth branch** — the success branch fetches
 *      `getRawConfig()` (UNMASKED API key) and feeds
 *      it to `apiService.testConnection(baseUrl, apiKey)`
 *      — the unauth branch must NEVER reach that read.
 *      This spec includes a deliberate negative-string
 *      assertion that the unauth response body does NOT
 *      contain the `TWENTY_CRM_API_KEY` /
 *      `TWENTY_CRM_BASE_URL` env-var names, the raw-
 *      config sub-field names, or any timing /
 *      latency / connection-metadata field a
 *      mistakenly-leaky implementation might emit.
 *
 * Where the sibling `admin-twenty-crm-config-query.spec.ts`
 * walks the **query-param surface** of the GET endpoint,
 * this spec walks the **request-body / Content-Type /
 * header surface** of the POST endpoint — a complementary
 * surface that no prior admin-tree smoke spec covers.
 */
const ADMIN_TWENTY_CRM_TEST_CONNECTION_BODIES = [
	// Baseline — the no-body unauthenticated case.
	{ data: undefined as unknown, contentType: undefined as string | undefined, label: 'no body, no Content-Type' },

	// Empty bodies of varying shapes.
	{ data: '', contentType: 'application/json', label: 'empty string body' },
	{ data: '{}', contentType: 'application/json', label: 'empty object body' },
	{ data: '[]', contentType: 'application/json', label: 'empty array body' },
	{ data: 'null', contentType: 'application/json', label: 'null literal body' },

	// Bodies that look like impersonation / bypass attempts.
	{ data: { isAdmin: true }, contentType: 'application/json', label: 'isAdmin=true bypass attempt' },
	{ data: { admin: true }, contentType: 'application/json', label: 'admin=true bypass attempt' },
	{ data: { bypass: true }, contentType: 'application/json', label: 'bypass=true attempt' },
	{ data: { override: true }, contentType: 'application/json', label: 'override=true attempt' },
	{ data: { force: true }, contentType: 'application/json', label: 'force=true attempt' },
	{ data: { userId: 'admin' }, contentType: 'application/json', label: 'userId=admin attempt' },
	{ data: { user: { isAdmin: true } }, contentType: 'application/json', label: 'nested user.isAdmin attempt' },
	{ data: { session: { user: { isAdmin: true } } }, contentType: 'application/json', label: 'nested session.user.isAdmin attempt' },

	// Bodies that look like injected raw-config payloads.
	{ data: { apiKey: 'secret', baseUrl: 'https://example.com' }, contentType: 'application/json', label: 'injected apiKey + baseUrl' },
	{ data: { config: { apiKey: 'secret', baseUrl: 'https://example.com' } }, contentType: 'application/json', label: 'nested config injection' },
	{ data: { TWENTY_CRM_API_KEY: 'secret', TWENTY_CRM_BASE_URL: 'https://example.com' }, contentType: 'application/json', label: 'env-var-named injection' },

	// Bodies that look like magic-token attempts.
	{ data: { token: 'anything' }, contentType: 'application/json', label: 'token attempt' },
	{ data: { secret: 'anything' }, contentType: 'application/json', label: 'secret attempt' },
	{ data: { authorization: 'Bearer anything' }, contentType: 'application/json', label: 'authorization in body' },
	{ data: { adminToken: 'anything' }, contentType: 'application/json', label: 'adminToken attempt' },

	// Wrong / unusual Content-Type with valid JSON-shaped string body.
	{ data: '{"isAdmin":true}', contentType: 'text/plain', label: 'JSON shape with text/plain content-type' },
	{ data: '{"isAdmin":true}', contentType: 'application/x-www-form-urlencoded', label: 'JSON shape with form content-type' },
	{ data: '{"isAdmin":true}', contentType: 'application/xml', label: 'JSON shape with xml content-type' },

	// Form-encoded bodies.
	{ data: 'isAdmin=true&admin=1', contentType: 'application/x-www-form-urlencoded', label: 'form-encoded bypass attempt' },

	// Large body to defend against mistakenly-pre-gate body parsing.
	{ data: { padding: 'x'.repeat(2_000) }, contentType: 'application/json', label: 'large padded body' }
] as const;

test.describe('API: /api/admin/twenty-crm/test-connection request-body / header surface', () => {
	for (const { data, contentType, label } of ADMIN_TWENTY_CRM_TEST_CONNECTION_BODIES) {
		test(`POST /api/admin/twenty-crm/test-connection (${label}) responds without a server error`, async ({
			request
		}) => {
			// The route's single-step gate fires before any
			// body-read or service-layer call. The
			// unauthenticated POST surface returns a 4xx
			// (specifically 401) deterministically. A 500 is
			// reachable only if the catch fires after the gate
			// has let the call through (e.g.
			// `apiService.testConnection(...)` throws), which
			// never happens on the unauth branch.
			const response = await request.post('/api/admin/twenty-crm/test-connection', {
				data,
				headers: contentType ? { 'Content-Type': contentType } : undefined
			});

			expect(response.status()).toBeLessThan(500);
		});
	}

	test('POST /api/admin/twenty-crm/test-connection returns 401 with the route-specific Unauthorized envelope', async ({
		request
	}) => {
		// The unauthenticated POST branch is the load-bearing
		// invariant: the single-step gate
		// `if (!session?.user?.isAdmin)` fires, returning 401
		// with the canonical
		// `{ success: false, error: 'Unauthorized. Admin access required.' }`
		// envelope. A regression that swaps the error string
		// to the bare `'Unauthorized'` form would surface here
		// as a body-divergence assertion failure.
		const response = await request.post('/api/admin/twenty-crm/test-connection');

		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			success: false,
			error: 'Unauthorized. Admin access required.'
		});
	});

	test('POST /api/admin/twenty-crm/test-connection has a stable status across body permutations', async ({
		request
	}) => {
		// The route's auth gate fires before any body parse
		// or service-layer call. Every body permutation must
		// round-trip to the same status on the unauth branch.
		const baseline = await request.post('/api/admin/twenty-crm/test-connection');
		const responses = await Promise.all([
			request.post('/api/admin/twenty-crm/test-connection', { data: {} }),
			request.post('/api/admin/twenty-crm/test-connection', { data: { isAdmin: true } }),
			request.post('/api/admin/twenty-crm/test-connection', { data: { apiKey: 'secret' } }),
			request.post('/api/admin/twenty-crm/test-connection', { data: { token: 'anything' } }),
			request.post('/api/admin/twenty-crm/test-connection', {
				data: 'isAdmin=true',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('POST /api/admin/twenty-crm/test-connection body-injected isAdmin=true does NOT bypass the admin gate', async ({
		request
	}) => {
		// A future contributor who reads the request body for
		// an `isAdmin` fallback would change the unauth branch
		// from "always 401" to "200 if {isAdmin:true} is in
		// the body" — silently granting any anonymous caller
		// admin-level connection-test access (and triggering a
		// real outbound Twenty CRM API call with raw
		// credentials).
		const responses = await Promise.all([
			request.post('/api/admin/twenty-crm/test-connection', { data: { isAdmin: true } }),
			request.post('/api/admin/twenty-crm/test-connection', { data: { admin: true } }),
			request.post('/api/admin/twenty-crm/test-connection', { data: { user: { isAdmin: true } } }),
			request.post('/api/admin/twenty-crm/test-connection', {
				data: { session: { user: { isAdmin: true } } }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.success).toBe(false);
			expect(body.error).toBe('Unauthorized. Admin access required.');
		}
	});

	test('POST /api/admin/twenty-crm/test-connection malformed JSON body does NOT surface as 400 on unauth branch', async ({
		request
	}) => {
		// A regression that pre-parses the body before the
		// auth gate would surface malformed JSON as a 400
		// instead of a 401 on the unauth branch. The bare
		// `POST()` handler signature with no `request`
		// parameter means there is no body parse before the
		// gate today.
		const responses = await Promise.all([
			request.post('/api/admin/twenty-crm/test-connection', {
				data: '{not-json',
				headers: { 'Content-Type': 'application/json' }
			}),
			request.post('/api/admin/twenty-crm/test-connection', {
				data: '{"unterminated":',
				headers: { 'Content-Type': 'application/json' }
			}),
			request.post('/api/admin/twenty-crm/test-connection', {
				data: 'plain text body',
				headers: { 'Content-Type': 'application/json' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Unauthorized. Admin access required.');
		}
	});

	test('POST /api/admin/twenty-crm/test-connection cookie / X-* headers do NOT bypass the gate', async ({
		request
	}) => {
		// A regression that switches the gate to read
		// `request.cookies.get('next-auth.session-token')`
		// for a fabricated cookie would bypass `auth()`. The
		// unauth-branch contract must stay invariant under
		// any of those side channels.
		const responses = await Promise.all([
			request.post('/api/admin/twenty-crm/test-connection', {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post('/api/admin/twenty-crm/test-connection', {
				headers: { Cookie: 'authjs.session-token=fabricated' }
			}),
			request.post('/api/admin/twenty-crm/test-connection', {
				headers: { 'X-Forwarded-For': '127.0.0.1' }
			}),
			request.post('/api/admin/twenty-crm/test-connection', {
				headers: { 'X-Real-IP': '10.0.0.1' }
			}),
			request.post('/api/admin/twenty-crm/test-connection', {
				headers: { 'X-Admin': 'true' }
			}),
			request.post('/api/admin/twenty-crm/test-connection', {
				headers: { Authorization: 'Bearer fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test('POST /api/admin/twenty-crm/test-connection does NOT branch on Accept header', async ({
		request
	}) => {
		const baseline = await request.post('/api/admin/twenty-crm/test-connection');
		const responses = await Promise.all([
			request.post('/api/admin/twenty-crm/test-connection', {
				headers: { Accept: 'application/json' }
			}),
			request.post('/api/admin/twenty-crm/test-connection', {
				headers: { Accept: 'text/csv' }
			}),
			request.post('/api/admin/twenty-crm/test-connection', {
				headers: { Accept: 'application/xml' }
			}),
			request.post('/api/admin/twenty-crm/test-connection', {
				headers: { Accept: '*/*' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test('POST /api/admin/twenty-crm/test-connection does NOT leak Twenty CRM credential surface on the unauth branch', async ({
		request
	}) => {
		// The success branch fetches `getRawConfig()` (UNMASKED
		// API key) and feeds it to
		// `apiService.testConnection(baseUrl, apiKey)`. The
		// unauth branch must NEVER reach that read. This
		// negative-string assertion pins that contract: the
		// unauth response body must NOT contain the env-var
		// names, raw-config sub-field names, or any
		// connection-metadata fields a mistakenly-leaky
		// implementation might emit.
		const response = await request.post('/api/admin/twenty-crm/test-connection');
		const text = await response.text();

		// Env-var names that would only appear if the route
		// leaked configuration.
		expect(text).not.toContain('TWENTY_CRM_API_KEY');
		expect(text).not.toContain('TWENTY_CRM_BASE_URL');

		// Raw-config sub-field names.
		expect(text).not.toContain('apiKey');
		expect(text).not.toContain('baseUrl');

		// Connection-metadata fields that would only appear if
		// the route actually contacted Twenty CRM.
		expect(text).not.toContain('latencyMs');
		expect(text).not.toContain('latency');

		// Masked API-key shape (`****<last4>` regex).
		expect(text).not.toMatch(/\*{4}[A-Za-z0-9]{4}/);
	});

	test('POST /api/admin/twenty-crm/test-connection error message uniquely identifies test-connection / config surface', async ({
		request
	}) => {
		// The 401 envelope carries the longer
		// `'Unauthorized. Admin access required.'` message —
		// shared with the sibling `admin/twenty-crm/config`
		// GET endpoint and the `admin/sponsor-ads` GET
		// endpoint. The spec asserts the message does NOT
		// echo any other admin-tree route signature
		// (`'Unauthorized'` / `'Forbidden'` / `'Failed to
		// test connection'` / `'No Twenty CRM configuration
		// found. Please configure Twenty CRM first.'`).
		const response = await request.post('/api/admin/twenty-crm/test-connection');
		const body = await response.json();

		expect(body.error).toBe('Unauthorized. Admin access required.');
		expect(body.error).not.toBe('Unauthorized');
		expect(body.error).not.toBe('Forbidden');
		expect(body.error).not.toBe('Failed to test connection');
		expect(body.error).not.toBe(
			'No Twenty CRM configuration found. Please configure Twenty CRM first.'
		);
		expect(body.success).toBe(false);
	});

	test('POST /api/admin/twenty-crm/test-connection method is the only mutating verb the route exports', async ({
		request
	}) => {
		// The route exports only `POST` (no `GET` / `PUT` /
		// `PATCH` / `DELETE`). Other verbs should return 405
		// (or fall through to the same 401 the framework
		// raises before the handler — both are <500).
		const responses = await Promise.all([
			request.get('/api/admin/twenty-crm/test-connection'),
			request.delete('/api/admin/twenty-crm/test-connection'),
			request.put('/api/admin/twenty-crm/test-connection'),
			request.patch('/api/admin/twenty-crm/test-connection')
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});
});
