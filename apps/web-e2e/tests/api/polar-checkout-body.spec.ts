import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Polar checkout-session creation endpoint
 * served by the `POST` export of
 * `apps/web/app/api/polar/checkout/route.ts`.
 *
 * `POST /api/polar/checkout` is the **second per-
 * source-file POST smoke for an auth-gated payment-
 * provider checkout endpoint** the docs tree
 * publishes (after
 * [`solidgate-checkout-body-spec.md`](solidgate-checkout-body-spec.md)).
 * The existing multi-provider
 * [`payment-checkouts.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/payment-checkouts.spec.ts)
 * covers all four providers' checkout endpoints with
 * a single `< 500` assertion each; this spec drills
 * into the Polar handler specifically.
 *
 * Distinct from the solidgate-checkout sibling:
 *
 *   - **Branching mode dispatch** — the handler
 *     branches on `mode === 'subscription'` (default,
 *     calls `polarProvider.createSubscription(...)`)
 *     vs `mode === 'one_time'` (calls private
 *     `polar.checkouts.create(...)` via `(polar
 *     Provider as any).polar`). The FIRST per-
 *     source-file POST smoke that pins a mode-
 *     dispatched two-branch POST contract.
 *   - **NO Zod validation** — distinct from solidgate
 *     which uses `checkoutSchema.safeParse(json)`;
 *     polar uses simple `if (!productId)` check.
 *   - **NO try/catch around `request.json()`** —
 *     malformed JSON cascades to the OUTER catch.
 *     Distinct from solidgate's per-call try/catch.
 *   - **503 error-message detection** — outer catch
 *     scans `error.message` for three strings
 *     (`'Payments are currently unavailable'`,
 *     `'needs to complete their payment setup'`,
 *     `'payment setup incomplete'`) and downgrades
 *     500 → 503 with a custom payment-setup-
 *     incomplete message. The FIRST per-source-file
 *     POST smoke that pins a 503-via-error-message-
 *     scan contract.
 *   - **Private property access via `as any`** —
 *     the `'one_time'` branch reaches into
 *     `(polarProvider as any).polar` and
 *     `.organizationId`, calling `polar.checkouts.
 *     create(...)` directly. The FIRST per-source-
 *     file POST smoke that pins a private-property-
 *     bypass contract — a regression that re-orders
 *     this access before the auth gate would surface
 *     the private-helper internals.
 *   - **GET export companion** — the route exports
 *     `GET` for retrieve-checkout-by-id. The unauth
 *     GET branch returns 401 `{ error:
 *     'Unauthorized' }` (ONE-key, NOT TWO-key like
 *     POST). Distinct from solidgate-checkout which
 *     is POST-only.
 *
 *   1. **`auth()` session lookup** — load-bearing
 *      first gate. Missing → 401 `{ error:
 *      'Unauthorized', message: 'Authentication
 *      required' }` (TWO-key envelope).
 *   2. **`getOrCreatePolarProvider()` singleton
 *      initialization** — happens AFTER the auth
 *      gate, so the unauth branch never initializes
 *      the provider.
 *   3. **JSON body parse via destructured `await
 *      request.json()`** AFTER the auth gate — NO
 *      per-call try/catch.
 *   4. **`productId` required check** — `if
 *      (!productId)` → 400 `{ error: 'Invalid
 *      request', message: 'Product ID is required' }`.
 *   5. **`polarProvider.getCustomerId(session.user)`
 *      lookup** — failure → 400 `{ error: 'Failed
 *      to create customer', message: 'Unable to
 *      create Polar customer' }`.
 *   6. **Mode dispatch:**
 *        - `mode === 'subscription'` (default):
 *          sanitize metadata + call
 *          `polarProvider.createSubscription(...)`
 *          + 500 `{ error: 'Failed to create
 *          checkout', message: 'Checkout URL not
 *          available' }` if no URL.
 *        - `mode === 'one_time'`: access private
 *          `polar` + `organizationId` via
 *          `(polarProvider as any)`, sanitize
 *          metadata, call `polar.checkouts.
 *          create(...)`, fail-fast on missing URL.
 *   7. **Success payload** — both branches return
 *      `{ data: { id, url }, status: 200, message:
 *      'Checkout session created successfully' }`
 *      (literal `status: 200` field).
 *   8. **Outer catch** — scans `error.message` for
 *      payment-setup-incomplete strings → 503;
 *      otherwise `safeErrorResponse(error, 'Failed
 *      to create checkout session')` → 500.
 *   9. **Method-resolution surface** — the route
 *      exports `GET` and `POST`. `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const POLAR_CHECKOUT_PATH = '/api/polar/checkout';

const POLAR_CHECKOUT_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { 'X-Polar-Token': 'anything' }, label: 'fabricated X-Polar-Token header' }
] as const;

const POLAR_CHECKOUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (productId) if reachable)' },

	// Required-field probes.
	{ data: { mode: 'subscription' }, label: 'no productId field' },
	{ data: { successUrl: 'https://x.com', cancelUrl: 'https://x.com' }, label: 'no productId or mode' },

	// Valid-shape probes for both mode branches.
	{
		data: {
			productId: 'prod_test',
			successUrl: 'https://example.com/success',
			cancelUrl: 'https://example.com/cancel'
		},
		label: 'valid subscription default'
	},
	{
		data: {
			productId: 'prod_test',
			mode: 'subscription',
			successUrl: 'https://example.com/success',
			cancelUrl: 'https://example.com/cancel',
			metadata: { planId: 'pro', planName: 'Pro Plan' }
		},
		label: 'valid subscription with metadata'
	},
	{
		data: {
			productId: 'prod_test',
			mode: 'one_time',
			successUrl: 'https://example.com/success',
			cancelUrl: 'https://example.com/cancel'
		},
		label: 'valid one_time mode'
	},

	// Mode-dispatch probes.
	{ data: { productId: 'prod_x', mode: 'invalid' }, label: 'invalid mode (falls into one_time branch)' },
	{ data: { productId: 'prod_x', mode: 'SUBSCRIPTION' }, label: 'wrong-case mode (falls into one_time branch)' },

	// Bypass attempts.
	{
		data: {
			productId: 'prod_x',
			successUrl: 'https://x.com',
			cancelUrl: 'https://x.com',
			isAdmin: true
		},
		label: 'isAdmin=true bypass attempt'
	},
	{
		data: {
			productId: 'prod_x',
			successUrl: 'https://x.com',
			cancelUrl: 'https://x.com',
			userId: 'fabricated'
		},
		label: 'fabricated userId bypass attempt'
	},
	{
		data: {
			productId: 'prod_x',
			successUrl: 'javascript:alert(1)',
			cancelUrl: 'https://x.com'
		},
		label: 'javascript: scheme successUrl bypass attempt'
	},
	{
		data: {
			productId: 'X'.repeat(2_000),
			successUrl: 'https://x.com',
			cancelUrl: 'https://x.com'
		},
		label: 'large padded productId'
	}
] as const;

const ALLOWED_PRE_DELIVERY_ERRORS = [
	'Unauthorized',
	'Invalid request',
	'Failed to create customer',
	'Failed to create checkout',
	'Configuration error',
	'Failed to create checkout session'
] as const;

test.describe('API: /api/polar/checkout POST body / header surface', () => {
	for (const { headers, label } of POLAR_CHECKOUT_HEADERS) {
		test(`POST ${POLAR_CHECKOUT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(POLAR_CHECKOUT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of POLAR_CHECKOUT_BODIES) {
		test(`POST ${POLAR_CHECKOUT_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(POLAR_CHECKOUT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${POLAR_CHECKOUT_PATH} returns 401 with the two-key Unauthorized envelope`, async ({ request }) => {
		// The unauthenticated POST branch is the load-
		// bearing invariant: `!session?.user` fires
		// returning 401 with the TWO-key envelope.
		const response = await request.post(POLAR_CHECKOUT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized', message: 'Authentication required' });
	});

	test(`POST ${POLAR_CHECKOUT_PATH} envelope shape has exactly error and message keys`, async ({ request }) => {
		// Strict envelope-shape assertion: the TWO-key
		// envelope is `{ error: 'Unauthorized',
		// message: 'Authentication required' }`.
		const response = await request.post(POLAR_CHECKOUT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'message']);
		expect(body.success).toBeUndefined();
	});

	test(`POST ${POLAR_CHECKOUT_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branches return `{ data: { id, url },
		// status: 200, message: '...' }`. The unauth
		// branch must NEVER reach the createSubscription
		// or polar.checkouts.create calls.
		const response = await request.post(POLAR_CHECKOUT_PATH, {
			data: {
				productId: 'prod_test',
				successUrl: 'https://example.com/s',
				cancelUrl: 'https://example.com/c'
			}
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.status).not.toBe(200);
	});

	test(`POST ${POLAR_CHECKOUT_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(POLAR_CHECKOUT_PATH),
			request.post(POLAR_CHECKOUT_PATH, { data: {} }),
			request.post(POLAR_CHECKOUT_PATH, { data: { productId: 'prod_x' } }),
			request.post(POLAR_CHECKOUT_PATH, { data: { productId: 'prod_x', mode: 'one_time' } })
		]);

		const FORBIDDEN_POST_AUTH_MESSAGES = [
			'Product ID is required',
			'Unable to create Polar customer',
			'Checkout URL not available',
			'Polar provider not properly configured',
			'Checkout session created successfully',
			'Polar payment setup incomplete'
		];

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${POLAR_CHECKOUT_PATH} every error message comes from the allowed list`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(POLAR_CHECKOUT_PATH),
			request.post(POLAR_CHECKOUT_PATH, { data: {} }),
			request.post(POLAR_CHECKOUT_PATH, { data: { productId: 'prod_x' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(typeof body.error).toBe('string');
			expect(ALLOWED_PRE_DELIVERY_ERRORS).toContain(body.error);
		}
	});

	test(`POST ${POLAR_CHECKOUT_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(POLAR_CHECKOUT_PATH);
		const responses = await Promise.all([
			request.post(POLAR_CHECKOUT_PATH, { data: {} }),
			request.post(POLAR_CHECKOUT_PATH, {
				data: { productId: 'prod_x', successUrl: 'https://x.com', cancelUrl: 'https://x.com' }
			}),
			request.post(POLAR_CHECKOUT_PATH, {
				data: { productId: 'prod_x', mode: 'one_time' }
			}),
			request.post(POLAR_CHECKOUT_PATH, {
				data: { productId: 'prod_x', isAdmin: true }
			}),
			request.post(POLAR_CHECKOUT_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(POLAR_CHECKOUT_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${POLAR_CHECKOUT_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(POLAR_CHECKOUT_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(POLAR_CHECKOUT_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(POLAR_CHECKOUT_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(POLAR_CHECKOUT_PATH, { headers: { 'X-Polar-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${POLAR_CHECKOUT_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		// The route exports GET + POST. PUT / PATCH /
		// DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.put(POLAR_CHECKOUT_PATH),
			request.patch(POLAR_CHECKOUT_PATH),
			request.delete(POLAR_CHECKOUT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${POLAR_CHECKOUT_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// Polar checkout has NO try/catch around
		// request.json() inside the try block. Malformed
		// JSON on the auth branch would cascade to the
		// outer 500 catch. The unauth branch fires
		// BEFORE request.json(), so malformed bodies
		// must still produce the canonical 401.
		const responses = await Promise.all([
			request.post(POLAR_CHECKOUT_PATH, { data: 'not-json' }),
			request.post(POLAR_CHECKOUT_PATH, { data: '{ broken: json' }),
			request.post(POLAR_CHECKOUT_PATH, { data: '{"productId":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${POLAR_CHECKOUT_PATH} productId required-check is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, missing productId surfaces
		// 'Product ID is required'. The unauth branch
		// must NEVER emit this 400 message.
		const responses = await Promise.all([
			request.post(POLAR_CHECKOUT_PATH, { data: {} }),
			request.post(POLAR_CHECKOUT_PATH, { data: { mode: 'subscription' } }),
			request.post(POLAR_CHECKOUT_PATH, {
				data: { successUrl: 'https://x.com', cancelUrl: 'https://x.com' }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Invalid request');
			expect(body.message).not.toBe('Product ID is required');
		}
	});

	test(`POST ${POLAR_CHECKOUT_PATH} mode-dispatch (subscription / one_time) is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Both mode branches return success payloads
		// with `data.url`. The unauth branch must NEVER
		// reach the createSubscription or
		// polar.checkouts.create calls — the response
		// must NEVER echo a `data.url` or `data.id`.
		const responses = await Promise.all([
			request.post(POLAR_CHECKOUT_PATH, {
				data: {
					productId: 'prod_x',
					mode: 'subscription',
					successUrl: 'https://x.com',
					cancelUrl: 'https://x.com'
				}
			}),
			request.post(POLAR_CHECKOUT_PATH, {
				data: {
					productId: 'prod_x',
					mode: 'one_time',
					successUrl: 'https://x.com',
					cancelUrl: 'https://x.com'
				}
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.status).not.toBe(200);
			expect(body.message).not.toBe('Checkout session created successfully');
		}
	});

	test(`POST ${POLAR_CHECKOUT_PATH} 503 payment-setup-incomplete branch is NOT triggered on the unauth branch`, async ({
		request
	}) => {
		// The outer catch scans error.message for three
		// payment-setup-incomplete strings and downgrades
		// 500 → 503. The unauth branch must NEVER
		// produce a 503 response.
		const responses = await Promise.all([
			request.post(POLAR_CHECKOUT_PATH),
			request.post(POLAR_CHECKOUT_PATH, { data: { productId: 'prod_x' } }),
			request.post(POLAR_CHECKOUT_PATH, { data: { productId: 'prod_x', mode: 'one_time' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			// The dynamic 503 message must NOT appear.
			expect(typeof body.message).toBe('string');
			expect(body.message).not.toContain('Polar payment setup incomplete');
		}
	});

	test(`POST ${POLAR_CHECKOUT_PATH} caller-supplied successUrl / cancelUrl values are NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-ordered metadata
		// processing before the auth gate would surface
		// here: caller-supplied URLs (potentially
		// XSS-shaped) would appear in the response.
		const response = await request.post(POLAR_CHECKOUT_PATH, {
			data: {
				productId: 'prod_x',
				successUrl: 'javascript:alert(1)',
				cancelUrl: 'https://attacker.example.com/redirect'
			}
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('javascript:alert');
		expect(serialized).not.toContain('attacker.example.com');
	});
});
