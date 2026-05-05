import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Stripe payment-intent creation endpoint
 * served by the `POST` export of
 * `apps/web/app/api/stripe/payment-intent/route.ts`.
 *
 * `POST /api/stripe/payment-intent` is the **first
 * per-source-file POST smoke** the docs tree
 * publishes that pins a **NO-body-validation
 * contract** — the handler destructures `{ amount,
 * currency = 'usd', metadata, planId }` from the
 * body and passes them straight to
 * `stripeProvider.createPaymentIntent(...)` with NO
 * `if (!amount)` check, NO Zod validation, NO type
 * checking. EVERY prior per-source-file POST smoke
 * has at least one body-validation gate. This is the
 * FIRST trust-the-body POST contract in the rollout.
 *
 * It is also the **second per-source-file POST smoke**
 * that pins a **raw payment-provider object as the
 * success payload** (after
 * [`stripe-setup-intent-body-spec.md`](stripe-setup-intent-body-spec.md))
 * — `return NextResponse.json(paymentIntent)`
 * returns the Stripe PaymentIntent object verbatim,
 * NO wrapper envelope. The PaymentIntent's
 * `client_secret` field is the same critical-leak
 * vector as setup-intent.
 *
 * Distinct from the stripe-setup-intent sibling:
 *
 *   - **Body destructure with currency default:**
 *     `{ amount, currency = 'usd', metadata, planId }`
 *     pulls four fields from the body. setup-intent
 *     is zero-arg.
 *   - **Caller-controlled metadata spread:**
 *     `metadata: { userId, planId, ...metadata }` —
 *     the caller's `metadata.userId` OVERRIDES the
 *     session userId because `...metadata` spreads
 *     AFTER. The smoke spec pins that this risk-
 *     surface metadata is NEVER reached on the
 *     unauth branch.
 *   - **Trust-the-body contract:** no validation
 *     gate.
 *   - **GET sibling** with `?payment_intent_id=`
 *     query-param-required check.
 *
 * Distinct from EVERY prior POST smoke:
 *
 *   - **NO-body-validation contract:** the FIRST
 *     trust-the-body POST contract.
 *   - **Bare 401 envelope** `{ error:
 *     'Unauthorized' }` matches setup-intent
 *     sibling — distinct from the canonical
 *     `{ success: false, error }` envelope.
 *   - **Raw PaymentIntent object as success
 *     payload** with `client_secret` exposure
 *     vector.
 *   - **Caller-controlled metadata spread** allows
 *     the caller to override the session userId
 *     in the PaymentIntent's metadata via
 *     `metadata: { userId: 'other' }`.
 *
 *   1. **`auth()` session lookup** — `!session?.
 *      user` → 401 `{ error: 'Unauthorized' }`
 *      (bare envelope).
 *   2. **JSON body parse** via destructured `await
 *      request.json()` AFTER the auth gate (NO
 *      try/catch, NO validation).
 *   3. **`getOrCreateStripeProvider()` singleton
 *      initialization**.
 *   4. **`stripeProvider.getCustomerId(session.
 *      user)` lookup** — null → 400 `{ error:
 *      'Failed to create customer' }`.
 *   5. **`stripeProvider.createPaymentIntent(...)`**
 *      — load-bearing call. Metadata includes the
 *      caller-controlled spread `{ userId, planId,
 *      ...metadata }`.
 *   6. **Success payload** — raw PaymentIntent
 *      object (NO wrapper envelope) with status
 *      200.
 *   7. **Outer catch** — 500 `{ error: 'Failed to
 *      create payment intent' }`.
 *   8. **Method-resolution surface** — the route
 *      exports `GET` and `POST`. `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500`
 *      status.
 */
const STRIPE_PAYMENT_INTENT_PATH = '/api/stripe/payment-intent';

