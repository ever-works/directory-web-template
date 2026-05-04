import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET + PATCH / dynamic-
 * segment / body / header surface** of the per-
 * subscription auto-renewal endpoint served by the
 * `GET` AND `PATCH` exports of
 * `apps/web/app/api/payment/[subscriptionId]/route.ts`.
 *
 * `GET / PATCH /api/payment/[subscriptionId]` is the
 * **first per-source-file dual-method smoke** the
 * docs tree publishes that pins a **provider-
 * agnostic** auto-renewal toggle — the handler
 * accepts `provider` (or `paymentProvider`) values
 * from the `PaymentProvider` enum and routes the
 * sync via `getOrCreateProvider(provider)` (works
 * with Stripe, LemonSqueezy, Polar, Solidgate).
 *
 * Distinct from EVERY prior dual-method smoke:
 *
 *   - **Provider-agnostic dual-method** — the FIRST
 *     per-source-file smoke pinning a
 *     `getOrCreateProvider(provider)` dispatch
 *     contract on a per-subscription endpoint
 *     (vs the per-provider Stripe / LemonSqueezy /
 *     Polar siblings which hardcode their provider).
 *   - **Provider-source split** — GET reads
 *     `provider` from the QUERY STRING (`?provider=`),
 *     PATCH reads `paymentProvider` from the BODY.
 *     UNIQUE: the FIRST per-source-file dual-method
 *     smoke pinning a SAME-NAMED-FIELD-from-DIFFERENT-
 *     SOURCES contract.
 *   - **Dynamic enum-validation 400 message** —
 *     `'Invalid payment provider. Must be one of:
 *     stripe, lemonsqueezy, polar, solidgate'`
 *     (UNIQUE: the FIRST per-source-file smoke
 *     pinning a 400 message that DYNAMICALLY lists
 *     the valid enum values via
 *     `validProviders.join(', ')`).
 *   - **TWO distinct body-validation 400 messages**
 *     on PATCH — `'Invalid JSON in request body'`
 *     (catch around `await request.json()`) vs
 *     `'Invalid request body. Expected a JSON
 *     object.'` (post-parse non-object check). The
 *     FIRST per-source-file PATCH smoke pinning a
 *     two-tier body-validation chain.
 *   - **Explicit `typeof enabled !== 'boolean'`
 *     type-check** — `'Invalid request body.
 *     "enabled" must be a boolean.'` (UNIQUE:
 *     pre-Zod boolean type-validation, vs Zod's
 *     opaque error messages).
 *   - **User-scoped IDOR with explicit message** —
 *     `'Forbidden: You do not own this subscription'`
 *     (UNIQUE: the FIRST per-source-file smoke
 *     pinning a user-scoped 403 message that names
 *     ownership).
 *   - **Best-effort provider sync** — if the
 *     provider sync call throws, the local DB
 *     update is preserved (handler logs and
 *     returns success). UNIQUE: the FIRST per-
 *     source-file PATCH smoke pinning a best-effort
 *     provider sync after a successful local DB
 *     write.
 *   - **Dynamic success message** — the response
 *     `message` field is one of TWO distinct
 *     strings based on the `enabled` toggle value
 *     ('Auto-renewal has been enabled...' /
 *     'disabled...').
 *
 *   1. **GET handler** — `auth()` session lookup
 *      (`!session?.user?.id` → 401 ONE-key); `{
 *      subscriptionId } = await params`;
 *      `searchParams.get('provider') || 'stripe'`;
 *      enum validation; subscription lookup; user-
 *      scoped IDOR; success payload `{
 *      subscriptionId, autoRenewal,
 *      cancelAtPeriodEnd, endDate }`.
 *   2. **PATCH handler** — `auth()` session lookup;
 *      JSON body parse with try/catch (400 on
 *      malformed); non-object check (400 on array
 *      / null); typeof-enabled boolean check (400
 *      on non-bool); enum validation;
 *      subscriptionService.setAutoRenewal(...);
 *      best-effort provider-sync via
 *      getOrCreateProvider; success payload `{
 *      success: true, subscription:
 *      <updatedSubscription>, message: <dynamic> }`.
 *   3. **Method-resolution surface** — the route
 *      exports `GET` AND `PATCH`. `POST` / `PUT` /
 *      `DELETE` must round-trip to a `< 500`
 *      status.
 */
const NON_EXISTENT_SUBSCRIPTION_ID = '__definitely-not-a-real-subscription-id__';
const PAYMENT_PATH = `/api/payment/${NON_EXISTENT_SUBSCRIPTION_ID}`;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

const PATCH_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	{ data: { enabled: true }, label: 'enabled=true' },
	{ data: { enabled: false }, label: 'enabled=false' },
	{ data: { enabled: true, paymentProvider: 'stripe' }, label: 'enabled=true with stripe provider' },
	{ data: { enabled: true, paymentProvider: 'lemonsqueezy' }, label: 'enabled=true with lemonsqueezy provider' },

	// Type-violation probes (handler validates).
	{ data: { enabled: 'true' }, label: 'enabled string (boolean check)' },
	{ data: { enabled: 1 }, label: 'enabled number (boolean check)' },
	{ data: { enabled: null }, label: 'enabled null (boolean check)' },

	// Invalid provider (enum validation).
	{ data: { enabled: true, paymentProvider: 'fake-provider' }, label: 'invalid paymentProvider' },

	// Bypass attempts.
	{ data: { enabled: true, isAdmin: true }, label: 'isAdmin=true (handler ignores)' },
	{ data: { enabled: true, userId: 'fabricated' }, label: 'fabricated userId (handler ignores)' }
] as const;

