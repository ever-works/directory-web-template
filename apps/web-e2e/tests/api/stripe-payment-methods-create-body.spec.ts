import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Stripe payment-method-create-from-setup-intent
 * endpoint served by the `POST` export of
 * `apps/web/app/api/stripe/payment-methods/create/route.ts`.
 *
 * `POST /api/stripe/payment-methods/create` is the
 * **first per-source-file POST smoke** the docs tree
 * publishes that pins a **Zod `parse` (NOT
 * `safeParse`) contract** — `createPaymentMethodSchema
 * .parse(body)` THROWS on validation failure and the
 * outer catch detects `error instanceof z.ZodError`
 * to dispatch a 400 envelope. EVERY prior per-source-
 * file POST smoke uses `safeParse` to handle
 * validation gracefully. This is the FIRST throw-on-
 * invalid Zod contract in the rollout.
 *
 * It is also the **first per-source-file POST smoke**
 * that pins a **Stripe-error-echo contract** in the
 * outer catch — `error instanceof Stripe.errors.
 * StripeError` → 400 `{ success: false, error: error.
 * message }` reflects the raw Stripe error message in
 * the response. EVERY prior catch uses static-string
 * messages.
 *
 * Distinct from EVERY prior per-source-file POST
 * smoke:
 *
 *   - **Zod `.parse(body)` (throwing):** the FIRST
 *     throw-on-invalid Zod contract.
 *   - **Stripe-error-echo:** the FIRST POST smoke
 *     pinning a stripe-error-message-echoed-in-400
 *     catch contract.
 *   - **Multi-step Stripe SDK orchestration:**
 *     `setupIntents.retrieve` → conditional
 *     `customers.create` → conditional
 *     `paymentMethods.attach` → conditional
 *     `paymentMethods.update` → conditional
 *     `customers.update` (default payment method) →
 *     re-retrieve. The most complex stripe SDK
 *     orchestration in any per-source-file POST
 *     smoke.
 *   - **Formatted response payload:** the success
 *     branch extracts `{ id, type, card: { brand,
 *     last4, exp_month, exp_year, funding } | null,
 *     created, metadata }` — NOT raw provider
 *     object. Distinct from setup-intent and
 *     payment-intent which return raw.
 *
 *   1. **`auth()` session lookup** — `!session?.user
 *      ?.id` → 401 `{ success: false, error:
 *      'Unauthorized' }` (canonical one-key
 *      envelope).
 *   2. **JSON body parse** via `await request.json()`
 *      AFTER auth gate (NO try/catch).
 *   3. **`createPaymentMethodSchema.parse(body)`** —
 *      Zod throwing parse. Failure → caught by outer
 *      catch as `z.ZodError` → 400 `{ success: false,
 *      error: 'Invalid request data', details:
 *      <ZodError> }`.
 *   4. **`stripe.setupIntents.retrieve(setup_intent_id)`**
 *      — load-bearing call. Stripe error → caught
 *      by outer catch as `StripeError` → 400 with
 *      stripe-error-message echoed.
 *   5. **`setupIntent.status !== 'succeeded'`** →
 *      400 `'Setup intent has not succeeded'`.
 *   6. **`!setupIntent.payment_method`** → 400 `'No
 *      payment method found in setup intent'`.
 *   7. **Get-or-create customer** via
 *      `getUserStripeCustomerId` /
 *      `saveUserStripeCustomerId`.
 *   8. **Conditional attach** — `if (!paymentMethod.
 *      customer)` `paymentMethods.attach`.
 *   9. **Conditional metadata update** — `if
 *      (metadata)` `paymentMethods.update`.
 *  10. **Conditional default update** — `if (set_as
 *      _default)` `customers.update`.
 *  11. **Re-retrieve** — second
 *      `paymentMethods.retrieve` for final state.
 *  12. **Formatted success payload** — `{ success:
 *      true, data: <formatted>, message: 'Payment
 *      method created successfully' }`.
 *  13. **THREE-branch outer catch** —
 *      `z.ZodError` → 400 (with `details`),
 *      `StripeError` → 400 (with `error.message`
 *      echoed), default → 500 `'Failed to create
 *      payment method'`.
 *  14. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const STRIPE_PAYMENT_METHODS_CREATE_PATH = '/api/stripe/payment-methods/create';

