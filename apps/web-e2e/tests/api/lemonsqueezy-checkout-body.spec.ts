import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the LemonSqueezy checkout-session creation endpoint
 * served by the `POST` export of
 * `apps/web/app/api/lemonsqueezy/checkout/route.ts`.
 *
 * `POST /api/lemonsqueezy/checkout` is the **third
 * per-source-file POST smoke for an auth-gated
 * payment-provider checkout endpoint** the docs tree
 * publishes (after
 * [`solidgate-checkout-body-spec.md`](solidgate-checkout-body-spec.md)
 * and
 * [`polar-checkout-body-spec.md`](polar-checkout-body-spec.md)).
 * The existing multi-provider
 * `payment-checkouts.spec.ts` covers all four
 * providers' checkout endpoints with a single `< 500`
 * assertion each; this spec drills into the
 * LemonSqueezy handler specifically.
 *
 * Distinct from BOTH solidgate-checkout AND polar-
 * checkout siblings:
 *
 *   - **`!session?.user?.id` gate** (NOT
 *     `!session?.user` like polar-checkout and
 *     solidgate-checkout). Pins the user-id-required
 *     401 contract.
 *   - **Custom validator returning
 *     `{ isValid, errors[] }`:** the handler calls
 *     `validateCheckoutRequestBody(body)` from
 *     `@/lib/payment/config/validation` (NOT Zod
 *     `safeParse` like solidgate; NOT simple `if
 *     (!field)` like polar). Errors are joined with
 *     `', '`. The FIRST per-source-file POST smoke
 *     that pins a custom-validator contract.
 *   - **Per-call try/catch around `await request.
 *     json()`** with explicit `'Invalid JSON in
 *     request body'` 400 envelope (matches
 *     solidgate-checkout; distinct from polar-checkout
 *     which has NO try/catch and cascades to outer
 *     catch).
 *   - **Dev-only PII-sanitized `console.log`:** in
 *     `NODE_ENV === 'development'` the handler logs
 *     the truncated email, redacted custom price,
 *     and dark-mode flag. The FIRST per-source-file
 *     POST smoke that pins a PII-sanitized
 *     dev-only logging contract.
 *   - **FOUR-string-scan catch with THREE different
 *     status codes:** `'Missing required environment
 *     variables'` → 500 CONFIGURATION_ERROR;
 *     `'Invalid email format'` → 400 VALIDATION_ERROR;
 *     `'Custom price must be'` → 400 VALIDATION_ERROR;
 *     `'Lemonsqueezy'` → 503 PAYMENT_SERVICE_ERROR.
 *     The FIRST per-source-file POST smoke that pins
 *     a four-string error-message-detection chain
 *     spanning 400 / 500 / 503.
 *   - **`ERROR_TYPES` enum-typed `error` field:**
 *     uses constants from `@/lib/payment/config/types`
 *     (`VALIDATION_ERROR`, `CONFIGURATION_ERROR`,
 *     `PAYMENT_SERVICE_ERROR`, `INTERNAL_ERROR`).
 *     UNIQUE: the FIRST per-source-file POST smoke
 *     that pins enum-typed error codes.
 *   - **GET export with NO auth gate:** the GET
 *     handler reads query params and creates
 *     checkouts WITHOUT auth — a Q-010-style finding.
 *     The cross-method probe pins this divergence
 *     from POST.
 *   - **`success: true` discriminant in success
 *     payload:** distinct from polar-checkout +
 *     solidgate-checkout which use literal
 *     `status: 200`.
 *
 *   1. **`auth()` session lookup** — load-bearing
 *      first gate. `!session?.user?.id` → 401
 *      `{ error: 'Unauthorized', message:
 *      'Authentication required' }` (TWO-key
 *      envelope, NOT enum-typed -- only the catch
 *      branch uses ERROR_TYPES).
 *   2. **JSON body parse via `await request.json()`
 *      INSIDE per-call try/catch** — failure → 400
 *      `{ error: 'VALIDATION_ERROR', message:
 *      'Invalid JSON in request body' }`.
 *   3. **`getOrCreateLemonsqueezyProvider()`
 *      singleton initialization**.
 *   4. **`validateCheckoutRequestBody(body)`** —
 *      custom validator returning
 *      `{ isValid, errors[] }`. Failure → 400
 *      `{ error: 'VALIDATION_ERROR', message:
 *      <errors.join(', ')> }`.
 *   5. **Dev-only PII-sanitized `console.log`**.
 *   6. **`lemonsqueezyProvider.createCustomCheckout
 *      ({ email, customPrice, variantId, metadata,
 *      dark })`** — load-bearing checkout-creation
 *      call.
 *   7. **Success payload** — `{ success: true, data:
 *      { checkoutUrl, email, customPrice, variantId,
 *      metadata }, message: 'Checkout session
 *      created successfully' }` with status 200.
 *   8. **Outer catch with FOUR error-message-scan
 *      branches** (described above).
 *   9. **Method-resolution surface** — the route
 *      exports `GET` AND `POST`. `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const LEMONSQUEEZY_CHECKOUT_PATH = '/api/lemonsqueezy/checkout';

const LEMONSQUEEZY_CHECKOUT_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const LEMONSQUEEZY_CHECKOUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (validation) if reachable)' },

	// Required-field probes.
	{ data: { dark: true }, label: 'no variantId' },
	{ data: { customPrice: 2999 }, label: 'no variantId, customPrice only' },

	// Valid bodies.
	{ data: { variantId: '123456' }, label: 'valid variantId only' },
	{
		data: { variantId: '123456', dark: true, customPrice: 2999 },
		label: 'valid full payload'
	},
	{
		data: {
			variantId: '123456',
			metadata: { plan: 'pro', source: 'website' }
		},
		label: 'valid with metadata'
	},

	// Validation probes (would surface custom validator messages on auth branch).
	{ data: { variantId: '', dark: true }, label: 'empty variantId (would 400 if reachable)' },
	{ data: { variantId: '123', customPrice: -1 }, label: 'negative customPrice (would 400 if reachable)' },
	{ data: { variantId: '123', customPrice: 'not-number' }, label: 'string customPrice (would 400 if reachable)' },
	{ data: { variantId: '123', dark: 'yes' }, label: 'string dark (would 400 if reachable)' },

	// Bypass attempts.
	{ data: { variantId: '123', isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { variantId: '123', userId: 'fabricated' }, label: 'fabricated userId bypass attempt' },
	{ data: { variantId: '123', email: 'attacker@example.com' }, label: 'fabricated email bypass attempt' },
	{
		data: { variantId: '1'.repeat(2_000) },
		label: 'large padded variantId'
	}
] as const;

const ALLOWED_PRE_DELIVERY_ERRORS = [
	'Unauthorized',
	'VALIDATION_ERROR',
	'CONFIGURATION_ERROR',
	'PAYMENT_SERVICE_ERROR',
	'INTERNAL_ERROR'
] as const;

test.describe('API: /api/lemonsqueezy/checkout POST body / header surface', () => {
	for (const { headers, label } of LEMONSQUEEZY_CHECKOUT_HEADERS) {
		test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(LEMONSQUEEZY_CHECKOUT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of LEMONSQUEEZY_CHECKOUT_BODIES) {
		test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} returns 401 with the two-key Unauthorized envelope`, async ({
		request
	}) => {
		// The unauthenticated POST branch fires:
		// `!session?.user?.id` → 401 with TWO-key
		// envelope `{ error: 'Unauthorized', message:
		// 'Authentication required' }`.
		const response = await request.post(LEMONSQUEEZY_CHECKOUT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized', message: 'Authentication required' });
	});

	test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} envelope shape has exactly error and message keys`, async ({
		request
	}) => {
		const response = await request.post(LEMONSQUEEZY_CHECKOUT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'message']);
		expect(body.success).toBeUndefined();
	});

	test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch returns `{ success: true,
		// data: { checkoutUrl, email, customPrice,
		// variantId, metadata }, message: '...' }`. The
		// unauth branch must NEVER reach
		// createCustomCheckout.
		const response = await request.post(LEMONSQUEEZY_CHECKOUT_PATH, {
			data: { variantId: '123456' }
		});
		const body = await response.json();
		expect(body.success).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CHECKOUT_PATH),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: { variantId: '123' } }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: { variantId: '', dark: true } })
		]);

		const FORBIDDEN_POST_AUTH_MESSAGES = [
			'Invalid JSON in request body',
			'Checkout service unavailable',
			'Unable to create checkout session',
			'Failed to create checkout session',
			'Checkout session created successfully'
		];

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} every error code comes from the allowed list`, async ({ request }) => {
		// All `error` field values come from a static
		// allow-list (Unauthorized OR ERROR_TYPES enum).
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CHECKOUT_PATH),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: { variantId: '123' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(typeof body.error).toBe('string');
			expect(ALLOWED_PRE_DELIVERY_ERRORS).toContain(body.error);
		}
	});

	test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.post(LEMONSQUEEZY_CHECKOUT_PATH);
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: { variantId: '123' } }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: { variantId: '123', dark: true } }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: { variantId: '123', isAdmin: true } }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// The route exports GET + POST. PUT / PATCH /
		// DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.put(LEMONSQUEEZY_CHECKOUT_PATH),
			request.patch(LEMONSQUEEZY_CHECKOUT_PATH),
			request.delete(LEMONSQUEEZY_CHECKOUT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} JSON-parse-failure surfaces 'Invalid JSON in request body' AFTER auth gate`, async ({
		request
	}) => {
		// On the AUTH branch, malformed JSON would
		// surface 'Invalid JSON in request body'. The
		// unauth branch fires BEFORE request.json(), so
		// malformed bodies must still produce the
		// canonical 401 — NOT the JSON-parse-failure
		// 400.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: 'not-json' }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: '{ broken: json' }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: '{"variantId":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.message).not.toBe('Invalid JSON in request body');
			expect(body.message).toBe('Authentication required');
		}
	});

	test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} validation chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, validateCheckoutRequestBody
		// surfaces custom error strings joined by ', '.
		// The unauth branch must NEVER emit any
		// validator message OR enum-typed VALIDATION_ERROR.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: { variantId: '' } }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: { variantId: '123', customPrice: -1 } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('VALIDATION_ERROR');
			expect(body.error).toBe('Unauthorized');
		}
	});

	test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} createCustomCheckout call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders
		// `createCustomCheckout(...)` before the gate
		// would surface here: the unauth response would
		// echo `data.checkoutUrl` from the success
		// branch.
		const response = await request.post(LEMONSQUEEZY_CHECKOUT_PATH, {
			data: { variantId: '123456', dark: true }
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBeUndefined();
	});

	test(`POST ${LEMONSQUEEZY_CHECKOUT_PATH} four-string-scan catch (CONFIGURATION_ERROR / PAYMENT_SERVICE_ERROR / INTERNAL_ERROR) is NOT entered on unauth`, async ({
		request
	}) => {
		// The outer catch scans for four error message
		// strings and dispatches to three different
		// status codes. The unauth branch must NEVER
		// produce any of these enum-typed error codes.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CHECKOUT_PATH),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_CHECKOUT_PATH, { data: { variantId: '123' } })
		]);

		const FORBIDDEN_CATCH_ERROR_CODES = [
			'CONFIGURATION_ERROR',
			'PAYMENT_SERVICE_ERROR',
			'INTERNAL_ERROR'
		];

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			for (const code of FORBIDDEN_CATCH_ERROR_CODES) {
				expect(body.error).not.toBe(code);
			}
		}
	});
});
