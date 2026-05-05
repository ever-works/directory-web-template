import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the LemonSqueezy subscription-reactivate endpoint
 * served by the `POST` export of
 * `apps/web/app/api/lemonsqueezy/reactivate/route.ts`.
 *
 * `POST /api/lemonsqueezy/reactivate` is the
 * **complement** to the
 * [`lemonsqueezy-cancel-body-spec.md`](lemonsqueezy-cancel-body-spec.md)
 * sibling — both routes share the same email-gated
 * auth contract, THREE-key 401 envelope with
 * `code: 'AUTH_REQUIRED'`, Zod `safeParse`
 * validation, and `timestamp` field in the success
 * envelope. The reactivate route differs in:
 *
 *   - **Reactivation-specific metadata:** the
 *     handler calls `updateSubscription({...,
 *     metadata: { action: 'reactivate',
 *     reactivateAction: true, reactivatedAt: <ISO>,
 *     reactivatedBy: session.user.email }})`. The
 *     FIRST per-source-file POST smoke pinning a
 *     **session.user.email-in-metadata contract**
 *     (the user's email is written to provider-side
 *     metadata as `reactivatedBy`).
 *   - **`safeErrorResponse(...)` direct** in catch:
 *     the outer catch is a single line `return
 *     safeErrorResponse(error, 'Failed to
 *     reactivate subscription')`. Distinct from the
 *     sibling cancel route's manual FOUR-key catch
 *     envelope.
 *   - **Static success message** `'Subscription
 *     reactivated successfully'` (no conditional
 *     branch like cancel's `cancelAtPeriodEnd`-
 *     dependent message).
 *
 *   1. **`auth()` session lookup** — `!session?.
 *      user?.email` → 401 `{ error: 'Unauthorized',
 *      message: 'Authentication required', code:
 *      'AUTH_REQUIRED' }` (same THREE-key envelope
 *      as cancel sibling).
 *   2. **JSON body parse** via `await request.json()`
 *      AFTER auth gate.
 *   3. **`reactivateSubscriptionSchema.safeParse
 *      (body)`** — failure → 400 `{ error: 'Invalid
 *      request data', details: <issues>, code:
 *      'VALIDATION_ERROR' }`.
 *   4. **`getOrCreateLemonsqueezyProvider()`
 *      singleton initialization**.
 *   5. **`lemonsqueezy.updateSubscription({
 *      subscriptionId, cancelAtPeriodEnd: false,
 *      metadata: { action, reactivateAction,
 *      reactivatedAt, reactivatedBy } })`** — load-
 *      bearing call. NOTE: writes
 *      `session.user.email` to provider-side
 *      metadata as `reactivatedBy`.
 *   6. **Success payload** — `{ success: true,
 *      data: <result>, message: 'Subscription
 *      reactivated successfully', timestamp:
 *      <ISO> }` with status 200.
 *   7. **Outer catch** — `safeErrorResponse(error,
 *      'Failed to reactivate subscription')` →
 *      typically 500 with the safe-error envelope.
 *   8. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const LEMONSQUEEZY_REACTIVATE_PATH = '/api/lemonsqueezy/reactivate';

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

	// Required-field probe.
	{ data: { otherField: 'X' }, label: 'no subscriptionId' },

	// Valid bodies.
	{ data: { subscriptionId: 'sub_test' }, label: 'valid subscriptionId' },

	// Validation probes.
	{ data: { subscriptionId: '' }, label: 'empty subscriptionId (would 400 (zod) if reachable)' },
	{ data: { subscriptionId: 1 }, label: 'numeric subscriptionId (would 400 (zod) if reachable)' },

	// Bypass attempts.
	{ data: { subscriptionId: 'sub_x', isAdmin: true }, label: 'isAdmin=true bypass attempt' },
	{
		data: { subscriptionId: 'sub_x', reactivatedBy: 'attacker@example.com' },
		label: 'reactivatedBy override (would override session email if reachable)'
	},
	{ data: { subscriptionId: 'X'.repeat(2_000) }, label: 'large padded subscriptionId' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Invalid request data',
	'Subscription reactivated successfully',
	'Failed to reactivate subscription'
] as const;

test.describe('API: /api/lemonsqueezy/reactivate POST body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(LEMONSQUEEZY_REACTIVATE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of BODIES) {
		test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(LEMONSQUEEZY_REACTIVATE_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} returns 401 with the THREE-key Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.post(LEMONSQUEEZY_REACTIVATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			error: 'Unauthorized',
			message: 'Authentication required',
			code: 'AUTH_REQUIRED'
		});
	});

	test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} envelope shape has exactly error / message / code keys`, async ({
		request
	}) => {
		const response = await request.post(LEMONSQUEEZY_REACTIVATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['code', 'error', 'message']);
		expect(body.code).toBe('AUTH_REQUIRED');
		expect(body.success).toBeUndefined();
		expect(body.timestamp).toBeUndefined();
	});

	test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(LEMONSQUEEZY_REACTIVATE_PATH, {
			data: { subscriptionId: 'sub_test' }
		});
		const body = await response.json();
		expect(body.success).toBeUndefined();
		expect(body.data).toBeUndefined();
		expect(body.timestamp).toBeUndefined();
	});

	test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_REACTIVATE_PATH),
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { data: { subscriptionId: 'sub_x' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} does NOT echo VALIDATION_ERROR code on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { data: { subscriptionId: '' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.code).not.toBe('VALIDATION_ERROR');
			expect(body.code).toBe('AUTH_REQUIRED');
		}
	});

	test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} caller-supplied reactivatedBy is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// The handler writes session.user.email to
		// provider-side metadata as `reactivatedBy`.
		// A caller-supplied `reactivatedBy: 'attacker
		// @example.com'` would be IGNORED by the
		// handler but might be echoed if the unauth
		// response leaked the input. Pin that no
		// `attacker@example.com` appears.
		const response = await request.post(LEMONSQUEEZY_REACTIVATE_PATH, {
			data: { subscriptionId: 'sub_x', reactivatedBy: 'attacker@example.com' }
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('attacker@example.com');
	});

	test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.post(LEMONSQUEEZY_REACTIVATE_PATH);
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { data: { subscriptionId: 'sub_x' } }),
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { data: { subscriptionId: 'sub_x', isAdmin: true } }),
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(LEMONSQUEEZY_REACTIVATE_PATH),
			request.put(LEMONSQUEEZY_REACTIVATE_PATH),
			request.patch(LEMONSQUEEZY_REACTIVATE_PATH),
			request.delete(LEMONSQUEEZY_REACTIVATE_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { data: 'not-json' }),
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { data: '{ broken: json' }),
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { data: '{"subscriptionId":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.code).toBe('AUTH_REQUIRED');
		}
	});

	test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} validation chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { data: { subscriptionId: '' } }),
			request.post(LEMONSQUEEZY_REACTIVATE_PATH, { data: { subscriptionId: 1 } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Invalid request data');
			expect(body.details).toBeUndefined();
		}
	});

	test(`POST ${LEMONSQUEEZY_REACTIVATE_PATH} updateSubscription call (with metadata write) is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders
		// `updateSubscription(...)` before the gate
		// would surface a `data` field with subscription
		// details on the unauth branch.
		const response = await request.post(LEMONSQUEEZY_REACTIVATE_PATH, {
			data: { subscriptionId: 'sub_test' }
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBeUndefined();
		expect(body.message).not.toBe('Subscription reactivated successfully');
	});
});
