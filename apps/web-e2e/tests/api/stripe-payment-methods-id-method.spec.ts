import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET + DELETE / dynamic-
 * segment / header surface** of the Stripe per-id
 * payment-method endpoint served by the `GET` AND
 * `DELETE` exports of
 * `apps/web/app/api/stripe/payment-methods/[id]/route.ts`.
 *
 * `GET|DELETE /api/stripe/payment-methods/[id]` is
 * the **first per-source-file GET + DELETE dual-
 * method smoke** the docs tree publishes for any
 * Stripe per-id primitive route. Sibling to:
 *
 *   - [`stripe-payment-methods-delete-body-spec.md`](stripe-payment-methods-delete-body-spec.md)
 *     — DELETE-by-body on the static `/delete` path
 *     (NO dynamic segment, id in body).
 *   - [`stripe-setup-intent-id-query-spec.md`](stripe-setup-intent-id-query-spec.md)
 *     — GET-only on a dynamic-segment per-id path
 *     (no DELETE).
 *   - [`stripe-payment-methods-update-method-spec.md`](stripe-payment-methods-update-method-spec.md)
 *     — PUT + PATCH dual-method smoke on a STATIC
 *     `/update` path (no dynamic segment).
 *
 * Distinct from EVERY prior per-id Stripe smoke:
 *
 *   - **TWO methods exported on the same dynamic-
 *     segment path:** GET (retrieve filtered fields)
 *     AND DELETE (detach + default-reassignment).
 *     The FIRST per-source-file GET + DELETE dual-
 *     method smoke pinning both methods on the same
 *     `[id]` route.
 *   - **Customer-metadata-driven IDOR check on BOTH
 *     methods** via `customer.metadata?.userId !==
 *     session.user.id` → 403 `'Unauthorized -
 *     payment method does not belong to user'`.
 *   - **`!paymentMethod.customer` check** — distinct
 *     for each method:
 *       - GET: 400 `'Payment method not associated
 *         with any customer'` (with **`any`**).
 *       - DELETE: 400 `'Payment method not
 *         associated with a customer'` (with **`a`**).
 *     UNIQUE: the only known per-source-file smoke
 *     pinning a one-word article-shift (`any` vs
 *     `a`) between two methods on the same handler.
 *   - **DELETE default-reassignment cascade** — if
 *     the deleted method was the customer's default
 *     and there are other methods, re-assign default
 *     to the first remaining method;
 *     if there are no remaining methods, set default
 *     to `undefined`. The FIRST per-source-file
 *     DELETE smoke pinning a default-reassignment
 *     cascade.
 *   - **THREE-branch StripeError catch on BOTH
 *     methods** — `error.code === 'resource_missing'`
 *     → 404 `'Payment method not found'`; other
 *     `StripeError` → 400 with raw `error.message`;
 *     default → 500 (`'Failed to retrieve payment
 *     method'` for GET, `'Failed to delete payment
 *     method'` for DELETE).
 *
 *   1. **`auth()` session lookup** — `!session?.
 *      user?.id` → 401 `{ success: false, error:
 *      'Unauthorized' }`. SAME envelope on BOTH
 *      methods.
 *   2. **`{ id } = await params`** dynamic-segment
 *      resolution.
 *   3. **`!id` check** — 400 `{ success: false,
 *      error: 'Payment method ID is required' }`.
 *      SAME on both methods.
 *   4. **`stripe.paymentMethods.retrieve(id)`** —
 *      load-bearing call on BOTH methods.
 *   5. **`!paymentMethod.customer` check on DELETE**
 *      / **`paymentMethod.customer ? … : else`
 *      branch on GET** — diverges on this critical
 *      structural difference between the two methods.
 *   6. **`stripe.customers.retrieve(...)`** — second
 *      load-bearing call on BOTH methods.
 *   7. **String-or-deleted customer check** → 404
 *      `'Customer not found'` on both methods.
 *   8. **Customer-metadata IDOR check** → 403 on
 *      both methods (same message).
 *   9. **DELETE-only**: default-reassignment cascade
 *      via `stripe.paymentMethods.list` +
 *      `stripe.customers.update`.
 *   10. **DELETE-only**: `stripe.paymentMethods.
 *       detach(id)` — the actual mutation.
 *   11. **GET success payload** — filtered fields:
 *       `{ id, type, card, billing_details, created,
 *       metadata, is_default, customer_id }`.
 *   12. **DELETE success payload** — `{ success:
 *       true, message: 'Payment method deleted
 *       successfully', data: { was_default } }`.
 *   13. **THREE-branch outer catch** on each method.
 *   14. **Method-resolution surface** — the route
 *       exports `GET` AND `DELETE`. `POST` / `PUT` /
 *       `PATCH` must round-trip to a `< 500` status.
 */
