import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST + PUT body / header
 * surface** of the payment-account create / update
 * endpoint served by the `POST` AND `PUT` exports of
 * `apps/web/app/api/payment/account/route.ts`.
 *
 * `POST + PUT /api/payment/account` is the **first
 * per-source-file dual-method smoke** the docs tree
 * publishes that documents a **Q-010-style NO-AUTH-
 * GATE finding for a non-admin mutating route** —
 * the handler has NO `auth()` call, NO ownership
 * check. ANY caller can create a payment account
 * for ANY `userId` + `customerId` (POST) OR update
 * any payment account by `id` (PUT). See
 * [`docs/questions.md`](../../../docs/questions.md)
 * for the Q-### entry. The smoke spec pins this
 * finding as the CURRENT contract — a future PR that
 * adds auth would explicitly break this spec,
 * prompting an update.
 *
 * Distinct from EVERY prior dual-method smoke:
 *
 *   - **NO `auth()` gate on EITHER method** — the
 *     FIRST per-source-file dual-method smoke
 *     pinning a Q-010-style no-auth-gate finding on
 *     BOTH POST AND PUT exports.
 *   - **NO ownership check** — POST trusts the
 *     caller-supplied `userId` + `customerId`
 *     directly; PUT trusts the caller-supplied `id`.
 *   - **`setupUserPaymentAccount(provider, userId,
 *     customerId)` runs UNCONDITIONALLY** — both
 *     POST and PUT call the same load-bearing DB-
 *     write function (UNIQUE: PUT does NOT check
 *     that the `id` matches an existing record;
 *     it just calls `setupUserPaymentAccount` with
 *     the body fields).
 *   - **THREE-required-field cascade** on POST
 *     (provider, userId, customerId) and **FOUR-
 *     required-field cascade** on PUT (id, provider,
 *     userId, customerId) — each emits a distinct
 *     400 message via individual `if (!field)`
 *     checks. UNIQUE: the FIRST per-source-file
 *     dual-method smoke pinning a per-field
 *     individual-required-check chain.
 *   - **Bare ONE-key 400 envelope** `{ error:
 *     'Field X is required' }` (NO `success` key).
 *   - **Bare ONE-key 500 envelope** `{ error:
 *     'Internal server error' }` (NO `success`
 *     key).
 *   - **Returns raw paymentAccount fields** in
 *     success payload — `{ id, userId, providerId,
 *     customerId, createdAt, updatedAt }` — NO
 *     wrapper envelope (UNIQUE: most success
 *     responses use `{ success: true, data: {...} }`).
 *
 *   1. **POST handler** — NO auth gate; JSON body
 *      parse; required-field cascade (provider,
 *      userId, customerId — each individually
 *      checked, distinct 400 message); load-bearing
 *      `setupUserPaymentAccount(...)` UNCONDITIONAL
 *      DB write; success payload as raw
 *      paymentAccount fields; outer catch 500
 *      `'Internal server error'`.
 *   2. **PUT handler** — NO auth gate; JSON body
 *      parse; required-field cascade (id, provider,
 *      userId, customerId — each individually
 *      checked, distinct 400 message); load-bearing
 *      `setupUserPaymentAccount(...)` UNCONDITIONAL
 *      DB write (NOT an actual update by `id`);
 *      success payload as raw paymentAccount fields;
 *      outer catch 500 `'Internal server error'`.
 *   3. **Method-resolution surface** — the route
 *      exports `POST` AND `PUT`. `GET` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500`
 *      status.
 */
const PAYMENT_ACCOUNT_PATH = '/api/payment/account';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes (handler ignores ALL auth
	// signals — Q-010 finding).
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const POST_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '{}', label: 'empty object body' },

	// Required-field cascade probes.
	{ data: { provider: 'stripe' }, label: 'provider only (missing userId + customerId)' },
	{ data: { provider: 'stripe', userId: 'u' }, label: 'provider + userId (missing customerId)' },
	{
		data: { provider: 'stripe', userId: 'u', customerId: 'c' },
		label: 'all required fields'
	},

	{ data: { provider: 'lemonsqueezy', userId: 'u', customerId: 'c' }, label: 'lemonsqueezy provider' },
	{ data: { provider: 'polar', userId: 'u', customerId: 'c' }, label: 'polar provider' }
] as const;

const PUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '{}', label: 'empty object body' },

	// Required-field cascade probes (PUT has FOUR
	// required fields).
	{ data: { id: 'a' }, label: 'id only (missing rest)' },
	{ data: { id: 'a', provider: 'stripe' }, label: 'id + provider (missing userId + customerId)' },
	{ data: { id: 'a', provider: 'stripe', userId: 'u' }, label: 'three of four (missing customerId)' },
	{
		data: { id: 'a', provider: 'stripe', userId: 'u', customerId: 'c' },
		label: 'all four required fields'
	}
] as const;

test.describe('API: /api/payment/account POST + PUT method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${PAYMENT_ACCOUNT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(PAYMENT_ACCOUNT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`PUT ${PAYMENT_ACCOUNT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.put(PAYMENT_ACCOUNT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of POST_BODIES) {
		test(`POST ${PAYMENT_ACCOUNT_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(PAYMENT_ACCOUNT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PUT_BODIES) {
		test(`PUT ${PAYMENT_ACCOUNT_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.put(PAYMENT_ACCOUNT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${PAYMENT_ACCOUNT_PATH} does NOT return 401 (no auth gate Q-010-style finding)`, async ({
		request
	}) => {
		// CURRENT contract: the handler has NO auth
		// gate. Pin that the response is NOT 401
		// regardless of body — a future PR that adds
		// auth would explicitly break this assertion,
		// prompting an update.
		const response = await request.post(PAYMENT_ACCOUNT_PATH, {
			data: { provider: 'stripe', userId: 'u', customerId: 'c' }
		});
		expect(response.status()).not.toBe(401);
		expect(response.status()).not.toBe(403);
	});

	test(`PUT ${PAYMENT_ACCOUNT_PATH} does NOT return 401 (no auth gate Q-010-style finding)`, async ({
		request
	}) => {
		// Same Q-010 finding on PUT.
		const response = await request.put(PAYMENT_ACCOUNT_PATH, {
			data: { id: 'a', provider: 'stripe', userId: 'u', customerId: 'c' }
		});
		expect(response.status()).not.toBe(401);
		expect(response.status()).not.toBe(403);
	});

	test(`POST ${PAYMENT_ACCOUNT_PATH} treats unauth and authed requests identically (no auth gate)`, async ({
		request
	}) => {
		// Pin the no-auth-gate contract: requests with
		// fabricated session cookies / Authorization
		// headers / X-User-Id headers must produce the
		// SAME status as bare requests.
		const baseline = await request.post(PAYMENT_ACCOUNT_PATH, {
			data: { provider: 'stripe', userId: 'u', customerId: 'c' }
		});
		const responses = await Promise.all([
			request.post(PAYMENT_ACCOUNT_PATH, {
				data: { provider: 'stripe', userId: 'u', customerId: 'c' },
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(PAYMENT_ACCOUNT_PATH, {
				data: { provider: 'stripe', userId: 'u', customerId: 'c' },
				headers: { Authorization: 'Bearer fabricated' }
			}),
			request.post(PAYMENT_ACCOUNT_PATH, {
				data: { provider: 'stripe', userId: 'u', customerId: 'c' },
				headers: { 'X-User-Id': 'fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${PAYMENT_ACCOUNT_PATH} required-field cascade emits canonical 400 messages`, async ({
		request
	}) => {
		// The handler validates fields in order:
		// provider → userId → customerId. Each missing
		// field emits a distinct 400 message.
		const noProvider = await request.post(PAYMENT_ACCOUNT_PATH, { data: {} });
		const noUserId = await request.post(PAYMENT_ACCOUNT_PATH, {
			data: { provider: 'stripe' }
		});
		const noCustomerId = await request.post(PAYMENT_ACCOUNT_PATH, {
			data: { provider: 'stripe', userId: 'u' }
		});

		expect(noProvider.status()).toBe(400);
		expect(noUserId.status()).toBe(400);
		expect(noCustomerId.status()).toBe(400);

		const noProviderBody = await noProvider.json();
		const noUserIdBody = await noUserId.json();
		const noCustomerIdBody = await noCustomerId.json();

		expect(noProviderBody.error).toBe('Provider is required');
		expect(noUserIdBody.error).toBe('User ID is required');
		expect(noCustomerIdBody.error).toBe('Customer ID is required');
	});

	test(`PUT ${PAYMENT_ACCOUNT_PATH} required-field cascade includes 'Account ID is required'`, async ({
		request
	}) => {
		// PUT has FOUR required fields. The id check
		// fires FIRST.
		const noId = await request.put(PAYMENT_ACCOUNT_PATH, { data: {} });
		expect(noId.status()).toBe(400);
		const body = await noId.json();
		expect(body.error).toBe('Account ID is required');
	});

	test(`POST ${PAYMENT_ACCOUNT_PATH} 400 envelope shape has exactly the error key`, async ({
		request
	}) => {
		const response = await request.post(PAYMENT_ACCOUNT_PATH, { data: {} });
		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
	});

	test(`POST ${PAYMENT_ACCOUNT_PATH} cross-method probe (GET / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// The route exports POST + PUT. GET / PATCH /
		// DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.get(PAYMENT_ACCOUNT_PATH),
			request.patch(PAYMENT_ACCOUNT_PATH),
			request.delete(PAYMENT_ACCOUNT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${PAYMENT_ACCOUNT_PATH} catch-branch generic 500 message is NOT echoed for malformed bodies`, async ({
		request
	}) => {
		// The catch returns 500 with `'Internal server
		// error'`. For a non-existent userId / provider
		// the DB call may fail. Pin that the response
		// does NOT 5xx.
		const response = await request.post(PAYMENT_ACCOUNT_PATH, {
			data: { provider: 'stripe', userId: '__not-real__', customerId: '__not-real__' }
		});

		expect(response.status()).toBeLessThan(500);
	});
});