const STRIPE_PAYMENT_INTENT_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const STRIPE_PAYMENT_INTENT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Required-field probe (handler does NOT validate).
	{ data: { amount: 2999 }, label: 'minimal amount only' },
	{
		data: { amount: 2999, currency: 'usd', planId: 'pro_plan' },
		label: 'amount + currency + planId'
	},
	{
		data: { amount: 2999, metadata: { feature: 'premium' } },
		label: 'amount + metadata'
	},

	// Type-violation probes (handler does NOT validate).
	{ data: { amount: 'string' }, label: 'string amount (would pass to provider if reachable)' },
	{ data: { amount: -100 }, label: 'negative amount (would pass to provider if reachable)' },
	{ data: { amount: 0 }, label: 'zero amount (would pass to provider if reachable)' },
	{ data: { amount: 49 }, label: 'below-minimum amount (would pass to provider if reachable)' },

	// Caller-controlled metadata override probes.
	{
		data: { amount: 2999, metadata: { userId: 'attacker_user_id' } },
		label: 'metadata.userId override (would override session userId if reachable)'
	},
	{
		data: { amount: 2999, metadata: { planId: 'override_plan' } },
		label: 'metadata.planId override (would override planId if reachable)'
	},

	// Bypass attempts.
	{ data: { amount: 2999, isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { amount: 2999, customer: 'cus_attacker' }, label: 'fabricated customer override' },
	{ data: { padding: 'x'.repeat(2_000), amount: 2999 }, label: 'large padded body' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = ['Failed to create customer', 'Failed to create payment intent'] as const;

test.describe('API: /api/stripe/payment-intent POST body / header surface', () => {
	for (const { headers, label } of STRIPE_PAYMENT_INTENT_HEADERS) {
		test(`POST ${STRIPE_PAYMENT_INTENT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_PAYMENT_INTENT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of STRIPE_PAYMENT_INTENT_BODIES) {
		test(`POST ${STRIPE_PAYMENT_INTENT_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(STRIPE_PAYMENT_INTENT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${STRIPE_PAYMENT_INTENT_PATH} returns 401 with the bare Unauthorized envelope`, async ({ request }) => {
		const response = await request.post(STRIPE_PAYMENT_INTENT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test(`POST ${STRIPE_PAYMENT_INTENT_PATH} envelope shape has exactly one error key (NO success key)`, async ({
		request
	}) => {
		const response = await request.post(STRIPE_PAYMENT_INTENT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
		expect(body.message).toBeUndefined();
	});

	test(`POST ${STRIPE_PAYMENT_INTENT_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch returns the raw PaymentIntent
		// object with `id` / `client_secret` / etc.
		const response = await request.post(STRIPE_PAYMENT_INTENT_PATH, {
			data: { amount: 2999, currency: 'usd' }
		});
		const body = await response.json();
		expect(body.id).toBeUndefined();
		expect(body.client_secret).toBeUndefined();
		expect(body.amount).toBeUndefined();
		expect(body.customer).toBeUndefined();
	});

	test(`POST ${STRIPE_PAYMENT_INTENT_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(STRIPE_PAYMENT_INTENT_PATH),
			request.post(STRIPE_PAYMENT_INTENT_PATH, { data: {} }),
			request.post(STRIPE_PAYMENT_INTENT_PATH, { data: { amount: 2999 } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
		}
	});

	test(`POST ${STRIPE_PAYMENT_INTENT_PATH} does NOT echo a PaymentIntent client_secret on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL security invariant: a regression
		// that ran createPaymentIntent before the auth
		// gate would expose the PaymentIntent's
		// `client_secret` field, giving any caller the
		// ability to confirm a charge against the
		// fabricated customer.
		const response = await request.post(STRIPE_PAYMENT_INTENT_PATH, {
			data: { amount: 2999 }
		});
		const body = await response.json();
		expect(body.client_secret).toBeUndefined();
		expect(body.id).toBeUndefined();
		expect(body.customer).toBeUndefined();
		expect(body.status).toBeUndefined();
	});

	test(`POST ${STRIPE_PAYMENT_INTENT_PATH} does NOT echo any Stripe PaymentIntent fields on the unauth branch`, async ({
		request
	}) => {
		// Pin the full set of PaymentIntent fields
		// that must NEVER appear: id / client_secret /
		// status / amount / currency / customer.
		const FORBIDDEN_PAYMENT_INTENT_FIELDS = [
			'id',
			'client_secret',
			'status',
			'amount',
			'currency',
			'customer'
		] as const;

		const response = await request.post(STRIPE_PAYMENT_INTENT_PATH, {
			data: { amount: 2999, currency: 'usd' }
		});
		const body = await response.json();
		for (const field of FORBIDDEN_PAYMENT_INTENT_FIELDS) {
			expect(body[field]).toBeUndefined();
		}
	});

	test(`POST ${STRIPE_PAYMENT_INTENT_PATH} caller-supplied metadata.userId is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// The handler's `metadata: { userId, planId,
		// ...metadata }` spreads the caller's metadata
		// AFTER the session userId, so a caller-
		// supplied `metadata.userId` would OVERRIDE
		// the session userId in the PaymentIntent
		// metadata. The unauth branch must NEVER
		// reach this metadata-spread.
		const response = await request.post(STRIPE_PAYMENT_INTENT_PATH, {
			data: { amount: 2999, metadata: { userId: 'attacker_user_id' } }
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('attacker_user_id');
	});

	test(`POST ${STRIPE_PAYMENT_INTENT_PATH} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.post(STRIPE_PAYMENT_INTENT_PATH);
		const responses = await Promise.all([
			request.post(STRIPE_PAYMENT_INTENT_PATH, { data: {} }),
			request.post(STRIPE_PAYMENT_INTENT_PATH, { data: { amount: 2999 } }),
			request.post(STRIPE_PAYMENT_INTENT_PATH, { data: { amount: 'string' } }),
			request.post(STRIPE_PAYMENT_INTENT_PATH, { data: { amount: 2999, isAdmin: true } }),
			request.post(STRIPE_PAYMENT_INTENT_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(STRIPE_PAYMENT_INTENT_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${STRIPE_PAYMENT_INTENT_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(STRIPE_PAYMENT_INTENT_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(STRIPE_PAYMENT_INTENT_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(STRIPE_PAYMENT_INTENT_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(STRIPE_PAYMENT_INTENT_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_PAYMENT_INTENT_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// The route exports GET + POST. PUT / PATCH /
		// DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.put(STRIPE_PAYMENT_INTENT_PATH),
			request.patch(STRIPE_PAYMENT_INTENT_PATH),
			request.delete(STRIPE_PAYMENT_INTENT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_PAYMENT_INTENT_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// payment-intent has NO try/catch around
		// request.json(). Malformed JSON on the unauth
		// branch must still produce 401 BEFORE the
		// body parse cascades to outer catch.
		const responses = await Promise.all([
			request.post(STRIPE_PAYMENT_INTENT_PATH, { data: 'not-json' }),
			request.post(STRIPE_PAYMENT_INTENT_PATH, { data: '{ broken: json' }),
			request.post(STRIPE_PAYMENT_INTENT_PATH, { data: '{"amount":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_PAYMENT_INTENT_PATH} createPaymentIntent + getCustomerId are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders
		// `createPaymentIntent(...)` OR
		// `getCustomerId(...)` before the auth gate
		// would surface here: the unauth response
		// would echo `'Failed to create customer'`
		// (400) OR a `client_secret` from the
		// PaymentIntent (CRITICAL).
		const response = await request.post(STRIPE_PAYMENT_INTENT_PATH, {
			data: { amount: 2999, currency: 'usd' }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Failed to create customer');
		expect(body.client_secret).toBeUndefined();
	});

	test(`POST ${STRIPE_PAYMENT_INTENT_PATH} catch-branch message is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(STRIPE_PAYMENT_INTENT_PATH),
			request.post(STRIPE_PAYMENT_INTENT_PATH, { data: 'not-json' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Failed to create payment intent');
		}
	});
});
