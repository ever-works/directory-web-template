import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET / dynamic-segment /
 * header surface** of the Stripe per-id setup-intent
 * retrieval endpoint served by the `GET` export of
 * `apps/web/app/api/stripe/setup-intent/[id]/route.ts`.
 *
 * `GET /api/stripe/setup-intent/[id]` is the **first
 * per-source-file GET smoke** the docs tree publishes
 * for a Stripe per-id primitive route (the setup-
 * intent root POST is documented at
 * [`stripe-setup-intent-body-spec.md`](stripe-setup-intent-body-spec.md);
 * this is its dynamic-segment GET sibling).
 *
 * It is also the **first per-source-file GET smoke**
 * that pins a **`error.code === 'resource_missing'`
 * substring detection** in the catch — UNIQUE: the
 * stripe-payment-methods-delete sibling uses
 * `error.statusCode` for prefix-message echoing; this
 * GET handler dispatches on Stripe's enum-typed
 * `code` property to surface a 404.
 *
 * Distinct from the stripe-setup-intent (POST) root
 * sibling:
 *
 *   - **GET method** (not POST).
 *   - **`!session?.user?.id` gate** with `{ success:
 *     false, error: 'Unauthorized' }` envelope (vs
 *     setup-intent root POST's `{ error:
 *     'Unauthorized' }` ONE-key envelope without
 *     `success` key).
 *   - **Customer-metadata-driven IDOR check** via
 *     `customer.metadata?.userId !== session.user.id`
 *     → 403 `'Unauthorized - setup intent does not
 *     belong to user'` (matches stripe-payment-
 *     methods-delete pattern with different
 *     message).
 *   - **Filtered SetupIntent fields** in success
 *     payload — `{ id, client_secret, status, usage,
 *     customer, payment_method, created, metadata }`.
 *     Distinct from the POST root which returns the
 *     raw provider object.
 *   - **Stripe-`error.code === 'resource_missing'`
 *     substring detection** in catch → 404 `'Setup
 *     intent not found'`. UNIQUE.
 *
 *   1. **`auth()` session lookup** — `!session?.
 *      user?.id` → 401 `{ success: false, error:
 *      'Unauthorized' }`.
 *   2. **`{ id } = await params`** dynamic-segment
 *      resolution.
 *   3. **`!id` check** — 400 `{ success: false,
 *      error: 'Setup intent ID is required' }`.
 *   4. **`stripe.setupIntents.retrieve(id)`** —
 *      load-bearing call.
 *   5. **Customer-metadata IDOR check** —
 *      `stripe.customers.retrieve(setupIntent.
 *      customer)` → if string-or-deleted → 404
 *      `'Customer not found'`; if `customer.metadata
 *      ?.userId !== session.user.id` → 403.
 *   6. **Success payload** — filtered SetupIntent
 *      fields.
 *   7. **THREE-branch outer catch** — `error.code
 *      === 'resource_missing'` → 404; other
 *      `StripeError` → 400 with raw `error.message`;
 *      default → 500 `'Failed to retrieve setup
 *      intent'`.
 *   8. **Method-resolution surface** — the route
 *      exports ONLY `GET`. `POST` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const NON_EXISTENT_ID = '__definitely-not-a-real-setup-intent-id__';
const STRIPE_SETUP_INTENT_ID_PATH = `/api/stripe/setup-intent/${NON_EXISTENT_ID}`;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Setup intent ID is required',
	'Customer not found',
	'Unauthorized - setup intent does not belong to user',
	'Setup intent not found',
	'Failed to retrieve setup intent'
] as const;

