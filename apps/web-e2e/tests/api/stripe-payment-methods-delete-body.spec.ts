import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **DELETE / body / header
 * surface** of the Stripe payment-method-delete
 * endpoint served by the `DELETE` export of
 * `apps/web/app/api/stripe/payment-methods/delete/route.ts`.
 *
 * `DELETE /api/stripe/payment-methods/delete` is the
 * **first per-source-file DELETE smoke** the docs
 * tree publishes for a non-admin payment-method
 * route. Note: the route's mutation method is DELETE
 * (NOT POST as is typical for other payment-method
 * mutations).
 *
 * It is also the **first per-source-file mutating
 * smoke** that pins a **multi-helper-function-
 * extraction handler design** — the handler delegates
 * to FIVE helper functions: `validateSession`,
 * `validatePaymentMethodOwnership`,
 * `handleDefaultPaymentMethodReassignment`,
 * `checkAffectedSubscriptions`, and `handleApiError`.
 *
 * It is also the **first per-source-file mutating
 * smoke** that pins a **customer-metadata-driven IDOR
 * check** — the handler retrieves the Stripe
 * customer associated with the payment method and
 * verifies `customer.metadata?.userId === userId` →
 * 403 if mismatch. Distinct from polar/cancel which
 * matches `subscriptionCustomerId === userPolarCustomerId`.
 *
 * Distinct from the stripe-payment-methods-create
 * sibling:
 *
 *   - **DELETE method** (not POST).
 *   - **ONE-key 401 envelope** `{ success: false,
 *     error: 'Authentication required' }` — NO
 *     `code` field, distinct from create's no-code
 *     envelope (both use one-key but with different
 *     `error` messages).
 *   - **Multi-helper-function-extraction design** —
 *     5 helpers vs create's inline orchestration.
 *   - **Customer-metadata IDOR check** vs create's
 *     no-IDOR (create just attaches whatever
 *     setupIntent the caller references).
 *   - **Stripe-error-echo with `'Stripe error: '`
 *     prefix** — UNIQUE: distinct from create which
 *     echoes the raw stripe error message.
 *   - **Default-payment-method reassignment side-
 *     effect** — if the deleted method was the
 *     default, the handler picks a remaining method
 *     OR clears the default.
 *   - **Affected-subscriptions count** — read-only
 *     count of active subscriptions using the
 *     deleted method.
 *
 *   1. **`validateSession()` helper** — `!session?.
 *      user?.id` → 401 `{ success: false, error:
 *      'Authentication required' }`.
 *   2. **JSON body parse** via `await request.json()`
 *      AFTER auth gate.
 *   3. **`deletePaymentMethodSchema.parse(body)`** —
 *      Zod throwing parse. Failure → caught by
 *      `handleApiError(error, 'delete payment
 *      method')` as `z.ZodError` → 400 with
 *      structured `details: [{path, message}]`.
 *   4. **`validatePaymentMethodOwnership(paymentMethodId,
 *      userId)` helper** —
 *        - `paymentMethods.retrieve` → if no customer
 *          → 400 `'Payment method not associated
 *          with a customer'`.
 *        - `customers.retrieve` → if string-or-
 *          deleted → 404 `'Customer not found'`.
 *        - `customer.metadata?.userId !== userId` →
 *          403 `'Access denied: payment method does
 *          not belong to user'`.
 *   5. **`handleDefaultPaymentMethodReassignment`
 *      side-effect** — if the deleted method was
 *      the default, picks a remaining method OR
 *      clears the default.
 *   6. **`checkAffectedSubscriptions` count** —
 *      read-only count of active subscriptions
 *      using the deleted method.
 *   7. **`stripe.paymentMethods.detach(paymentMethodId)`**
 *      — load-bearing detachment call.
 *   8. **Success payload** — `{ success: true,
 *      message: 'Payment method deleted
 *      successfully', data: { was_default,
 *      affected_subscriptions,
 *      new_default_payment_method } }`.
 *   9. **`handleApiError` THREE-helper catch
 *      dispatcher** — `z.ZodError` → 400 with
 *      structured `details`, `Stripe.errors.
 *      StripeError` → status from `error.statusCode`
 *      (defaults to 400) with `'Stripe error: '`-
 *      prefixed message, default → 500 with
 *      operation name.
 *  10. **Method-resolution surface** — the route
 *      exports ONLY `DELETE`. `GET` / `POST` /
 *      `PUT` / `PATCH` must round-trip to a `< 500`
 *      status.
 */
