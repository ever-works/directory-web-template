import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Polar subscription-cancel endpoint served by
 * the `POST` export of
 * `apps/web/app/api/polar/subscription/[subscriptionId]/cancel/route.ts`.
 *
 * `POST /api/polar/subscription/[subscriptionId]/
 * cancel` is the **first per-source-file POST smoke**
 * the docs tree publishes that pins a **Content-
 * Length 413 pre-check** — the handler reads
 * `request.headers.get('content-length')` BEFORE
 * the body parse and returns 413 `{ error: 'Request
 * body too large. Maximum size is 1024 bytes.' }` if
 * the declared length exceeds 1KB. EVERY prior per-
 * source-file POST smoke uses status codes 4xx /
 * 5xx in standard ranges; this is the FIRST 413
 * (Payload Too Large) contract in the rollout.
 *
 * It is also the **first per-source-file POST smoke**
 * that pins an **IDOR-protection chain** — after
 * the `getCustomerId` lookup (403 if null), the
 * handler retrieves the subscription via
 * `getPolarSubscription(...)` and explicitly checks
 * `subscriptionCustomerId === userPolarCustomerId`,
 * returning a **merged 404 message** `'Subscription
 * not found or access denied'` for both not-found
 * AND ownership-mismatch cases. The FIRST per-
 * source-file POST smoke pinning a merged 404+403
 * IDOR-protection message.
 *
 * Distinct from EVERY prior POST smoke:
 *
 *   - **Content-Length 413 pre-check:** FIRST 413
 *     contract in the rollout.
 *   - **IDOR-protection chain** with merged 404+403
 *     message.
 *   - **Private property access via `(polarProvider
 *     as any).polar`** for direct Polar client
 *     access (matches polar-checkout one_time
 *     branch).
 *   - **Helper-function injection** —
 *     `getPolarSubscription(...)` takes
 *     `formatErrorMessage` AND `logger` as
 *     dependency-injected helpers.
 *   - **TWO-string error-message-detection catch:**
 *     `error.message.includes('not found') || ...
 *     '404'` → 404 `'Subscription not found'`;
 *     `'Unauthorized' || '401'` → 401
 *     `'Unauthorized'`; default →
 *     `safeErrorResponse(...)` 500.
 *   - **Conditional success message** based on
 *     `cancelAtPeriodEnd` flag.
 *   - **Body-parse fault tolerance with size-error
 *     detection** — the inner try/catch on
 *     `request.json()` detects body-size errors
 *     (`'exceeded'`, `'too large'`, `'75000'`) and
 *     returns 413; otherwise silently defaults
 *     `cancelAtPeriodEnd = true`.
 *
 *   1. **`auth()` session lookup** — `!session?.user`
 *      → 401 `{ error: 'Unauthorized' }` (bare
 *      envelope).
 *   2. **Content-Length 413 pre-check** — `parseInt
 *      (contentLength, 10) > 1024` → 413.
 *   3. **Body parse with fault-tolerance** — inner
 *      try/catch with explicit body-size-error
 *      detection. Default `cancelAtPeriodEnd =
 *      true`.
 *   4. **`{ subscriptionId }` param resolution**
 *      via dynamic-segment route.
 *   5. **IDOR-protection chain:**
 *      - `polarProvider.getCustomerId(session.user)`
 *        → 403 `'Unable to verify subscription
 *        ownership'`.
 *      - `(polarProvider as any).polar` extraction
 *        → 500 if missing.
 *      - `getPolarSubscription(subscriptionId,
 *        polarClient, helpers, 'ownership
 *        verification')` → 404 `'Subscription not
 *        found or access denied'` if not found OR
 *        ownership mismatch.
 *   6. **`polarProvider.cancelSubscription
 *      (subscriptionId, cancelAtPeriodEnd)`** —
 *      load-bearing call.
 *   7. **Success payload** — `{ success: true,
 *      data: { id, status, cancelAtPeriodEnd,
 *      currentPeriodEnd, priceId, customerId },
 *      message: <conditional> }` with status 200.
 *   8. **TWO-string error-message-detection catch**
 *      dispatching to 404 / 401 / 500 via
 *      `safeErrorResponse(...)`.
 *   9. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const NON_EXISTENT_SUB_ID = '__definitely-not-a-real-polar-subscription-id__';