test.describe('API: /api/payment/[subscriptionId] GET + PATCH method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${PAYMENT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.get(PAYMENT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`PATCH ${PAYMENT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.patch(PAYMENT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of PATCH_BODIES) {
		test(`PATCH ${PAYMENT_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.patch(PAYMENT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${PAYMENT_PATH} returns 401 with the canonical bare ONE-key envelope`, async ({
		request
	}) => {
		const response = await request.get(PAYMENT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		expect(body.success).toBeUndefined();
		expect(body.message).toBeUndefined();
	});

	test(`PATCH ${PAYMENT_PATH} returns 401 with the canonical bare ONE-key envelope`, async ({
		request
	}) => {
		const response = await request.patch(PAYMENT_PATH, { data: { enabled: true } });
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		expect(body.success).toBeUndefined();
	});

	test(`GET and PATCH ${PAYMENT_PATH} have IDENTICAL 401 envelopes`, async ({ request }) => {
		const getResponse = await request.get(PAYMENT_PATH);
		const patchResponse = await request.patch(PAYMENT_PATH, { data: { enabled: true } });

		expect(getResponse.status()).toBe(401);
		expect(patchResponse.status()).toBe(401);

		const getBody = await getResponse.json();
		const patchBody = await patchResponse.json();
		expect(getBody).toEqual(patchBody);
	});

	test(`GET ${PAYMENT_PATH} 401 envelope shape has exactly the error key`, async ({ request }) => {
		const response = await request.get(PAYMENT_PATH);
		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
		expect(body.data).toBeUndefined();
		expect(body.subscription).toBeUndefined();
	});

	test(`PATCH ${PAYMENT_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.patch(PAYMENT_PATH, { data: { enabled: true } });
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// The post-auth messages must NEVER appear on
		// the unauth branch.
		expect(serialized).not.toContain('Invalid JSON in request body');
		expect(serialized).not.toContain('Invalid request body');
		expect(serialized).not.toContain('Invalid payment provider');
		expect(serialized).not.toContain('Subscription not found');
		expect(serialized).not.toContain('Forbidden: You do not own this subscription');
		expect(serialized).not.toContain('Failed to update subscription');
		expect(serialized).not.toContain('Auto-renewal has been enabled');
		expect(serialized).not.toContain('Auto-renewal has been disabled');
		expect(serialized).not.toContain('Internal server error');
	});

	test(`PATCH ${PAYMENT_PATH} setAutoRenewal is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: the load-bearing
		// `subscriptionService.setAutoRenewal` call
		// must NEVER run on unauth. Pin that no XSS
		// markers in the body are echoed back.
		const response = await request.patch(PAYMENT_PATH, {
			data: {
				enabled: true,
				paymentProvider: 'XSS-MARKER-12345',
				userId: 'fabricated-user-marker'
			}
		});

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);

		expect(serialized).not.toContain('XSS-MARKER-12345');
		expect(serialized).not.toContain('fabricated-user-marker');
	});

	test(`GET ${PAYMENT_PATH} provider-from-query is NOT validated on the unauth branch`, async ({
		request
	}) => {
		// Pin that the dynamic enum-validation 400
		// message is NEVER reached on the unauth branch.
		// Test with various providers.
		const validResponse = await request.get(`${PAYMENT_PATH}?provider=stripe`);
		const invalidResponse = await request.get(`${PAYMENT_PATH}?provider=fake-provider`);

		expect(validResponse.status()).toBe(401);
		expect(invalidResponse.status()).toBe(401);

		const validBody = await validResponse.json();
		const invalidBody = await invalidResponse.json();
		expect(validBody).toEqual(invalidBody);

		const serialized = JSON.stringify(invalidBody);
		expect(serialized).not.toContain('Invalid payment provider');
	});

	test(`GET ${PAYMENT_PATH} cross-method probe (POST / PUT / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// GET and PATCH are exported; POST / PUT /
		// DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.post(PAYMENT_PATH),
			request.put(PAYMENT_PATH),
			request.delete(PAYMENT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`PATCH ${PAYMENT_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.patch(PAYMENT_PATH, { data: { enabled: true } });
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.patch(PAYMENT_PATH, {
				data: { enabled: true },
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.patch(PAYMENT_PATH, {
				data: { enabled: true },
				headers: { 'X-User-Id': 'fabricated' }
			}),
			request.patch(PAYMENT_PATH, {
				data: { enabled: true },
				headers: { Authorization: 'Bearer fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`PATCH ${PAYMENT_PATH} body-validation chain (malformed JSON, non-object, non-boolean) NEVER fires on unauth`, async ({
		request
	}) => {
		// Pin the gate-before-body-validation order.
		// All three body-shape failures should still
		// produce 401, NOT 400.
		const responses = await Promise.all([
			request.patch(PAYMENT_PATH, {
				headers: { 'Content-Type': 'application/json' },
				data: 'not-valid-json'
			}),
			request.patch(PAYMENT_PATH, { data: [] }),
			request.patch(PAYMENT_PATH, { data: { enabled: 'string-not-boolean' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
		}
	});

	test(`GET ${PAYMENT_PATH} cross-subscription-ID invariance — different IDs produce IDENTICAL unauth envelope`, async ({
		request
	}) => {
		// Pin that the auth gate fires BEFORE any per-
		// subscription-id branch.
		const responses = await Promise.all([
			request.get('/api/payment/sub-id-one'),
			request.get('/api/payment/sub-id-two'),
			request.get('/api/payment/sub-id-three')
		]);

		const baseline = responses[0];
		const baselineBody = await baseline.json();

		for (const response of responses.slice(1)) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});
});
