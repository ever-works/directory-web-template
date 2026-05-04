import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Polar subscription-reactivate endpoint served
 * by the `POST` export of
 * `apps/web/app/api/polar/subscription/[subscriptionId]/reactivate/route.ts`.
 *
 * `POST /api/polar/subscription/[subscriptionId]/
 * reactivate` is the **first per-source-file POST
 * smoke** the docs tree publishes that pins a
 * **THREE-string error-message-detection catch** —
 * the outer catch dispatches to:
 *
 *   - 404 `'Subscription not found'` if `error.
 *     message.includes('not found') || ... '404'`.
 *   - 401 `'Unauthorized'` if `error.message.
 *     includes('Unauthorized') || ... '401'`.
 *   - **400** `'Subscription is not scheduled for
 *     cancellation'` if `error.message.includes
 *     ('not scheduled for cancellation')` — the
 *     **FIRST per-source-file POST smoke** pinning
 *     a **400 from the catch dispatcher** (NOT
 *     from a schema validation step). EVERY prior
 *     POST smoke that pins a 400 does so via Zod
 *     `safeParse`; this is the FIRST 400 minted
 *     from the catch's substring-detection on a
 *     business-rule violation.
 *
 * It is also the **first per-source-file POST smoke**
 * that pins a **NO-BODY POST handler** — the
 * handler does NOT call `request.json()` at all.
 * `cancelAtPeriodEnd` is irrelevant; the handler
 * unconditionally calls `polarProvider.
 * reactivateSubscription(subscriptionId)`. EVERY
 * prior POST smoke either parses the body
 * (lemonsqueezy, polar/cancel, stripe/checkout)
 * OR explicitly extracts a header (sponsor-ads).
 * This is the FIRST per-source-file POST smoke
 * pinning a body-less POST contract.
 *
 * Distinct from EVERY prior POST smoke:
 *
 *   - **NO body parsing** — `request.json()` is
 *     never called.
 *   - **NO Content-Length 413 pre-check** (distinct
 *     from polar/cancel sibling which DOES pin a
 *     413 pre-check).
 *   - **THREE-string catch dispatcher** —
 *     `'not found'`/`'404'` → 404; `'Unauthorized'`/
 *     `'401'` → 401; **`'not scheduled for
 *     cancellation'` → 400** (the new 400 contract).
 *   - **Static success message** `'Subscription
 *     reactivated successfully'` (NOT conditional
 *     based on a body flag, distinct from polar/
 *     cancel and lemonsqueezy/cancel siblings).
 *   - **Same IDOR-protection chain** as polar/cancel
 *     sibling — `getCustomerId` → 403, private
 *     `(polarProvider as any).polar` extraction →
 *     500, `getPolarSubscription` ownership check →
 *     merged 404.
 *
 *   1. **`auth()` session lookup** — `!session?.user`
 *      → 401 `{ error: 'Unauthorized' }` (bare
 *      envelope).
 *   2. **`{ subscriptionId }` param resolution** via
 *      dynamic-segment route.
 *   3. **IDOR-protection chain:**
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
 *   4. **`polarProvider.reactivateSubscription
 *      (subscriptionId)`** — load-bearing call
 *      with NO body-driven flags.
 *   5. **Success payload** — `{ success: true,
 *      data: { id, status, cancelAtPeriodEnd,
 *      currentPeriodEnd, priceId, customerId },
 *      message: 'Subscription reactivated
 *      successfully' }` with status 200.
 *   6. **THREE-string error-message-detection
 *      catch** dispatching to 404 / 401 / 400 / 500
 *      via `safeErrorResponse(...)`.
 *   7. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const NON_EXISTENT_SUB_ID = '__definitely-not-a-real-polar-subscription-id__';
const POLAR_REACTIVATE_PATH = `/api/polar/subscription/${NON_EXISTENT_SUB_ID}/reactivate`;

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
	{ data: undefined as unknown, label: 'no body (handler ignores body entirely)' },
	{ data: '', label: 'empty string body (ignored)' },
	{ data: '{}', label: 'empty object body (ignored)' },

	// The handler does NOT parse the body. ANY shape
	// must round-trip identically.
	{ data: { cancelAtPeriodEnd: true }, label: 'cancelAtPeriodEnd: true (ignored)' },
	{ data: { cancelAtPeriodEnd: false }, label: 'cancelAtPeriodEnd: false (ignored)' },

	// Bypass attempts (handler does NOT branch on
	// body, so all bypass attempts are no-ops).
	{ data: { isAdmin: true }, label: 'isAdmin=true bypass attempt (ignored)' },
	{ data: { customerId: 'cus_attacker' }, label: 'fabricated customerId attempt (ignored)' },
	{ data: { subscriptionId: 'sub_other' }, label: 'fabricated subscriptionId in body (ignored — path wins)' },
	{ data: { padding: 'x'.repeat(500) }, label: 'mid-padded body (ignored)' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Unable to verify subscription ownership. Please contact support.',
	'Internal error: Unable to verify subscription ownership',
	'Subscription not found or access denied',
	'Subscription reactivated successfully',
	'Subscription is not scheduled for cancellation',
	'Failed to reactivate subscription',
	'Subscription not found'
] as const;

