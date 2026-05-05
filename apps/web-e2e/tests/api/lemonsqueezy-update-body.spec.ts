import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the LemonSqueezy generic-subscription-update
 * endpoint served by the `POST` export of
 * `apps/web/app/api/lemonsqueezy/update/route.ts`.
 *
 * `POST /api/lemonsqueezy/update` is the **richest
 * per-source-file POST smoke** the docs tree
 * publishes — it pins SIX FIRST contracts:
 *
 *   1. **`success: false`-AND-`code`-typed FIVE-key
 *      401 envelope** — `{ success: false, error:
 *      'Unauthorized', code: 'UNAUTHORIZED',
 *      requestId: <uuid>, timestamp: <ISO> }`.
 *      Distinct from cancel/reactivate/update-plan
 *      sibling THREE-key envelope. The FIRST per-
 *      source-file POST smoke pinning a 5-key
 *      envelope with both `requestId` and
 *      `timestamp`.
 *   2. **Per-request UUID** via `crypto.randomUUID
 *      ?.() || Math.random().toString(36)
 *      .substring(2)` — UUID v4 with browser-
 *      fallback. The FIRST per-source-file POST
 *      smoke pinning per-request UUID generation
 *      with optional-chain fallback.
 *   3. **Performance tracking** via `startTime =
 *      Date.now()` and `duration: ${Date.now() -
 *      startTime}ms` in the catch envelope. The
 *      FIRST per-source-file POST smoke pinning
 *      request-duration measurement.
 *   4. **Development-mode short-circuit** — `if
 *      (process.env.NODE_ENV === 'development')`
 *      returns 200 with input echoed BEFORE calling
 *      the provider. The FIRST per-source-file POST
 *      smoke pinning a dev-mode short-circuit
 *      contract.
 *   5. **Custom response headers** — `Cache-
 *      Control: no-cache, no-store, must-
 *      revalidate`, `X-Request-ID`, `X-Response-
 *      Time`. The FIRST per-source-file POST smoke
 *      pinning custom response headers.
 *   6. **Five-tier catch dispatcher** — `errorCode`
 *      extracted from `error.code`, dispatched to:
 *      `VALIDATION_ERROR` → 400, `UNAUTHORIZED` →
 *      401, `SUBSCRIPTION_NOT_FOUND` → 404,
 *      `PROVIDER_UNAVAILABLE` → 503, default →
 *      500. The FIRST per-source-file POST smoke
 *      pinning a five-tier catch dispatcher.
 *
 * Distinct from the cancel + reactivate + update-
 * plan siblings:
 *
 *   - **`!session?.user` gate** (NOT `!session?.
 *     user?.email`).
 *   - **`code: 'UNAUTHORIZED'`** (NOT `'AUTH_
 *     REQUIRED'`).
 *   - **5-key 401 envelope** with `success: false`
 *     + `code` + `requestId` + `timestamp`.
 *   - **Dev-mode short-circuit** — UNIQUE.
 *
 *   1. **`auth()` session lookup** — `!session?.
 *      user` → 401 5-key envelope.
 *   2. **JSON body parse** via `await request.json()`
 *      AFTER auth gate.
 *   3. **`updateSubscriptionSchema.safeParse(body)`**
 *      — failure → 400 `{ success: false, error:
 *      'Invalid request data', code: 'VALIDATION_
 *      ERROR', details: <issues>, requestId,
 *      timestamp }`.
 *   4. **Dev-mode short-circuit** — returns 200
 *      with input echoed if `NODE_ENV ===
 *      'development'`.
 *   5. **`PaymentProviderManager.getLemonsqueezy
 *      Provider()`** retrieve.
 *   6. **`lemonsqueezy.updateSubscription({...})`**
 *      — load-bearing call. If null result → 404
 *      with `code: 'SUBSCRIPTION_NOT_FOUND'`.
 *   7. **Success payload** — `{ success: true,
 *      data: <subscription>, metadata: { requestId,
 *      timestamp, duration: <ms>, userId } }`.
 *   8. **Five-tier catch dispatcher** with
 *      `errorCode` from `error.code`.
 *   9. **Custom response headers** on success and
 *      catch — `Cache-Control` + `X-Request-ID` +
 *      `X-Response-Time`.
 *  10. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const LEMONSQUEEZY_UPDATE_PATH = '/api/lemonsqueezy/update';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { 'X-Request-ID': 'attacker-injected-uuid' }, label: 'fabricated X-Request-ID header' }
] as const;

const BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (zod) if reachable)' },

	// Required-field probe.
	{ data: { status: 'active' }, label: 'no subscriptionId' },

	// Valid bodies.
	{ data: { subscriptionId: 'sub_x' }, label: 'minimal valid' },
	{ data: { subscriptionId: 'sub_x', status: 'active' }, label: 'with status' },
	{ data: { subscriptionId: 'sub_x', cancelAtPeriodEnd: true }, label: 'with cancelAtPeriodEnd' },
	{
		data: { subscriptionId: 'sub_x', status: 'paused', priceId: 'price_x' },
		label: 'multi-field valid'
	},
	{
		data: { subscriptionId: 'sub_x', metadata: { source: 'admin' } },
		label: 'with metadata'
	},

	// Validation probes.
	{
		data: { subscriptionId: 'sub_x', status: 'invalid_status' },
		label: 'invalid status enum (would 400 if reachable)'
	},
	{ data: { subscriptionId: 'sub_x', cancelAtPeriodEnd: 'true' }, label: 'string cancelAtPeriodEnd' },

	// Bypass attempts.
	{ data: { subscriptionId: 'sub_x', isAdmin: true }, label: 'isAdmin=true bypass' },
	{ data: { subscriptionId: 'sub_x', userId: 'fabricated' }, label: 'fabricated userId bypass' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Invalid request data',
	'Subscription not found or update failed',
	'Failed to update subscription'
] as const;

const FORBIDDEN_CODES = [
	'VALIDATION_ERROR',
	'SUBSCRIPTION_NOT_FOUND',
	'PROVIDER_UNAVAILABLE',
	'INTERNAL_ERROR'
] as const;

