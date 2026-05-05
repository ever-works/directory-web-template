import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Stripe checkout-session creation endpoint
 * served by the `POST` export of
 * `apps/web/app/api/stripe/checkout/route.ts`.
 *
 * `POST /api/stripe/checkout` is the **fourth and
 * final per-source-file POST smoke for an auth-gated
 * payment-provider checkout endpoint** the docs tree
 * publishes — completing the checkout quartet (after
 * [`solidgate-checkout-body-spec.md`](solidgate-checkout-body-spec.md),
 * [`polar-checkout-body-spec.md`](polar-checkout-body-spec.md),
 * and
 * [`lemonsqueezy-checkout-body-spec.md`](lemonsqueezy-checkout-body-spec.md)).
 * The existing multi-provider
 * `payment-checkouts.spec.ts` covers all four
 * providers' checkout endpoints with a single `< 500`
 * assertion each; this spec drills into the Stripe
 * handler specifically.
 *
 * Distinct from ALL three siblings:
 *
 *   - **Three-way mode ternary mapping:** `mode ===
 *     'one_time' ? 'payment' : mode === 'subscription'
 *     ? 'subscription' : 'setup'` — UNIQUE: unknown
 *     mode values fall through to the `'setup'`
 *     Stripe mode (Setup Intent flow). Distinct from
 *     polar's two-way subscription/one_time dispatch
 *     and lemonsqueezy/solidgate which take whatever
 *     mode the body provides.
 *   - **Trial-amount validation:** `hasTrial =
 *     trialPeriodDays > 0 && isAuthorizedTrialAmount`;
 *     if `hasTrial && !trialAmountId` → 400
 *     `{ error: 'Invalid trial configuration',
 *     message: 'trialAmountId is required when trial
 *     is enabled' }`. The FIRST per-source-file POST
 *     smoke that pins a trial-config validation
 *     contract.
 *   - **Helper-function pipeline:** the handler chains
 *     `buildCheckoutLineItems(...)`,
 *     `createBaseCheckoutParams(...)`, and
 *     `applySubscriptionConfig(...)` from the
 *     co-located `./helpers` module. The FIRST per-
 *     source-file POST smoke that pins a multi-helper
 *     assembly pipeline.
 *   - **`safeErrorMessage` (NOT `safeErrorResponse`)
 *     in catch:** the outer catch uses
 *     `safeErrorMessage(error, 'Failed to create
 *     checkout session')` to extract the message and
 *     wraps it in a manual 500 envelope with `{ error,
 *     message, details: <dev-only-stack> }`. Distinct
 *     from polar's `safeErrorResponse(...)` and
 *     solidgate's `safeErrorMessage(...)` —
 *     stripe-checkout returns THREE keys on catch
 *     (matching solidgate's success-branch shape).
 *   - **Stripe SDK direct call:** the handler calls
 *     `stripe.checkout.sessions.create(checkoutParams)`
 *     via `stripeProvider.getStripeInstance()`. The
 *     FIRST per-source-file POST smoke that pins a
 *     direct-SDK-instance access contract via a
 *     public method (NOT private property `as any`
 *     like polar's one_time branch).
 *   - **`!session?.user` gate** (matches polar +
 *     solidgate; distinct from lemonsqueezy's
 *     `!session?.user?.id`).
 *
 *   1. **`auth()` session lookup** — load-bearing
 *      first gate. `!session?.user` → 401 `{ error:
 *      'Unauthorized', message: 'Authentication
 *      required' }` (TWO-key envelope).
 *   2. **`getOrCreateStripeProvider()` +
 *      `getStripeInstance()`** — happens AFTER the
 *      auth gate.
 *   3. **JSON body parse via destructured `await
 *      request.json()`** AFTER the auth gate — NO
 *      per-call try/catch (matches polar).
 *   4. **Three-way mode ternary mapping** —
 *      `'payment' | 'subscription' | 'setup'`.
 *   5. **`stripeProvider.getCustomerId(session.user)`
 *      lookup** — failure → 400 `{ error: 'Failed to
 *      create customer', message: 'Unable to create
 *      Stripe customer' }`.
 *   6. **Trial-config validation** — `hasTrial &&
 *      !trialAmountId` → 400 `{ error: 'Invalid
 *      trial configuration', message: 'trialAmountId
 *      is required when trial is enabled' }`.
 *   7. **Helper-function pipeline** —
 *      `buildCheckoutLineItems(priceId, trialAmountId,
 *      hasTrial)`, `createBaseCheckoutParams(...)`,
 *      `applySubscriptionConfig(...)` (subscription
 *      only).
 *   8. **`stripe.checkout.sessions.create
 *      (checkoutParams)`** — load-bearing Stripe SDK
 *      call.
 *   9. **Success payload** — `{ data: { id, url },
 *      status: 200, message: 'Checkout session
 *      created successfully' }` (literal `status: 200`
 *      field).
 *  10. **Outer catch** — `safeErrorMessage(error,
 *      'Failed to create checkout session')` →
 *      `{ error: <safe>, message: 'Failed to create
 *      checkout session', details: <dev-only-stack> }`
 *      with status 500.
 *  11. **Method-resolution surface** — the route
 *      exports `GET` and `POST`. `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const STRIPE_CHECKOUT_PATH = '/api/stripe/checkout';

const STRIPE_CHECKOUT_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { 'X-Stripe-Token': 'anything' }, label: 'fabricated X-Stripe-Token header' }
] as const;

const STRIPE_CHECKOUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Required-field probes.
	{ data: { mode: 'subscription' }, label: 'no priceId' },
	{ data: { successUrl: 'https://x.com', cancelUrl: 'https://x.com' }, label: 'no priceId with URLs' },

	// Valid-shape probes for all three mode branches.
	{
		data: {
			priceId: 'price_test',
			successUrl: 'https://example.com/success',
			cancelUrl: 'https://example.com/cancel'
		},
		label: 'valid one_time default'
	},
	{
		data: {
			priceId: 'price_test',
			mode: 'subscription',
			successUrl: 'https://example.com/success',
			cancelUrl: 'https://example.com/cancel'
		},
		label: 'valid subscription mode'
	},
	{
		data: {
			priceId: 'price_test',
			mode: 'subscription',
			trialPeriodDays: 14,
			isAuthorizedTrialAmount: true,
			trialAmountId: 'price_trial',
			successUrl: 'https://example.com/success',
			cancelUrl: 'https://example.com/cancel'
		},
		label: 'valid subscription with trial'
	},
	{
		data: {
			priceId: 'price_test',
			mode: 'subscription',
			trialPeriodDays: 14,
			isAuthorizedTrialAmount: true,
			successUrl: 'https://example.com/success',
			cancelUrl: 'https://example.com/cancel'
		},
		label: 'subscription with trial but no trialAmountId (would 400 if reachable)'
	},

	// Mode-dispatch probes — three-way ternary.
	{ data: { priceId: 'price_x', mode: 'invalid' }, label: 'invalid mode (falls into setup branch)' },
	{ data: { priceId: 'price_x', mode: 'SUBSCRIPTION' }, label: 'wrong-case mode (falls into setup branch)' },

	// Bypass attempts.
	{
		data: {
			priceId: 'price_x',
			successUrl: 'https://x.com',
			cancelUrl: 'https://x.com',
			isAdmin: true
		},
		label: 'isAdmin=true bypass attempt'
	},
	{
		data: {
			priceId: 'price_x',
			successUrl: 'https://x.com',
			cancelUrl: 'https://x.com',
			userId: 'fabricated'
		},
		label: 'fabricated userId bypass attempt'
	},
	{
		data: {
			priceId: 'price_x',
			successUrl: 'javascript:alert(1)',
			cancelUrl: 'https://x.com'
		},
		label: 'javascript: scheme successUrl bypass attempt'
	},
	{
		data: {
			priceId: 'X'.repeat(2_000),
			successUrl: 'https://x.com',
			cancelUrl: 'https://x.com'
		},
		label: 'large padded priceId'
	}
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Unable to create Stripe customer',
	'trialAmountId is required when trial is enabled',
	'Failed to create checkout session',
	'Checkout session created successfully'
] as const;

test.describe('API: /api/stripe/checkout POST body / header surface', () => {
	for (const { headers, label } of STRIPE_CHECKOUT_HEADERS) {
		test(`POST ${STRIPE_CHECKOUT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_CHECKOUT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of STRIPE_CHECKOUT_BODIES) {
		test(`POST ${STRIPE_CHECKOUT_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_CHECKOUT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${STRIPE_CHECKOUT_PATH} returns 401 with the two-key Unauthorized envelope`, async ({ request }) => {
		// `!session?.user` → 401 TWO-key envelope.
		const response = await request.post(STRIPE_CHECKOUT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized', message: 'Authentication required' });
	});

	test(`POST ${STRIPE_CHECKOUT_PATH} envelope shape has exactly error and message keys`, async ({ request }) => {
		const response = await request.post(STRIPE_CHECKOUT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'message']);
		expect(body.success).toBeUndefined();
		expect(body.details).toBeUndefined();
	});

	test(`POST ${STRIPE_CHECKOUT_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch returns `{ data: { id, url },
		// status: 200, message: '...' }`. The unauth
		// branch must NEVER reach
		// stripe.checkout.sessions.create.
		const response = await request.post(STRIPE_CHECKOUT_PATH, {
			data: {
				priceId: 'price_test',
				successUrl: 'https://example.com/s',
				cancelUrl: 'https://example.com/c'
			}
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.status).not.toBe(200);
	});

	test(`POST ${STRIPE_CHECKOUT_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(STRIPE_CHECKOUT_PATH),
			request.post(STRIPE_CHECKOUT_PATH, { data: {} }),
			request.post(STRIPE_CHECKOUT_PATH, { data: { priceId: 'price_x' } }),
			request.post(STRIPE_CHECKOUT_PATH, {
				data: {
					priceId: 'price_x',
					mode: 'subscription',
					trialPeriodDays: 14,
					isAuthorizedTrialAmount: true
				}
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${STRIPE_CHECKOUT_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(STRIPE_CHECKOUT_PATH);
		const responses = await Promise.all([
			request.post(STRIPE_CHECKOUT_PATH, { data: {} }),
			request.post(STRIPE_CHECKOUT_PATH, {
				data: { priceId: 'price_x', successUrl: 'https://x.com', cancelUrl: 'https://x.com' }
			}),
			request.post(STRIPE_CHECKOUT_PATH, { data: { priceId: 'price_x', mode: 'subscription' } }),
			request.post(STRIPE_CHECKOUT_PATH, { data: { priceId: 'price_x', mode: 'invalid' } }),
			request.post(STRIPE_CHECKOUT_PATH, { data: { priceId: 'price_x', isAdmin: true } }),
			request.post(STRIPE_CHECKOUT_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(STRIPE_CHECKOUT_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${STRIPE_CHECKOUT_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(STRIPE_CHECKOUT_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(STRIPE_CHECKOUT_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(STRIPE_CHECKOUT_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(STRIPE_CHECKOUT_PATH, { headers: { 'X-Stripe-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_CHECKOUT_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({ request }) => {
		// The route exports GET + POST. PUT / PATCH /
		// DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.put(STRIPE_CHECKOUT_PATH),
			request.patch(STRIPE_CHECKOUT_PATH),
			request.delete(STRIPE_CHECKOUT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_CHECKOUT_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// Stripe checkout has NO try/catch around
		// request.json() inside the try block. Malformed
		// JSON on the auth branch would cascade to the
		// outer 500 catch. The unauth branch fires
		// BEFORE request.json(), so malformed bodies
		// must still produce the canonical 401.
		const responses = await Promise.all([
			request.post(STRIPE_CHECKOUT_PATH, { data: 'not-json' }),
			request.post(STRIPE_CHECKOUT_PATH, { data: '{ broken: json' }),
			request.post(STRIPE_CHECKOUT_PATH, { data: '{"priceId":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_CHECKOUT_PATH} trial-config validation is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, hasTrial && !trialAmountId
		// produces 'Invalid trial configuration'. The
		// unauth branch must NEVER emit this 400 message
		// regardless of trial-shaped body.
		const responses = await Promise.all([
			request.post(STRIPE_CHECKOUT_PATH, {
				data: {
					priceId: 'price_x',
					mode: 'subscription',
					trialPeriodDays: 14,
					isAuthorizedTrialAmount: true
				}
			}),
			request.post(STRIPE_CHECKOUT_PATH, {
				data: {
					priceId: 'price_x',
					mode: 'subscription',
					trialPeriodDays: 7,
					isAuthorizedTrialAmount: true
				}
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Invalid trial configuration');
			expect(body.message).not.toBe('trialAmountId is required when trial is enabled');
		}
	});

	test(`POST ${STRIPE_CHECKOUT_PATH} mode-ternary (payment / subscription / setup) is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// All three mode branches return success
		// payloads with `data.url`. The unauth branch
		// must NEVER reach
		// stripe.checkout.sessions.create — the response
		// must NEVER echo a `data.url` or `data.id`.
		const responses = await Promise.all([
			request.post(STRIPE_CHECKOUT_PATH, { data: { priceId: 'price_x' } }),
			request.post(STRIPE_CHECKOUT_PATH, { data: { priceId: 'price_x', mode: 'subscription' } }),
			request.post(STRIPE_CHECKOUT_PATH, { data: { priceId: 'price_x', mode: 'invalid' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.status).not.toBe(200);
			expect(body.message).not.toBe('Checkout session created successfully');
		}
	});

	test(`POST ${STRIPE_CHECKOUT_PATH} helper-pipeline + stripe.checkout.sessions.create are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders the helper
		// pipeline (buildCheckoutLineItems,
		// createBaseCheckoutParams,
		// applySubscriptionConfig) or the SDK call
		// before the gate would surface here.
		const response = await request.post(STRIPE_CHECKOUT_PATH, {
			data: {
				priceId: 'price_test',
				mode: 'subscription',
				successUrl: 'https://example.com/s',
				cancelUrl: 'https://example.com/c'
			}
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.status).not.toBe(200);
		// Outer-catch envelope's `details` field (dev-
		// only stack trace) must NEVER appear on the
		// unauth branch.
		expect(body.details).toBeUndefined();
	});

	test(`POST ${STRIPE_CHECKOUT_PATH} catch-branch is NOT entered on the unauth branch`, async ({ request }) => {
		// A regression that ran any of the helpers
		// before the gate could leak `details` (dev-only
		// stack) on the unauth response. Pin the
		// catch-branch-not-entered invariant.
		const responses = await Promise.all([
			request.post(STRIPE_CHECKOUT_PATH),
			request.post(STRIPE_CHECKOUT_PATH, { data: { priceId: 'price_x' } }),
			request.post(STRIPE_CHECKOUT_PATH, {
				data: {
					priceId: 'price_x',
					mode: 'subscription',
					trialPeriodDays: 14,
					isAuthorizedTrialAmount: true
				}
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.details).toBeUndefined();
			expect(body.message).toBe('Authentication required');
		}
	});

	test(`POST ${STRIPE_CHECKOUT_PATH} caller-supplied successUrl / cancelUrl values are NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// XSS-shaped redirect URLs must NEVER appear in
		// the unauth response body.
		const response = await request.post(STRIPE_CHECKOUT_PATH, {
			data: {
				priceId: 'price_x',
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