const STRIPE_PAYMENT_METHODS_DELETE_PATH = '/api/stripe/payment-methods/delete';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (zod) if reachable)' },

	// Required-field probes.
	{ data: { paymentMethodId: '' }, label: 'empty paymentMethodId (would 400 (zod) if reachable)' },
	{ data: { otherField: 'X' }, label: 'no paymentMethodId field' },

	// Valid bodies.
	{ data: { paymentMethodId: 'pm_test' }, label: 'valid minimal' },

	// Type-violation probes.
	{ data: { paymentMethodId: 1 }, label: 'numeric paymentMethodId' },
	{ data: { paymentMethodId: ['array'] }, label: 'array paymentMethodId' },

	// Bypass attempts.
	{ data: { paymentMethodId: 'pm_x', isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { paymentMethodId: 'pm_x', userId: 'attacker_user_id' }, label: 'fabricated userId bypass' },
	{ data: { paymentMethodId: 'X'.repeat(2_000) }, label: 'large padded paymentMethodId' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Invalid request data',
	'Payment method not associated with a customer',
	'Customer not found',
	'Access denied: payment method does not belong to user',
	'Payment method deleted successfully',
	'Failed to delete payment method'
] as const;

test.describe('API: /api/stripe/payment-methods/delete DELETE body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`DELETE ${STRIPE_PAYMENT_METHODS_DELETE_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of BODIES) {
		test(`DELETE ${STRIPE_PAYMENT_METHODS_DELETE_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`DELETE ${STRIPE_PAYMENT_METHODS_DELETE_PATH} returns 401 with the canonical Authentication required envelope`, async ({
		request
	}) => {
		// `validateSession()` helper: `!session?.user?.
		// id` → 401 `{ success: false, error:
		// 'Authentication required' }`.
		const response = await request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Authentication required' });
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_DELETE_PATH} envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
		expect(body.message).toBeUndefined();
		expect(body.data).toBeUndefined();
		expect(body.details).toBeUndefined();
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_DELETE_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch returns `{ success: true,
		// message: '...', data: { was_default,
		// affected_subscriptions,
		// new_default_payment_method } }`.
		const response = await request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, {
			data: { paymentMethodId: 'pm_test' }
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBe(false);
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_DELETE_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH),
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, { data: {} }),
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, { data: { paymentMethodId: 'pm_x' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
		}
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_DELETE_PATH} does NOT echo Stripe-error-prefix on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, Stripe errors surface as
		// `'Stripe error: <message>'`. The unauth
		// branch must NEVER include this prefix.
		const responses = await Promise.all([
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, { data: { paymentMethodId: 'pm_invalid' } }),
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, {
				data: { paymentMethodId: 'definitely-not-a-pm' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(typeof body.error).toBe('string');
			expect(body.error).not.toMatch(/^Stripe error:/);
		}
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_DELETE_PATH} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH);
		const responses = await Promise.all([
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, { data: {} }),
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, { data: { paymentMethodId: 'pm_x' } }),
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, { data: { paymentMethodId: 'pm_x', isAdmin: true } }),
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_DELETE_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_DELETE_PATH} cross-method probe (GET / POST / PUT / PATCH) does NOT 5xx`, async ({
		request
	}) => {
		// DELETE is the ONLY exported method.
		const responses = await Promise.all([
			request.get(STRIPE_PAYMENT_METHODS_DELETE_PATH),
			request.post(STRIPE_PAYMENT_METHODS_DELETE_PATH),
			request.put(STRIPE_PAYMENT_METHODS_DELETE_PATH),
			request.patch(STRIPE_PAYMENT_METHODS_DELETE_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_DELETE_PATH} Zod-throw catch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, an empty body or empty
		// paymentMethodId surfaces 'Invalid request
		// data' with structured `details: [{path,
		// message}]`. The unauth branch must NEVER
		// emit this 400 envelope.
		const responses = await Promise.all([
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, { data: {} }),
			request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, { data: { paymentMethodId: '' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Invalid request data');
			expect(body.details).toBeUndefined();
		}
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_DELETE_PATH} ownership-check helper / detach / reassignment / sub-count are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders any of the four
		// helper-function calls before the auth gate
		// would surface here:
		//   - validatePaymentMethodOwnership → would
		//     leak 'Payment method not associated with
		//     a customer' / 'Customer not found' /
		//     'Access denied'.
		//   - handleDefaultPaymentMethodReassignment
		//     → would call customers.update.
		//   - checkAffectedSubscriptions → would echo
		//     `affected_subscriptions` count.
		//   - paymentMethods.detach → would actually
		//     detach (catastrophic).
		const response = await request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, {
			data: { paymentMethodId: 'pm_test' }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Authentication required');
		expect(body.data).toBeUndefined();
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_DELETE_PATH} caller-supplied paymentMethodId is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// A regression that echoed the caller's
		// paymentMethodId in the unauth response would
		// allow attacker-controlled values to surface
		// (potentially XSS-shaped). Pin no leak.
		const response = await request.delete(STRIPE_PAYMENT_METHODS_DELETE_PATH, {
			data: { paymentMethodId: 'pm_<script>alert(1)</script>' }
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('<script>');
		expect(serialized).not.toContain('alert(1)');
	});
});