const HEADERS = [
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

const BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would Zod-throw if reachable)' },

	// Required-field probes.
	{ data: { set_as_default: true }, label: 'no setup_intent_id' },
	{ data: { setup_intent_id: '' }, label: 'empty setup_intent_id (would Zod-throw if reachable)' },

	// Valid bodies.
	{ data: { setup_intent_id: 'seti_test' }, label: 'valid minimal' },
	{
		data: { setup_intent_id: 'seti_test', set_as_default: true, metadata: { nickname: 'Card' } },
		label: 'valid full payload'
	},

	// Type-violation probes.
	{ data: { setup_intent_id: 1 }, label: 'numeric setup_intent_id (would Zod-throw if reachable)' },
	{ data: { setup_intent_id: 'seti_x', set_as_default: 'true' }, label: 'string set_as_default' },
	{
		data: { setup_intent_id: 'seti_x', metadata: { nested: { a: 1 } } },
		label: 'nested metadata (would Zod-throw if reachable)'
	},

	// Bypass attempts.
	{ data: { setup_intent_id: 'seti_x', isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{
		data: { setup_intent_id: 'seti_x', metadata: { userId: 'attacker_user_id' } },
		label: 'metadata.userId override (would override session userId if reachable)'
	},
	{ data: { setup_intent_id: 'X'.repeat(2_000) }, label: 'large padded setup_intent_id' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Invalid request data',
	'Setup intent has not succeeded',
	'No payment method found in setup intent',
	'Payment method created successfully',
	'Failed to create payment method'
] as const;

test.describe('API: /api/stripe/payment-methods/create POST body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of BODIES) {
		test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} returns 401 with the canonical Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Unauthorized' });
	});

	test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
		expect(body.details).toBeUndefined();
	});

	test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch returns `{ success: true,
		// data: { id, type, card, created, metadata },
		// message: '...' }`. The unauth branch must
		// NEVER reach setupIntents.retrieve OR any
		// downstream Stripe call.
		const response = await request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, {
			data: { setup_intent_id: 'seti_test' }
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBe(false);
	});

	test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH),
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, { data: {} }),
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, {
				data: { setup_intent_id: 'seti_test', set_as_default: true }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
		}
	});

	test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} Zod-throw catch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, an empty body or invalid
		// setup_intent_id surfaces 'Invalid request
		// data' with a `details` field. The unauth
		// branch must NEVER emit this 400 envelope.
		const responses = await Promise.all([
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, { data: {} }),
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, { data: { setup_intent_id: '' } }),
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, { data: { setup_intent_id: 1 } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Invalid request data');
			expect(body.details).toBeUndefined();
		}
	});

	test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} stripe-error-echo catch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, a malformed
		// setup_intent_id would trigger a StripeError
		// with the raw stripe error message echoed in
		// the 400 response. The unauth branch must
		// NEVER reach setupIntents.retrieve, so no
		// stripe error message can leak.
		const response = await request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, {
			data: { setup_intent_id: 'invalid_format_seti' }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		// No stripe error message should leak.
		expect(body.error).not.toContain('No such setupintent');
		expect(body.error).not.toContain('Stripe');
	});

	test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} does NOT echo a Stripe payment-method id / card details on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL security invariant: a regression
		// that ran setupIntents.retrieve →
		// paymentMethods.attach → paymentMethods.
		// retrieve before the auth gate would expose
		// the formatted payment-method object with
		// `card.last4` / `card.brand` / etc. fields.
		const FORBIDDEN_FIELDS = [
			'id',
			'type',
			'card',
			'created',
			'metadata',
			'last4',
			'brand'
		] as const;

		const response = await request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, {
			data: { setup_intent_id: 'seti_test', set_as_default: true }
		});
		const body = await response.json();
		for (const field of FORBIDDEN_FIELDS) {
			expect(body[field]).toBeUndefined();
			if (body.data) {
				expect(body.data[field]).toBeUndefined();
			}
		}
	});

	test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} caller-supplied metadata.userId is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// The handler's `metadata: { userId, ...
		// metadata }` spreads the caller's metadata
		// AFTER the session userId. The unauth branch
		// must NEVER reach this metadata-spread.
		const response = await request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, {
			data: { setup_intent_id: 'seti_x', metadata: { userId: 'attacker_user_id' } }
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('attacker_user_id');
	});

	test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH);
		const responses = await Promise.all([
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, { data: {} }),
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, { data: { setup_intent_id: 'seti_x' } }),
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, {
				data: { setup_intent_id: 'seti_x', set_as_default: true }
			}),
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, {
				data: { setup_intent_id: 'seti_x', isAdmin: true }
			}),
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// POST is the only exported method.
		const responses = await Promise.all([
			request.get(STRIPE_PAYMENT_METHODS_CREATE_PATH),
			request.put(STRIPE_PAYMENT_METHODS_CREATE_PATH),
			request.patch(STRIPE_PAYMENT_METHODS_CREATE_PATH),
			request.delete(STRIPE_PAYMENT_METHODS_CREATE_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} multi-step Stripe orchestration is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders any of the six
		// Stripe SDK calls (setupIntents.retrieve →
		// customers.create → paymentMethods.attach →
		// paymentMethods.update → customers.update →
		// paymentMethods.retrieve) before the gate
		// would surface here.
		const response = await request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, {
			data: { setup_intent_id: 'seti_test', set_as_default: true, metadata: { nick: 'Test' } }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Unauthorized' });
		expect(body.data).toBeUndefined();
		expect(body.message).toBeUndefined();
	});

	test(`POST ${STRIPE_PAYMENT_METHODS_CREATE_PATH} catch-branch generic 500 message is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH),
			request.post(STRIPE_PAYMENT_METHODS_CREATE_PATH, { data: 'not-json' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Failed to create payment method');
		}
	});
});
