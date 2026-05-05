import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **PUT + PATCH / body /
 * header surface** of the Stripe payment-method-
 * update endpoint served by the `PUT` and `PATCH`
 * exports of
 * `apps/web/app/api/stripe/payment-methods/update/route.ts`.
 *
 * `PUT|PATCH /api/stripe/payment-methods/update` is
 * the **first per-source-file PUT + PATCH smoke**
 * the docs tree publishes for a non-admin payment-
 * method route. Sibling to the
 * [`stripe-payment-methods-delete-body-spec.md`](stripe-payment-methods-delete-body-spec.md)
 * route which exports `DELETE`.
 *
 * Distinct from EVERY prior mutating-method smoke:
 *
 *   - **TWO mutation methods exported on the same
 *     path:** PUT (full update) AND PATCH (set-
 *     default-only). The FIRST per-source-file
 *     mutating smoke pinning a PUT + PATCH dual-
 *     method export (other dual-method specs are
 *     PUT + DELETE on `admin/clients/bulk` and
 *     `items/[slug]/comments/[commentId]`).
 *   - **Shared helper-function-extraction design**
 *     with the delete sibling — both PUT and PATCH
 *     use `validateSession`,
 *     `validatePaymentMethodOwnership`, and
 *     `handleApiError`.
 *   - **Per-method field set:**
 *     - PUT: `{ payment_method_id, metadata,
 *       billing_details, set_as_default }`
 *     - PATCH: `{ payment_method_id }` only.
 *   - **PUT preserves existing metadata** via
 *     spread: `metadata: { ...paymentMethod.
 *     metadata, ...metadata, userId }`. The FIRST
 *     per-source-file PUT smoke pinning a metadata-
 *     merge contract.
 *   - **`userId` always present in metadata** —
 *     PUT explicitly sets `userId` AFTER the
 *     spread, ensuring the caller cannot override
 *     it.
 *
 *   1. **`validateSession()` helper** (shared with
 *      delete sibling) — `!session?.user?.id` →
 *      401 `{ success: false, error: 'Authentication
 *      required' }`.
 *   2. **JSON body parse** via `await request.json()`
 *      AFTER auth gate.
 *   3. **PUT**:
 *      `updatePaymentMethodSchema.parse(body)` —
 *      Zod throwing parse for full-update fields.
 *      **PATCH**:
 *      `setDefaultPaymentMethodSchema.parse(body)`
 *      — simpler schema for default-only.
 *   4. **`validatePaymentMethodOwnership(payment
 *      _method_id, userId)` helper** — same three-
 *      stage chain as delete sibling.
 *   5. **PUT**: `stripe.paymentMethods.update(...)`
 *      with merged metadata + billing_details +
 *      optional set-as-default. **PATCH**:
 *      `stripe.customers.update(...)` with
 *      `invoice_settings.default_payment_method`.
 *   6. **Success payload** —
 *      - PUT: `{ success: true, data:
 *        <formattedPaymentMethod>, message:
 *        'Payment method updated successfully' }`.
 *      - PATCH: `{ success: true, message: 'Payment
 *        method set as default successfully' }`
 *        (NO `data` field).
 *   7. **`handleApiError` THREE-helper catch
 *      dispatcher** — same as delete sibling.
 *   8. **Method-resolution surface** — the route
 *      exports `PUT` AND `PATCH`. `GET` / `POST` /
 *      `DELETE` must round-trip to a `< 500`
 *      status.
 */
const STRIPE_PAYMENT_METHODS_UPDATE_PATH = '/api/stripe/payment-methods/update';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const PUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '{}', label: 'empty object body (would 400 (zod) if reachable)' },

	// Required-field probe.
	{ data: { metadata: { nick: 'Test' } }, label: 'no payment_method_id' },

	// Valid bodies.
	{ data: { payment_method_id: 'pm_test' }, label: 'minimal valid' },
	{
		data: { payment_method_id: 'pm_x', metadata: { nick: 'Card' } },
		label: 'with metadata'
	},
	{
		data: {
			payment_method_id: 'pm_x',
			billing_details: { name: 'Test User', email: 'test@example.com' }
		},
		label: 'with billing_details'
	},
	{ data: { payment_method_id: 'pm_x', set_as_default: true }, label: 'with set_as_default' },

	// Bypass attempts.
	{
		data: { payment_method_id: 'pm_x', metadata: { userId: 'attacker_user_id' } },
		label: 'metadata.userId override (would be overridden by handler if reachable)'
	},
	{ data: { payment_method_id: 'pm_x', isAdmin: true }, label: 'isAdmin=true bypass attempt' }
] as const;

const PATCH_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '{}', label: 'empty object body (would 400 (zod) if reachable)' },

	// Required-field probe.
	{ data: { other: 'X' }, label: 'no payment_method_id' },

	// Valid bodies.
	{ data: { payment_method_id: 'pm_test' }, label: 'minimal valid' },

	// Bypass attempts.
	{ data: { payment_method_id: 'pm_x', isAdmin: true }, label: 'isAdmin=true bypass' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Invalid request data',
	'Payment method not associated with a customer',
	'Customer not found',
	'Access denied: payment method does not belong to user',
	'Payment method updated successfully',
	'Payment method set as default successfully',
	'Failed to update payment method',
	'Failed to set default payment method'
] as const;