const NON_EXISTENT_ID = '__definitely-not-a-real-payment-method-id__';
const STRIPE_PAYMENT_METHODS_ID_PATH = `/api/stripe/payment-methods/${NON_EXISTENT_ID}`;

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
	'Payment method ID is required',
	'Payment method not associated with any customer',
	'Payment method not associated with a customer',
	'Customer not found',
	'Unauthorized - payment method does not belong to user',
	'Payment method not found',
	'Payment method deleted successfully',
	'Failed to retrieve payment method',
	'Failed to delete payment method'
] as const;

test.describe('API: /api/stripe/payment-methods/[id] GET + DELETE dynamic-segment / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${STRIPE_PAYMENT_METHODS_ID_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.get(STRIPE_PAYMENT_METHODS_ID_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.delete(STRIPE_PAYMENT_METHODS_ID_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${STRIPE_PAYMENT_METHODS_ID_PATH} returns 401 with the canonical Unauthorized envelope`, async ({
		request
	}) => {
		// `!session?.user?.id` → 401 `{ success: false,
		// error: 'Unauthorized' }`.
		const response = await request.get(STRIPE_PAYMENT_METHODS_ID_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Unauthorized' });
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} returns 401 with the canonical Unauthorized envelope`, async ({
		request
	}) => {
		// `!session?.user?.id` → 401 `{ success: false,
		// error: 'Unauthorized' }`.
		const response = await request.delete(STRIPE_PAYMENT_METHODS_ID_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Unauthorized' });
	});

	test(`GET + DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} envelope-equality on the unauth branch`, async ({
		request
	}) => {
		// Cross-method response-parity assertion: the
		// GET and DELETE 401 envelopes are byte-
		// identical (both methods inline the same
		// `auth()` gate as the FIRST line of the try).
		const getResponse = await request.get(STRIPE_PAYMENT_METHODS_ID_PATH);
		const deleteResponse = await request.delete(STRIPE_PAYMENT_METHODS_ID_PATH);

		expect(getResponse.status()).toBe(deleteResponse.status());

		const getBody = await getResponse.json();
		const deleteBody = await deleteResponse.json();
		expect(getBody).toEqual(deleteBody);
	});

	test(`GET ${STRIPE_PAYMENT_METHODS_ID_PATH} envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.get(STRIPE_PAYMENT_METHODS_ID_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
		expect(body.data).toBeUndefined();
		expect(body.message).toBeUndefined();
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} envelope shape has exactly success and error keys`, async ({
		request
	}) => {
		const response = await request.delete(STRIPE_PAYMENT_METHODS_ID_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
		expect(body.data).toBeUndefined();
		expect(body.message).toBeUndefined();
	});

	test(`GET + DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL — pins the gate-before-post-auth
		// order across nine candidate post-auth
		// messages.
		const getResponse = await request.get(STRIPE_PAYMENT_METHODS_ID_PATH);
		const deleteResponse = await request.delete(STRIPE_PAYMENT_METHODS_ID_PATH);

		for (const response of [getResponse, deleteResponse]) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
			expect(body.message).not.toBe('Payment method deleted successfully');
		}
	});

	test(`GET ${STRIPE_PAYMENT_METHODS_ID_PATH} does NOT leak filtered SUCCESS payload fields on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the GET success branch returns
		// `{ id, type, card, billing_details, created,
		// metadata, is_default, customer_id }`. A
		// regression that re-orders the success-build
		// before the auth gate would expose all of
		// these to any caller.
		const response = await request.get(STRIPE_PAYMENT_METHODS_ID_PATH);
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.id).toBeUndefined();
		expect(body.card).toBeUndefined();
		expect(body.billing_details).toBeUndefined();
		expect(body.is_default).toBeUndefined();
		expect(body.customer_id).toBeUndefined();
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} does NOT leak was_default field on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the DELETE success branch returns
		// `{ data: { was_default } }`. The unauth
		// branch must NEVER expose this field.
		const response = await request.delete(STRIPE_PAYMENT_METHODS_ID_PATH);
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.was_default).toBeUndefined();
	});

	test(`GET + DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(STRIPE_PAYMENT_METHODS_ID_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.delete(STRIPE_PAYMENT_METHODS_ID_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.get(STRIPE_PAYMENT_METHODS_ID_PATH, {
				headers: { Authorization: 'Bearer anything' }
			}),
			request.delete(STRIPE_PAYMENT_METHODS_ID_PATH, {
				headers: { Authorization: 'Bearer anything' }
			}),
			request.get(STRIPE_PAYMENT_METHODS_ID_PATH, {
				headers: { 'X-User-Id': 'fabricated' }
			}),
			request.delete(STRIPE_PAYMENT_METHODS_ID_PATH, {
				headers: { 'X-User-Id': 'fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET + DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} cross-method probe (POST / PUT / PATCH) does NOT 5xx`, async ({
		request
	}) => {
		// GET and DELETE are the exported methods.
		// POST / PUT / PATCH must round-trip to a
		// `< 500` status.
		const responses = await Promise.all([
			request.post(STRIPE_PAYMENT_METHODS_ID_PATH),
			request.put(STRIPE_PAYMENT_METHODS_ID_PATH),
			request.patch(STRIPE_PAYMENT_METHODS_ID_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET + DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} paymentMethods.retrieve / customers.retrieve / IDOR / detach / default-reassignment are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: a regression that re-orders any of
		// the side-effects (paymentMethods.retrieve,
		// customers.retrieve, customers.update,
		// paymentMethods.detach,
		// paymentMethods.list) before the auth gate
		// would expose them to any caller.
		const getResponse = await request.get(STRIPE_PAYMENT_METHODS_ID_PATH);
		const deleteResponse = await request.delete(STRIPE_PAYMENT_METHODS_ID_PATH);

		for (const response of [getResponse, deleteResponse]) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body).toEqual({ success: false, error: 'Unauthorized' });
		}
	});

	test(`GET + DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} catch-branch dispatcher is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The catch dispatches on `error.code ===
		// 'resource_missing'` → 404, other StripeError
		// → 400 with raw message, default → 500.
		// Distinct 500 messages per method:
		//   - GET → 'Failed to retrieve payment method'
		//   - DELETE → 'Failed to delete payment method'
		// The unauth branch must NEVER reach the catch.
		const getResponse = await request.get(STRIPE_PAYMENT_METHODS_ID_PATH);
		const deleteResponse = await request.delete(STRIPE_PAYMENT_METHODS_ID_PATH);

		for (const response of [getResponse, deleteResponse]) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Payment method not found');
			expect(body.error).not.toBe('Failed to retrieve payment method');
			expect(body.error).not.toBe('Failed to delete payment method');
		}
	});

	test(`GET + DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} no-stripe-error-message-leak invariant on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, generic StripeErrors echo
		// `error.message` directly into the envelope's
		// `error` field. The unauth branch must NEVER
		// include any stripe-error-message substring.
		const responses = await Promise.all([
			request.get(`/api/stripe/payment-methods/pm_invalid`),
			request.delete(`/api/stripe/payment-methods/pm_invalid`),
			request.get(`/api/stripe/payment-methods/not_a_real_id`),
			request.delete(`/api/stripe/payment-methods/not_a_real_id`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Unauthorized');
			expect(body.error).not.toContain('No such payment_method');
			expect(body.error).not.toContain('resource_missing');
		}
	});

	test(`GET + DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} cross-id invariance — different IDs produce IDENTICAL unauth envelope`, async ({
		request
	}) => {
		// Pin that the unauth 401 envelope is
		// IDENTICAL across different payment-method
		// IDs (auth gate fires BEFORE any per-id
		// branch).
		const responses = await Promise.all([
			request.get(`/api/stripe/payment-methods/pm_a`),
			request.get(`/api/stripe/payment-methods/pm_b`),
			request.get(`/api/stripe/payment-methods/pm_attacker_target`),
			request.delete(`/api/stripe/payment-methods/pm_a`),
			request.delete(`/api/stripe/payment-methods/pm_b`),
			request.delete(`/api/stripe/payment-methods/pm_attacker_target`)
		]);

		const bodies = await Promise.all(responses.map((r) => r.json()));
		for (const body of bodies) {
			expect(body).toEqual({ success: false, error: 'Unauthorized' });
		}
	});

	test(`GET + DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} caller-supplied id with XSS is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// Pin that no XSS-payload substring of the
		// caller-supplied dynamic segment leaks into
		// the unauth envelope (Next.js's path-segment
		// resolution decodes `%3C`-style sequences).
		const xssId = encodeURIComponent('pm_<script>alert(1)</script>');
		const responses = await Promise.all([
			request.get(`/api/stripe/payment-methods/${xssId}`),
			request.delete(`/api/stripe/payment-methods/${xssId}`)
		]);

		for (const response of responses) {
			const body = await response.json();
			const serialized = JSON.stringify(body);
			expect(serialized).not.toContain('<script>');
			expect(serialized).not.toContain('alert(1)');
		}
	});

	test(`DELETE ${STRIPE_PAYMENT_METHODS_ID_PATH} default-reassignment cascade is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the DELETE handler's branch:
		//   if (isDefault) {
		//     const otherPaymentMethods = await
		//       stripe.paymentMethods.list({...});
		//     ...
		//     stripe.customers.update({
		//       invoice_settings: {
		//         default_payment_method: ...
		//       }
		//     });
		//   }
		// is gated behind the auth check. A regression
		// that re-orders the cascade before the auth
		// gate would mutate the customer's default
		// payment method on behalf of an unauthorized
		// caller.
		const response = await request.delete(STRIPE_PAYMENT_METHODS_ID_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Unauthorized' });
		// The success branch returns `was_default`
		// inside `data`. A regression would surface
		// either a 200 here OR a `was_default` field.
		expect(body.data).toBeUndefined();
		expect(body.was_default).toBeUndefined();
	});
});