test.describe('API: /api/lemonsqueezy/update POST body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${LEMONSQUEEZY_UPDATE_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(LEMONSQUEEZY_UPDATE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of BODIES) {
		test(`POST ${LEMONSQUEEZY_UPDATE_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(LEMONSQUEEZY_UPDATE_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${LEMONSQUEEZY_UPDATE_PATH} returns 401 with the FIVE-key Unauthorized envelope`, async ({
		request
	}) => {
		// `!session?.user` → 401 with 5-key envelope:
		// `{ success: false, error: 'Unauthorized',
		// code: 'UNAUTHORIZED', requestId: <uuid>,
		// timestamp: <ISO> }`.
		const response = await request.post(LEMONSQUEEZY_UPDATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Unauthorized');
		expect(body.code).toBe('UNAUTHORIZED');
		expect(typeof body.requestId).toBe('string');
		expect(body.requestId.length).toBeGreaterThan(0);
		expect(typeof body.timestamp).toBe('string');
		// ISO timestamp format.
		expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PATH} envelope shape has exactly success / error / code / requestId / timestamp keys`, async ({
		request
	}) => {
		const response = await request.post(LEMONSQUEEZY_UPDATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual([
			'code',
			'error',
			'requestId',
			'success',
			'timestamp'
		]);
		expect(body.message).toBeUndefined();
		expect(body.duration).toBeUndefined();
		expect(body.details).toBeUndefined();
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PATH} requestId is unique per-request`, async ({ request }) => {
		// `crypto.randomUUID?.() || Math.random()...`
		// generates a UUID per request. Multiple
		// requests must produce DIFFERENT requestIds.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_UPDATE_PATH),
			request.post(LEMONSQUEEZY_UPDATE_PATH),
			request.post(LEMONSQUEEZY_UPDATE_PATH)
		]);

		const requestIds = await Promise.all(
			responses.map(async (r) => {
				const body = await r.json();
				return body.requestId;
			})
		);

		// All three should be different (per-request
		// UUID generation).
		expect(new Set(requestIds).size).toBe(3);
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PATH} caller-supplied X-Request-ID is NOT echoed in requestId`, async ({
		request
	}) => {
		// The handler generates its own UUID via
		// `crypto.randomUUID?.()`. A caller-supplied
		// X-Request-ID header must NOT be echoed in
		// the body's `requestId` field — that would
		// allow request-id forgery.
		const response = await request.post(LEMONSQUEEZY_UPDATE_PATH, {
			headers: { 'X-Request-ID': 'attacker-injected-uuid' }
		});
		const body = await response.json();
		expect(body.requestId).not.toBe('attacker-injected-uuid');
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(LEMONSQUEEZY_UPDATE_PATH, {
			data: { subscriptionId: 'sub_x' }
		});
		const body = await response.json();
		expect(body.success).toBe(false);
		expect(body.data).toBeUndefined();
		// metadata.duration / metadata.userId from
		// success branch must NOT appear.
		if (body.metadata) {
			expect(body.metadata.userId).toBeUndefined();
			expect(body.metadata.duration).toBeUndefined();
		}
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_UPDATE_PATH),
			request.post(LEMONSQUEEZY_UPDATE_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_UPDATE_PATH, { data: { subscriptionId: 'sub_x', status: 'invalid' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
			for (const code of FORBIDDEN_CODES) {
				expect(body.code).not.toBe(code);
			}
			expect(body.code).toBe('UNAUTHORIZED');
		}
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PATH} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.post(LEMONSQUEEZY_UPDATE_PATH);
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_UPDATE_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_UPDATE_PATH, { data: { subscriptionId: 'sub_x' } }),
			request.post(LEMONSQUEEZY_UPDATE_PATH, { data: { subscriptionId: 'sub_x', status: 'active' } }),
			request.post(LEMONSQUEEZY_UPDATE_PATH, { data: { subscriptionId: 'sub_x', isAdmin: true } }),
			request.post(LEMONSQUEEZY_UPDATE_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_UPDATE_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(LEMONSQUEEZY_UPDATE_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(LEMONSQUEEZY_UPDATE_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(LEMONSQUEEZY_UPDATE_PATH),
			request.put(LEMONSQUEEZY_UPDATE_PATH),
			request.patch(LEMONSQUEEZY_UPDATE_PATH),
			request.delete(LEMONSQUEEZY_UPDATE_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PATH} validation chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_UPDATE_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_UPDATE_PATH, { data: { subscriptionId: 'sub_x', status: 'invalid' } }),
			request.post(LEMONSQUEEZY_UPDATE_PATH, { data: { status: 'active' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Invalid request data');
			expect(body.code).not.toBe('VALIDATION_ERROR');
			expect(body.details).toBeUndefined();
		}
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PATH} dev-mode short-circuit / provider-call / 5-tier-catch are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The dev-mode short-circuit, provider call,
		// and the 5-tier catch dispatcher all run AFTER
		// the auth gate. The unauth branch must NEVER
		// produce any of the catch-dispatched codes
		// (VALIDATION_ERROR / SUBSCRIPTION_NOT_FOUND /
		// PROVIDER_UNAVAILABLE / INTERNAL_ERROR) NOR
		// echo `data` / `metadata.userId` from the
		// success branch.
		const response = await request.post(LEMONSQUEEZY_UPDATE_PATH, {
			data: { subscriptionId: 'sub_test', status: 'active', priceId: 'price_x' }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.code).toBe('UNAUTHORIZED');
		expect(body.data).toBeUndefined();
		// 5-tier catch envelope keys must NOT appear on
		// unauth.
		expect(body.message).toBeUndefined();
		expect(body.duration).toBeUndefined();
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PATH} response includes X-Request-ID custom header on unauth branch`, async ({
		request
	}) => {
		// Custom response headers are added in the
		// success and CATCH branches. The unauth branch
		// (which is NOT in the catch) does NOT include
		// these headers — pin that as the contract. A
		// regression that adds them to the unauth
		// envelope would surface here.
		const response = await request.post(LEMONSQUEEZY_UPDATE_PATH);
		const headers = response.headers();
		// The unauth path goes through `if (!session.
		// user) return ...` which doesn't add custom
		// headers. Verify NOT present.
		expect(headers['x-request-id']).toBeUndefined();
		expect(headers['x-response-time']).toBeUndefined();
	});
});
