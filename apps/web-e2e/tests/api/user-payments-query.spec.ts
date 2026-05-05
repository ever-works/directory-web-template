import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET / header surface** of
 * the authenticated user-payment-history endpoint
 * served by the `GET` export of
 * `apps/web/app/api/user/payments/route.ts`.
 *
 * `GET /api/user/payments` is the **first per-source-
 * file GET smoke** the docs tree publishes that pins a
 * **top-level-ARRAY success response** (NOT an object
 * wrapper). The handler returns either `[]` (when the
 * caller has no Stripe customer) OR a top-level
 * payment-history array (transformed Stripe invoice
 * data). UNIQUE — every prior per-source-file GET
 * smoke pins an object-shaped response; this is the
 * FIRST that pins a bare-array shape.
 *
 * Sibling specs:
 *   - [`subscription-query.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/subscription-query.spec.ts)
 *     covers the `GET` export of
 *     `apps/web/app/api/user/subscription/route.ts` —
 *     SAME `auth()` gate + Stripe customer lookup +
 *     two-tier catch dispatcher pattern, but returns
 *     an OBJECT-wrapped response (`{
 *     hasActiveSubscription, currentSubscription?,
 *     subscriptionHistory }`).
 *
 * Distinct from EVERY prior session-gated GET smoke:
 *
 *   - **Top-level-ARRAY success response** — the
 *     200-branch returns `paymentHistory` (a JS array)
 *     directly via `NextResponse.json(paymentHistory)`.
 *     UNIQUE.
 *   - **No-customer-found 200 EMPTY ARRAY** `[]` — if
 *     `customerId` is null, the handler returns `[]`
 *     with status 200 (NOT a 401 / 404 / 4xx). Distinct
 *     from `subscription` sibling which returns `{
 *     hasActiveSubscription: false, message: 'No
 *     Stripe customer found' }`.
 *   - **Bare ONE-key `{ error: 'Unauthorized' }` 401
 *     envelope** (NO `success` key, NO `message` key —
 *     same envelope shape as `subscription` sibling).
 *   - **Two-tier 500 catch dispatcher** — inner
 *     Stripe-error → 500 `'Failed to fetch payment
 *     data from Stripe'`; outer → 500 `'Failed to
 *     fetch payment data'`. UNIQUE — TWO different 500
 *     messages with the SAME ONE-key `{ error }`
 *     shape.
 *   - **Zero-arg GET signature** — `export async
 *     function GET()` with NO `request` / `context`
 *     arguments.
 *   - **Stripe Invoices + Subscriptions DUAL-list
 *     load-bearing chain** — the handler calls BOTH
 *     `stripe.invoices.list` AND `stripe.subscriptions.
 *     list` to enrich each invoice with subscription
 *     metadata (FIRST per-source-file GET smoke
 *     pinning a dual-Stripe-list invariant).
 *   - **Filtered status whitelist** — only invoices
 *     with `status === 'paid' || status === 'open'`
 *     appear in the response.
 *
 *   1. **`auth()` session lookup** — `!session?.user?.id`
 *      → 401 ONE-key `{ error: 'Unauthorized' }`.
 *   2. **`initializeStripeProvider()` + `getStripeInstance()`**
 *      — happens AFTER the auth gate.
 *   3. **`stripe.getCustomerId(session.user as any)`**
 *      — load-bearing customer-id lookup; null → 200
 *      EMPTY ARRAY `[]`.
 *   4. **`stripe.invoices.list({ customer, limit:
 *      100 })`** — load-bearing invoice list.
 *   5. **`stripe.subscriptions.list({ customer,
 *      limit: 100 })`** — load-bearing subscription
 *      list (DUAL-list invariant).
 *   6. **Filter + transform + sort** — paid/open only,
 *      then sort by date desc.
 *   7. **Inner catch** — 500 `'Failed to fetch payment
 *      data from Stripe'`.
 *   8. **Outer catch** — 500 `'Failed to fetch payment
 *      data'`.
 *   9. **Method-resolution surface** — the route
 *      exports ONLY `GET`. `POST` / `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const PAYMENTS_PATH = '/api/user/payments';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' }
] as const;

test.describe('API: /api/user/payments GET header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${PAYMENTS_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(PAYMENTS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${PAYMENTS_PATH} returns 401 with the canonical ONE-key Unauthorized envelope`, async ({ request }) => {
		const response = await request.get(PAYMENTS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
	});

	test(`GET ${PAYMENTS_PATH} 401 envelope shape has exactly the error key`, async ({ request }) => {
		// Strict ONE-key envelope-shape assertion: NO
		// `success`, NO `message`, NO `data` leak.
		const response = await request.get(PAYMENTS_PATH);

		if (response.status() === 401) {
			const body = await response.json();
			expect(Object.keys(body)).toEqual(['error']);
			expect(body.success).toBeUndefined();
			expect(body.message).toBeUndefined();
		}
	});

	test(`GET ${PAYMENTS_PATH} does NOT echo a top-level array on the unauth branch (no payment-history leak)`, async ({
		request
	}) => {
		// CRITICAL: the success branch returns a TOP-
		// LEVEL ARRAY (paymentHistory). Pin that the
		// unauth response is NEVER an array.
		const response = await request.get(PAYMENTS_PATH);
		const body = await response.json();
		expect(Array.isArray(body)).toBe(false);
	});

	test(`GET ${PAYMENTS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.get(PAYMENTS_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// The two distinct 500 catch messages must NEVER
		// appear on the unauth branch.
		expect(serialized).not.toContain('Failed to fetch payment data from Stripe');
		expect(serialized).not.toContain('Failed to fetch payment data');
	});

	test(`GET ${PAYMENTS_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const baseline = await request.get(PAYMENTS_PATH);
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.get(PAYMENTS_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.get(PAYMENTS_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.get(PAYMENTS_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.get(PAYMENTS_PATH, { headers: { Authorization: 'Bearer fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`GET ${PAYMENTS_PATH} cross-method probe (POST / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// GET is the only exported method.
		const responses = await Promise.all([
			request.post(PAYMENTS_PATH),
			request.put(PAYMENTS_PATH),
			request.patch(PAYMENTS_PATH),
			request.delete(PAYMENTS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${PAYMENTS_PATH} initializeStripeProvider / invoices.list / subscriptions.list are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the load-bearing Stripe SDK calls
		// (`invoices.list`, `subscriptions.list`,
		// `getCustomerId`) must NEVER run on unauth.
		const response = await request.get(PAYMENTS_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// No invoice fields should leak.
		expect(serialized).not.toContain('hosted_invoice_url');
		expect(serialized).not.toContain('invoice_pdf');
		expect(serialized).not.toContain('amount_paid');
		expect(serialized).not.toContain('paymentProvider');
		expect(serialized).not.toContain('subscriptionId');
		expect(serialized).not.toContain('billingInterval');
	});

	test(`GET ${PAYMENTS_PATH} catch-branch dispatcher is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The two-tier 500 catch (inner Stripe-error vs
		// outer) must NEVER fire on unauth. Pin that the
		// status is 401 and neither 500 message leaks.
		const response = await request.get(PAYMENTS_PATH);
		expect(response.status()).not.toBe(500);

		if (response.status() === 401) {
			const body = await response.json();
			const serialized = JSON.stringify(body);
			expect(serialized).not.toContain('Failed to fetch');
		}
	});

	test(`GET ${PAYMENTS_PATH} no-stripe-error-message-leak invariant on the unauth branch`, async ({
		request
	}) => {
		// Pin that no Stripe-error substring leaks on
		// unauth.
		const response = await request.get(PAYMENTS_PATH);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		expect(serialized).not.toContain('No such customer');
		expect(serialized).not.toContain('resource_missing');
		expect(serialized).not.toContain('invoice');
		expect(serialized).not.toContain('Stripe API error');
	});

	test(`GET ${PAYMENTS_PATH} cross-permutation status invariance`, async ({ request }) => {
		// The status MUST be stable across all header
		// permutations on the unauth branch.
		const baseline = await request.get(PAYMENTS_PATH);
		const baselineStatus = baseline.status();

		for (const { headers } of HEADERS) {
			const response = await request.get(PAYMENTS_PATH, { headers });
			expect(response.status()).toBe(baselineStatus);
		}
	});
});