test.describe('API: /api/stripe/payment-methods/update PUT + PATCH body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`PUT ${STRIPE_PAYMENT_METHODS_UPDATE_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.put(STRIPE_PAYMENT_METHODS_UPDATE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`PATCH ${STRIPE_PAYMENT_METHODS_UPDATE_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.patch(STRIPE_PAYMENT_METHODS_UPDATE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${STRIPE_PAYMENT_METHODS_UPDATE_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.put(STRIPE_PAYMENT_METHODS_UPDATE_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PATCH_BODIES) {
		test(`PATCH ${STRIPE_PAYMENT_METHODS_UPDATE_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.patch(STRIPE_PAYMENT_METHODS_UPDATE_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`PUT ${STRIPE_PAYMENT_METHODS_UPDATE_PATH} returns 401 with the canonical Authentication required envelope`, async ({
		request
	}) => {
		const response = await request.put(STRIPE_PAYMENT_METHODS_UPDATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Authentication required' });
	});

	test(`PATCH ${STRIPE_PAYMENT_METHODS_UPDATE_PATH} returns 401 with the canonical Authentication required envelope`, async ({
		request
	}) => {
		const response = await request.patch(STRIPE_PAYMENT_METHODS_UPDATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Authentication required' });
	});

	test(`PUT + PATCH ${STRIPE_PAYMENT_METHODS_UPDATE_PATH} envelope-equality on the unauth branch`, async ({
		request
	}) => {
		// Cross-method response-parity assertion: the
		// PUT and PATCH 401 envelopes are byte-
		// identical (same `validateSession` helper
		// produces both).
		const putResponse = await request.put(STRIPE_PAYMENT_METHODS_UPDATE_PATH);
		const patchResponse = await request.patch(STRIPE_PAYMENT_METHODS_UPDATE_PATH);

		expect(putResponse.status()).toBe(patchResponse.status());

		const putBody = await putResponse.json();
		const patchBody = await patchResponse.json();
		expect(putBody).toEqual(patchBody);
	});

	test(`PUT + PATCH ${STRIPE_PAYMENT_METHODS_UPDATE_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.put(STRIPE_PAYMENT_METHODS_UPDATE_PATH),
			request.patch(STRIPE_PAYMENT_METHODS_UPDATE_PATH),
			request.put(STRIPE_PAYMENT_METHODS_UPDATE_PATH, { data: { payment_method_id: 'pm_x' } }),
			request.patch(STRIPE_PAYMENT_METHODS_UPDATE_PATH, { data: { payment_method_id: 'pm_x' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
		}
	});

	test(`PUT ${STRIPE_PAYMENT_METHODS_UPDATE_PATH} caller-supplied metadata.userId is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, the handler explicitly
		// sets `userId` AFTER the metadata spread,
		// preventing the caller from overriding it.
		// The unauth branch must NEVER reach the
		// metadata-spread.
		const response = await request.put(STRIPE_PAYMENT_METHODS_UPDATE_PATH, {
			data: { payment_method_id: 'pm_x', metadata: { userId: 'attacker_user_id' } }
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('attacker_user_id');
	});

	test(`PUT + PATCH ${STRIPE_PAYMENT_METHODS_UPDATE_PATH} cross-method probe (GET / POST / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// PUT + PATCH are the exported methods.
		const responses = await Promise.all([
			request.get(STRIPE_PAYMENT_METHODS_UPDATE_PATH),
			request.post(STRIPE_PAYMENT_METHODS_UPDATE_PATH),
			request.delete(STRIPE_PAYMENT_METHODS_UPDATE_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PUT + PATCH ${STRIPE_PAYMENT_METHODS_UPDATE_PATH} ownership-check helper / paymentMethods.update / customers.update are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: a regression that re-orders any of
		// the side-effects (paymentMethods.update on
		// PUT, customers.update on both) before the
		// auth gate would surface here.
		const putResponse = await request.put(STRIPE_PAYMENT_METHODS_UPDATE_PATH, {
			data: { payment_method_id: 'pm_test', set_as_default: true, metadata: { nick: 'X' } }
		});
		const patchResponse = await request.patch(STRIPE_PAYMENT_METHODS_UPDATE_PATH, {
			data: { payment_method_id: 'pm_test' }
		});

		for (const response of [putResponse, patchResponse]) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Authentication required');
			expect(body.data).toBeUndefined();
			expect(body.success).toBe(false);
		}
	});

	test(`PUT + PATCH ${STRIPE_PAYMENT_METHODS_UPDATE_PATH} caller-supplied payment_method_id with XSS is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		const putResponse = await request.put(STRIPE_PAYMENT_METHODS_UPDATE_PATH, {
			data: { payment_method_id: 'pm_<script>alert(1)</script>' }
		});
		const patchResponse = await request.patch(STRIPE_PAYMENT_METHODS_UPDATE_PATH, {
			data: { payment_method_id: 'pm_<script>alert(1)</script>' }
		});

		for (const response of [putResponse, patchResponse]) {
			const body = await response.json();
			const serialized = JSON.stringify(body);
			expect(serialized).not.toContain('<script>');
			expect(serialized).not.toContain('alert(1)');
		}
	});
});