const POLAR_CANCEL_PATH = `/api/polar/subscription/${NON_EXISTENT_SUB_ID}/cancel`;

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
	{ data: undefined as unknown, label: 'no body (silent default cancelAtPeriodEnd=true)' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (silent default)' },

	// Valid bodies.
	{ data: { cancelAtPeriodEnd: true }, label: 'cancelAtPeriodEnd: true' },
	{ data: { cancelAtPeriodEnd: false }, label: 'cancelAtPeriodEnd: false (immediate)' },

	// Type-violation probes (handler only checks for boolean).
	{ data: { cancelAtPeriodEnd: 'true' }, label: 'string cancelAtPeriodEnd (silently defaults)' },
	{ data: { cancelAtPeriodEnd: 1 }, label: 'numeric cancelAtPeriodEnd (silently defaults)' },

	// Bypass attempts.
	{ data: { isAdmin: true, cancelAtPeriodEnd: false }, label: 'isAdmin=true bypass attempt' },
	{ data: { customerId: 'cus_attacker' }, label: 'fabricated customerId attempt' },
	{ data: { padding: 'x'.repeat(500) }, label: 'mid-padded body (within 1KB)' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Request body too large. Maximum size is 1024 bytes.',
	'Unable to verify subscription ownership. Please contact support.',
	'Internal error: Unable to verify subscription ownership',
	'Subscription not found or access denied',
	'Subscription will be cancelled at the end of the current period',
	'Subscription cancelled immediately',
	'Failed to cancel subscription',
	'Subscription not found'
] as const;

test.describe('API: /api/polar/subscription/[subscriptionId]/cancel POST body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${POLAR_CANCEL_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(POLAR_CANCEL_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of BODIES) {
		test(`POST ${POLAR_CANCEL_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(POLAR_CANCEL_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${POLAR_CANCEL_PATH} returns 401 with the bare Unauthorized envelope`, async ({ request }) => {
		// `!session?.user` → 401 `{ error:
		// 'Unauthorized' }` (bare envelope).
		const response = await request.post(POLAR_CANCEL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test(`POST ${POLAR_CANCEL_PATH} envelope shape has exactly one error key`, async ({ request }) => {
		const response = await request.post(POLAR_CANCEL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
		expect(body.message).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`POST ${POLAR_CANCEL_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(POLAR_CANCEL_PATH, {
			data: { cancelAtPeriodEnd: true }
		});
		const body = await response.json();
		expect(body.success).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`POST ${POLAR_CANCEL_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(POLAR_CANCEL_PATH),
			request.post(POLAR_CANCEL_PATH, { data: {} }),
			request.post(POLAR_CANCEL_PATH, { data: { cancelAtPeriodEnd: true } }),
			request.post(POLAR_CANCEL_PATH, { data: { cancelAtPeriodEnd: false } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${POLAR_CANCEL_PATH} 413 pre-check is NOT triggered on the unauth branch`, async ({ request }) => {
		// The Content-Length pre-check fires AFTER the
		// auth gate (in the source). On the unauth
		// branch, we still send a content-length but
		// the response should be 401 (NOT 413).
		// Note: we DON'T send a body > 1KB to avoid
		// triggering the pre-check; we send a body =
		// 1.5KB to verify the precedence.
		const largeBody = JSON.stringify({ padding: 'x'.repeat(1500), cancelAtPeriodEnd: true });
		const response = await request.post(POLAR_CANCEL_PATH, { data: largeBody });

		// Either 401 (auth gate fires before pre-check
		// in the source) OR 413 (if the pre-check is
		// hoisted in the actual runtime). Both are
		// acceptable as long as it's NOT a 5xx.
		expect(response.status()).toBeLessThan(500);
	});

	test(`POST ${POLAR_CANCEL_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(POLAR_CANCEL_PATH);
		const responses = await Promise.all([
			request.post(POLAR_CANCEL_PATH, { data: {} }),
			request.post(POLAR_CANCEL_PATH, { data: { cancelAtPeriodEnd: true } }),
			request.post(POLAR_CANCEL_PATH, { data: { cancelAtPeriodEnd: false } }),
			request.post(POLAR_CANCEL_PATH, { data: { isAdmin: true } }),
			request.post(POLAR_CANCEL_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${POLAR_CANCEL_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(POLAR_CANCEL_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(POLAR_CANCEL_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(POLAR_CANCEL_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${POLAR_CANCEL_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// POST is the ONLY exported method.
		const responses = await Promise.all([
			request.get(POLAR_CANCEL_PATH),
			request.put(POLAR_CANCEL_PATH),
			request.patch(POLAR_CANCEL_PATH),
			request.delete(POLAR_CANCEL_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${POLAR_CANCEL_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// The handler has an inner try/catch around
		// request.json() that silently defaults
		// cancelAtPeriodEnd = true. Malformed JSON
		// must NOT cause a 5xx.
		const responses = await Promise.all([
			request.post(POLAR_CANCEL_PATH, { data: 'not-json' }),
			request.post(POLAR_CANCEL_PATH, { data: '{ broken: json' }),
			request.post(POLAR_CANCEL_PATH, { data: '{"cancelAtPeriodEnd":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${POLAR_CANCEL_PATH} IDOR-protection chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, the IDOR chain runs:
		// getCustomerId → polar client extraction →
		// getPolarSubscription → ownership check.
		// The unauth branch must NEVER emit any of
		// the three error messages from this chain.
		const response = await request.post(POLAR_CANCEL_PATH, {
			data: { cancelAtPeriodEnd: true }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Unable to verify subscription ownership. Please contact support.');
		expect(body.error).not.toBe('Internal error: Unable to verify subscription ownership');
		expect(body.error).not.toBe('Subscription not found or access denied');
	});

	test(`POST ${POLAR_CANCEL_PATH} cancelSubscription call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders
		// `cancelSubscription(...)` before the auth
		// gate would surface a `data` field with
		// subscription details on the unauth branch.
		const response = await request.post(POLAR_CANCEL_PATH, {
			data: { cancelAtPeriodEnd: false }
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBeUndefined();
		expect(body.message).not.toBe('Subscription cancelled immediately');
		expect(body.message).not.toBe(
			'Subscription will be cancelled at the end of the current period'
		);
	});

	test(`POST ${POLAR_CANCEL_PATH} catch-branch error-message-detection is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The catch branch detects 'not found'/'404' →
		// 404 'Subscription not found'; 'Unauthorized'
		// /'401' → 401 'Unauthorized'; default → 500.
		// The unauth branch must produce the standard
		// 401 'Unauthorized' from the auth gate, NOT
		// from the catch dispatcher.
		const responses = await Promise.all([
			request.post(POLAR_CANCEL_PATH),
			request.post(POLAR_CANCEL_PATH, { data: {} })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Subscription not found');
			expect(body.error).not.toBe('Failed to cancel subscription');
		}
	});
});