test.describe('API: /api/polar/subscription/[subscriptionId]/reactivate POST body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${POLAR_REACTIVATE_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(POLAR_REACTIVATE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of BODIES) {
		test(`POST ${POLAR_REACTIVATE_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(POLAR_REACTIVATE_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${POLAR_REACTIVATE_PATH} returns 401 with the bare Unauthorized envelope`, async ({ request }) => {
		// `!session?.user` → 401 `{ error:
		// 'Unauthorized' }` (bare envelope).
		const response = await request.post(POLAR_REACTIVATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test(`POST ${POLAR_REACTIVATE_PATH} envelope shape has exactly one error key`, async ({ request }) => {
		const response = await request.post(POLAR_REACTIVATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
		expect(body.message).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`POST ${POLAR_REACTIVATE_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(POLAR_REACTIVATE_PATH, {
			data: { cancelAtPeriodEnd: false }
		});
		const body = await response.json();
		expect(body.success).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`POST ${POLAR_REACTIVATE_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(POLAR_REACTIVATE_PATH),
			request.post(POLAR_REACTIVATE_PATH, { data: {} }),
			request.post(POLAR_REACTIVATE_PATH, { data: { cancelAtPeriodEnd: false } }),
			request.post(POLAR_REACTIVATE_PATH, { data: { customerId: 'cus_attacker' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${POLAR_REACTIVATE_PATH} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.post(POLAR_REACTIVATE_PATH);
		const responses = await Promise.all([
			request.post(POLAR_REACTIVATE_PATH, { data: {} }),
			request.post(POLAR_REACTIVATE_PATH, { data: { cancelAtPeriodEnd: true } }),
			request.post(POLAR_REACTIVATE_PATH, { data: { cancelAtPeriodEnd: false } }),
			request.post(POLAR_REACTIVATE_PATH, { data: { isAdmin: true } }),
			request.post(POLAR_REACTIVATE_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${POLAR_REACTIVATE_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(POLAR_REACTIVATE_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(POLAR_REACTIVATE_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(POLAR_REACTIVATE_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${POLAR_REACTIVATE_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// POST is the ONLY exported method.
		const responses = await Promise.all([
			request.get(POLAR_REACTIVATE_PATH),
			request.put(POLAR_REACTIVATE_PATH),
			request.patch(POLAR_REACTIVATE_PATH),
			request.delete(POLAR_REACTIVATE_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${POLAR_REACTIVATE_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// The handler does NOT parse the body at all
		// (no `request.json()` call). Malformed JSON
		// must NOT cause a 5xx — the body is ignored
		// upstream of the auth gate.
		const responses = await Promise.all([
			request.post(POLAR_REACTIVATE_PATH, { data: 'not-json' }),
			request.post(POLAR_REACTIVATE_PATH, { data: '{ broken: json' }),
			request.post(POLAR_REACTIVATE_PATH, { data: '{"cancelAtPeriodEnd":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${POLAR_REACTIVATE_PATH} IDOR-protection chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, the IDOR chain runs:
		// getCustomerId → polar client extraction →
		// getPolarSubscription → ownership check.
		// The unauth branch must NEVER emit any of
		// the three error messages from this chain.
		const response = await request.post(POLAR_REACTIVATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Unable to verify subscription ownership. Please contact support.');
		expect(body.error).not.toBe('Internal error: Unable to verify subscription ownership');
		expect(body.error).not.toBe('Subscription not found or access denied');
	});

	test(`POST ${POLAR_REACTIVATE_PATH} reactivateSubscription call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders
		// `reactivateSubscription(...)` before the
		// auth gate would surface a `data` field
		// with subscription details on the unauth
		// branch.
		const response = await request.post(POLAR_REACTIVATE_PATH);
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBeUndefined();
		expect(body.message).not.toBe('Subscription reactivated successfully');
	});

	test(`POST ${POLAR_REACTIVATE_PATH} catch-branch THREE-string dispatcher is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The catch branch detects:
		//   - 'not found'/'404' → 404
		//     'Subscription not found'.
		//   - 'Unauthorized'/'401' → 401
		//     'Unauthorized'.
		//   - 'not scheduled for cancellation' → 400
		//     'Subscription is not scheduled for
		//     cancellation' (the new 400 contract).
		// The unauth branch must produce the standard
		// 401 'Unauthorized' from the auth gate, NOT
		// from the catch dispatcher.
		const responses = await Promise.all([
			request.post(POLAR_REACTIVATE_PATH),
			request.post(POLAR_REACTIVATE_PATH, { data: {} })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Subscription not found');
			expect(body.error).not.toBe('Subscription is not scheduled for cancellation');
			expect(body.error).not.toBe('Failed to reactivate subscription');
		}
	});

	test(`POST ${POLAR_REACTIVATE_PATH} 400 catch-dispatcher contract is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The 400 'Subscription is not scheduled for
		// cancellation' contract is the FIRST per-
		// source-file POST smoke pinning a 400 minted
		// from the catch's substring-detection on a
		// business-rule violation. On the unauth
		// branch, no body permutation can flip this
		// contract on.
		const responses = await Promise.all([
			request.post(POLAR_REACTIVATE_PATH, { data: { cancelAtPeriodEnd: false } }),
			request.post(POLAR_REACTIVATE_PATH, { data: { force: true } }),
			request.post(POLAR_REACTIVATE_PATH, { data: { reactivate: true } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Subscription is not scheduled for cancellation');
		}
	});

	test(`POST ${POLAR_REACTIVATE_PATH} body is COMPLETELY ignored on the unauth branch`, async ({ request }) => {
		// The handler does NOT call request.json().
		// EVERY body permutation must produce the
		// EXACT same status AND envelope.
		const baseline = await request.post(POLAR_REACTIVATE_PATH);
		const baselineBody = await baseline.json();

		const responses = await Promise.all([
			request.post(POLAR_REACTIVATE_PATH, { data: { cancelAtPeriodEnd: true } }),
			request.post(POLAR_REACTIVATE_PATH, { data: { cancelAtPeriodEnd: false } }),
			request.post(POLAR_REACTIVATE_PATH, { data: { force: true } }),
			request.post(POLAR_REACTIVATE_PATH, { data: 'not-json' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});
});
