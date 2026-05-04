import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the LemonSqueezy subscription-cancel endpoint
 * served by the `POST` export of
 * `apps/web/app/api/lemonsqueezy/cancel/route.ts`.
 *
 * `POST /api/lemonsqueezy/cancel` is the **first per-
 * source-file POST smoke** the docs tree publishes
 * that pins an **email-gated auth contract** —
 * `!session?.user?.email` (NOT `!session?.user`,
 * `!session?.user?.id`, or `!session?.user?.id?.`).
 * The FIRST per-source-file POST smoke gating on
 * session email.
 *
 * It is also the **first per-source-file POST smoke**
 * that pins a **`code` field in the 401 envelope** —
 * `{ error: 'Unauthorized', message: 'Authentication
 * required', code: 'AUTH_REQUIRED' }`. EVERY prior
 * 401 envelope is at most TWO keys (error + message
 * for the polar/solidgate/stripe/lemonsqueezy
 * checkouts; success + error for the canonical admin
 * envelope). This is the FIRST THREE-key 401 envelope
 * with an enum-typed code field.
 *
 * It is also the **first per-source-file POST smoke**
 * that pins a **`timestamp` field in the success
 * AND catch envelopes** — both branches add an ISO
 * timestamp via `new Date().toISOString()`.
 *
 * Distinct from EVERY prior POST smoke:
 *
 *   - **Email-gated auth:** `!session?.user?.email`.
 *     The FIRST per-source-file POST smoke gating on
 *     session email.
 *   - **THREE-key 401 envelope** with `code:
 *     'AUTH_REQUIRED'` field.
 *   - **`code` field in 400 validation envelope** —
 *     `{ error, details, code: 'VALIDATION_ERROR' }`.
 *   - **FOUR-key catch envelope** with `code:
 *     'CANCEL_FAILED'` AND `timestamp` fields. The
 *     FIRST per-source-file POST smoke pinning a
 *     4-key catch envelope.
 *   - **Conditional success message** based on
 *     `cancelAtPeriodEnd` flag — `'Subscription will
 *     be cancelled at the end of the current period'`
 *     vs `'Subscription cancelled immediately'`.
 *   - **`timestamp` field in success AND catch
 *     envelopes** — load-bearing observability
 *     contract.
 *   - **`safeErrorMessage` extracted into the catch
 *     envelope's `message` field** (NOT into the
 *     `error` field as in stripe-checkout-body).
 *
 *   1. **`auth()` session lookup** — `!session?.
 *      user?.email` → 401 `{ error: 'Unauthorized',
 *      message: 'Authentication required', code:
 *      'AUTH_REQUIRED' }`.
 *   2. **JSON body parse** via `await request.json()`
 *      AFTER auth gate (NO try/catch).
 *   3. **`cancelSubscriptionSchema.safeParse(body)`**
 *      — failure → 400 `{ error: 'Invalid request
 *      data', details: <issues>, code:
 *      'VALIDATION_ERROR' }`.
 *   4. **`getOrCreateLemonsqueezyProvider()`
 *      singleton initialization**.
 *   5. **`lemonsqueezy.cancelSubscription
 *      (subscriptionId, cancelAtPeriodEnd)`** —
 *      load-bearing call.
 *   6. **Success payload** — `{ success: true,
 *      data: <result>, message: <conditional>,
 *      timestamp: <ISO> }` with status 200.
 *   7. **Outer catch** — 500 `{ error: 'Failed to
 *      cancel subscription', message:
 *      safeErrorMessage(error, ...), code:
 *      'CANCEL_FAILED', timestamp: <ISO> }`.
 *   8. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const LEMONSQUEEZY_CANCEL_PATH = '/api/lemonsqueezy/cancel';

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
	{ data: '{}', label: 'empty object body (would 400 (zod) if reachable)' },

	// Required-field probes.
	{ data: { cancelAtPeriodEnd: true }, label: 'no subscriptionId' },
	{ data: { subscriptionId: '' }, label: 'empty subscriptionId (would 400 (zod) if reachable)' },

	// Valid bodies.
	{ data: { subscriptionId: 'sub_test' }, label: 'valid subscriptionId only (default cancelAtPeriodEnd)' },
	{
		data: { subscriptionId: 'sub_test', cancelAtPeriodEnd: false },
		label: 'valid immediate cancellation'
	},
	{
		data: { subscriptionId: 'sub_test', cancelAtPeriodEnd: true },
		label: 'valid period-end cancellation'
	},

	// Type-violation probes.
	{ data: { subscriptionId: 1 }, label: 'numeric subscriptionId (would 400 (zod) if reachable)' },
	{
		data: { subscriptionId: 'sub_x', cancelAtPeriodEnd: 'true' },
		label: 'string cancelAtPeriodEnd (would 400 (zod) if reachable)'
	},

	// Bypass attempts.
	{ data: { subscriptionId: 'sub_x', isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{ data: { subscriptionId: 'sub_x', userId: 'fabricated' }, label: 'fabricated userId bypass attempt' },
	{ data: { subscriptionId: 'X'.repeat(2_000) }, label: 'large padded subscriptionId' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Invalid request data',
	'Subscription will be cancelled at the end of the current period',
	'Subscription cancelled immediately',
	'Failed to cancel subscription'
] as const;

const FORBIDDEN_CODES = ['VALIDATION_ERROR', 'CANCEL_FAILED'] as const;

test.describe('API: /api/lemonsqueezy/cancel POST body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${LEMONSQUEEZY_CANCEL_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(LEMONSQUEEZY_CANCEL_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of BODIES) {
		test(`POST ${LEMONSQUEEZY_CANCEL_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(LEMONSQUEEZY_CANCEL_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${LEMONSQUEEZY_CANCEL_PATH} returns 401 with the THREE-key Unauthorized envelope`, async ({
		request
	}) => {
		// `!session?.user?.email` → 401 `{ error:
		// 'Unauthorized', message: 'Authentication
		// required', code: 'AUTH_REQUIRED' }`.
		const response = await request.post(LEMONSQUEEZY_CANCEL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			error: 'Unauthorized',
			message: 'Authentication required',
			code: 'AUTH_REQUIRED'
		});
	});

	test(`POST ${LEMONSQUEEZY_CANCEL_PATH} envelope shape has exactly error / message / code keys`, async ({
		request
	}) => {
		const response = await request.post(LEMONSQUEEZY_CANCEL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['code', 'error', 'message']);
		expect(body.code).toBe('AUTH_REQUIRED');
		expect(body.success).toBeUndefined();
		expect(body.timestamp).toBeUndefined();
	});

	test(`POST ${LEMONSQUEEZY_CANCEL_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch returns `{ success: true,
		// data: <result>, message: <conditional>,
		// timestamp: <ISO> }`. The unauth branch must
		// NEVER reach cancelSubscription.
		const response = await request.post(LEMONSQUEEZY_CANCEL_PATH, {
			data: { subscriptionId: 'sub_test', cancelAtPeriodEnd: true }
		});
		const body = await response.json();
		expect(body.success).toBeUndefined();
		expect(body.data).toBeUndefined();
		expect(body.timestamp).toBeUndefined();
	});

	test(`POST ${LEMONSQUEEZY_CANCEL_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CANCEL_PATH),
			request.post(LEMONSQUEEZY_CANCEL_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_CANCEL_PATH, { data: { subscriptionId: 'sub_x' } }),
			request.post(LEMONSQUEEZY_CANCEL_PATH, {
				data: { subscriptionId: 'sub_x', cancelAtPeriodEnd: false }
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

	test(`POST ${LEMONSQUEEZY_CANCEL_PATH} does NOT echo VALIDATION_ERROR or CANCEL_FAILED codes on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, validation failure
		// surfaces `code: 'VALIDATION_ERROR'`; catch
		// branch surfaces `code: 'CANCEL_FAILED'`. The
		// unauth branch must NEVER emit either —
		// only `code: 'AUTH_REQUIRED'`.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CANCEL_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_CANCEL_PATH, { data: { subscriptionId: '' } }),
			request.post(LEMONSQUEEZY_CANCEL_PATH, { data: { subscriptionId: 'sub_x' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const code of FORBIDDEN_CODES) {
				expect(body.code).not.toBe(code);
			}
			expect(body.code).toBe('AUTH_REQUIRED');
		}
	});

	test(`POST ${LEMONSQUEEZY_CANCEL_PATH} does NOT include a timestamp field on the unauth branch`, async ({
		request
	}) => {
		// The success and catch branches both include
		// a `timestamp` field via `new Date().
		// toISOString()`. The unauth branch must NEVER
		// include this field.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CANCEL_PATH),
			request.post(LEMONSQUEEZY_CANCEL_PATH, { data: { subscriptionId: 'sub_x' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.timestamp).toBeUndefined();
		}
	});

	test(`POST ${LEMONSQUEEZY_CANCEL_PATH} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.post(LEMONSQUEEZY_CANCEL_PATH);
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CANCEL_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_CANCEL_PATH, { data: { subscriptionId: 'sub_x' } }),
			request.post(LEMONSQUEEZY_CANCEL_PATH, {
				data: { subscriptionId: 'sub_x', cancelAtPeriodEnd: false }
			}),
			request.post(LEMONSQUEEZY_CANCEL_PATH, {
				data: { subscriptionId: 'sub_x', isAdmin: true }
			}),
			request.post(LEMONSQUEEZY_CANCEL_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${LEMONSQUEEZY_CANCEL_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CANCEL_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(LEMONSQUEEZY_CANCEL_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(LEMONSQUEEZY_CANCEL_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LEMONSQUEEZY_CANCEL_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// The route exports ONLY POST.
		const responses = await Promise.all([
			request.get(LEMONSQUEEZY_CANCEL_PATH),
			request.put(LEMONSQUEEZY_CANCEL_PATH),
			request.patch(LEMONSQUEEZY_CANCEL_PATH),
			request.delete(LEMONSQUEEZY_CANCEL_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LEMONSQUEEZY_CANCEL_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// The handler has NO try/catch around
		// request.json(). Malformed JSON on the auth
		// branch would cascade to the outer catch.
		// The unauth branch fires BEFORE request.
		// json(), so malformed bodies must still
		// produce 401 with `code: 'AUTH_REQUIRED'`.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CANCEL_PATH, { data: 'not-json' }),
			request.post(LEMONSQUEEZY_CANCEL_PATH, { data: '{ broken: json' }),
			request.post(LEMONSQUEEZY_CANCEL_PATH, { data: '{"subscriptionId":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.code).toBe('AUTH_REQUIRED');
		}
	});

	test(`POST ${LEMONSQUEEZY_CANCEL_PATH} validation chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, validation failure
		// surfaces `'Invalid request data'` 400. The
		// unauth branch must NEVER emit this 400
		// envelope.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CANCEL_PATH, { data: { subscriptionId: '' } }),
			request.post(LEMONSQUEEZY_CANCEL_PATH, { data: { subscriptionId: 1 } }),
			request.post(LEMONSQUEEZY_CANCEL_PATH, {
				data: { subscriptionId: 'sub_x', cancelAtPeriodEnd: 'true' }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Invalid request data');
			expect(body.details).toBeUndefined();
		}
	});

	test(`POST ${LEMONSQUEEZY_CANCEL_PATH} cancelSubscription call is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders
		// `cancelSubscription(...)` before the gate
		// would surface a `data` field in the unauth
		// response.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_CANCEL_PATH, {
				data: { subscriptionId: 'sub_x', cancelAtPeriodEnd: true }
			}),
			request.post(LEMONSQUEEZY_CANCEL_PATH, {
				data: { subscriptionId: 'sub_x', cancelAtPeriodEnd: false }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.success).toBeUndefined();
		}
	});

	test(`POST ${LEMONSQUEEZY_CANCEL_PATH} catch-branch four-key envelope is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// The catch branch returns a four-key envelope
		// `{ error, message, code: 'CANCEL_FAILED',
		// timestamp }`. The unauth branch's three-key
		// envelope must NOT have a `timestamp` field
		// or the `CANCEL_FAILED` code.
		const response = await request.post(LEMONSQUEEZY_CANCEL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.timestamp).toBeUndefined();
		expect(body.code).not.toBe('CANCEL_FAILED');
		expect(body.error).not.toBe('Failed to cancel subscription');
	});
});