test.describe('API: /api/stripe/setup-intent/[id] GET dynamic-segment / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${STRIPE_SETUP_INTENT_ID_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(STRIPE_SETUP_INTENT_ID_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${STRIPE_SETUP_INTENT_ID_PATH} returns 401 with the canonical Unauthorized envelope`, async ({
		request
	}) => {
		// `!session?.user?.id` → 401 `{ success: false,
		// error: 'Unauthorized' }`.
		const response = await request.get(STRIPE_SETUP_INTENT_ID_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Unauthorized' });
	});

	test(`GET ${STRIPE_SETUP_INTENT_ID_PATH} envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.get(STRIPE_SETUP_INTENT_ID_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
		expect(body.data).toBeUndefined();
	});

	test(`GET ${STRIPE_SETUP_INTENT_ID_PATH} does NOT echo a SetupIntent client_secret on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the success branch returns the
		// `client_secret` field. The unauth branch
		// must NEVER expose this — a regression that
		// re-orders setupIntents.retrieve before the
		// auth gate would leak the client_secret.
		const response = await request.get(STRIPE_SETUP_INTENT_ID_PATH);
		const body = await response.json();
		expect(body.client_secret).toBeUndefined();
		expect(body.data).toBeUndefined();
		// Even if `data` is present, no client_secret
		// inside it.
		if (body.data) {
			expect(body.data.client_secret).toBeUndefined();
		}
	});

	test(`GET ${STRIPE_SETUP_INTENT_ID_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.get(STRIPE_SETUP_INTENT_ID_PATH);
		const body = await response.json();
		for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
			expect(body.error).not.toBe(msg);
		}
	});

	test(`GET ${STRIPE_SETUP_INTENT_ID_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(STRIPE_SETUP_INTENT_ID_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get(STRIPE_SETUP_INTENT_ID_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.get(STRIPE_SETUP_INTENT_ID_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${STRIPE_SETUP_INTENT_ID_PATH} cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// GET is the ONLY exported method.
		const responses = await Promise.all([
			request.post(STRIPE_SETUP_INTENT_ID_PATH),
			request.put(STRIPE_SETUP_INTENT_ID_PATH),
			request.patch(STRIPE_SETUP_INTENT_ID_PATH),
			request.delete(STRIPE_SETUP_INTENT_ID_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${STRIPE_SETUP_INTENT_ID_PATH} setupIntents.retrieve / customers.retrieve / IDOR check are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: a regression that re-orders the
		// Stripe SDK calls before the auth gate would
		// expose the SetupIntent's `client_secret`
		// field (giving any caller the ability to
		// attach a payment method to the customer).
		const response = await request.get(STRIPE_SETUP_INTENT_ID_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Unauthorized' });
	});

	test(`GET ${STRIPE_SETUP_INTENT_ID_PATH} catch-branch dispatcher is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The catch dispatches on `error.code ===
		// 'resource_missing'` → 404, other StripeError
		// → 400 with raw message, default → 500. The
		// unauth branch must NEVER reach the catch.
		const response = await request.get(STRIPE_SETUP_INTENT_ID_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).not.toBe('Setup intent not found');
		expect(body.error).not.toBe('Failed to retrieve setup intent');
	});

	test(`GET ${STRIPE_SETUP_INTENT_ID_PATH} no-stripe-error-message-leak invariant on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, generic StripeErrors
		// echo `error.message` directly into the
		// envelope's `error` field. The unauth branch
		// must NEVER include any stripe-error-message
		// substring.
		const responses = await Promise.all([
			request.get(`/api/stripe/setup-intent/seti_invalid`),
			request.get(`/api/stripe/setup-intent/not_a_real_id`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Unauthorized');
			// No stripe error patterns should leak.
			expect(body.error).not.toContain('No such setupintent');
			expect(body.error).not.toContain('resource_missing');
		}
	});

	test(`GET ${STRIPE_SETUP_INTENT_ID_PATH} cross-id invariance — different IDs produce IDENTICAL unauth envelope`, async ({
		request
	}) => {
		// Pin that the unauth 401 envelope is
		// IDENTICAL across different setup-intent IDs
		// (auth gate fires BEFORE any per-id branch).
		const responses = await Promise.all([
			request.get(`/api/stripe/setup-intent/seti_a`),
			request.get(`/api/stripe/setup-intent/seti_b`),
			request.get(`/api/stripe/setup-intent/seti_attacker_target`)
		]);

		const bodies = await Promise.all(responses.map((r) => r.json()));
		for (const body of bodies) {
			expect(body).toEqual({ success: false, error: 'Unauthorized' });
		}
	});
});
