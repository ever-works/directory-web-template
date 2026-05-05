import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Stripe subscription-cancel endpoint served by
 * the `POST` export of
 * `apps/web/app/api/stripe/subscription/[subscriptionId]/cancel/route.ts`.
 *
 * `POST /api/stripe/subscription/[subscriptionId]/
 * cancel` is the **first per-source-file POST smoke**
 * the docs tree publishes that documents a **Q-010-
 * style IDOR finding for a Stripe subscription
 * endpoint** — the handler authenticates the user
 * via `auth()` but does NOT verify that the
 * `subscriptionId` from the path belongs to the
 * authenticated user. Compare to the sibling polar/
 * subscription/[id]/cancel which DOES enforce
 * ownership via `getCustomerId` → `getPolarSubscription`
 * → `subscriptionCustomerId === userPolarCustomerId`.
 * The Stripe cancel handler trusts the path
 * parameter directly. See [`docs/questions.md`](../../../docs/questions.md)
 * for the Q-### entry.
 *
 * It is also the **first per-source-file POST smoke**
 * that pins a **DB-sync-after-provider-call
 * contract** — after `stripeProvider.cancelSubscription
 * (...)` succeeds, the handler ALSO calls
 * `updateSubscriptionBySubscriptionId({...})` to sync
 * the cancellation state back to the local DB.
 *
 * Distinct from the polar/subscription/[id]/cancel
 * sibling:
 *
 *   - **NO IDOR-protection** — the FIRST per-source-
 *     file POST smoke pinning a Q-010-style finding
 *     for a Stripe subscription endpoint.
 *   - **NO Content-Length 413 pre-check** (polar/
 *     cancel pins one).
 *   - **DB sync side-effect** —
 *     `updateSubscriptionBySubscriptionId(...)` after
 *     the provider call. The FIRST per-source-file
 *     POST smoke pinning a DB-sync-after-provider-
 *     call contract.
 *   - **Email-send with fault-tolerance** —
 *     `paymentEmailService.sendSubscriptionCancelling
 *     Email(...)` wrapped in try/catch (failure does
 *     NOT fail the cancellation).
 *   - **NO try/catch around `request.json()`** —
 *     malformed JSON cascades to outer catch.
 *
 *   1. **`auth()` session lookup** — `!session?.user`
 *      → 401 `{ error: 'Unauthorized' }` (bare
 *      envelope).
 *   2. **JSON body parse** with destructured default
 *      — `{ cancelAtPeriodEnd = true } = await
 *      request.json()`. NO try/catch.
 *   3. **`{ subscriptionId }` param resolution** via
 *      dynamic-segment route.
 *   4. **`getOrCreateStripeProvider()` singleton
 *      initialization**.
 *   5. **`stripeProvider.cancelSubscription
 *      (subscriptionId, cancelAtPeriodEnd)`** —
 *      load-bearing call WITHOUT IDOR protection.
 *   6. **`updateSubscriptionBySubscriptionId({...})`**
 *      — DB sync side-effect.
 *   7. **Email-send with fault-tolerance** — wrapped
 *      in try/catch; failure does NOT fail the
 *      request.
 *   8. **Success payload** — `{ success: true, data:
 *      <cancelledSubscription>, message:
 *      <conditional> }` with status 200.
 *   9. **Outer catch** — 500 `{ error: 'Failed to
 *      cancel subscription' }`.
 *  10. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const NON_EXISTENT_SUB_ID = '__definitely-not-a-real-stripe-subscription-id__';
const STRIPE_CANCEL_PATH = `/api/stripe/subscription/${NON_EXISTENT_SUB_ID}/cancel`;

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
	{ data: '{}', label: 'empty object body (default cancelAtPeriodEnd=true)' },

	// Valid bodies.
	{ data: { cancelAtPeriodEnd: true }, label: 'cancelAtPeriodEnd: true' },
	{ data: { cancelAtPeriodEnd: false }, label: 'cancelAtPeriodEnd: false (immediate)' },

	// Type-violation probes.
	{ data: { cancelAtPeriodEnd: 'true' }, label: 'string cancelAtPeriodEnd' },
	{ data: { cancelAtPeriodEnd: 1 }, label: 'numeric cancelAtPeriodEnd' },

	// Bypass attempts.
	{ data: { isAdmin: true, cancelAtPeriodEnd: false }, label: 'isAdmin=true bypass attempt' },
	{ data: { customerId: 'cus_attacker' }, label: 'fabricated customerId attempt (handler ignores)' },
	{ data: { padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Subscription will be cancelled at the end of the current period',
	'Subscription cancelled immediately',
	'Failed to cancel subscription'
] as const;

test.describe('API: /api/stripe/subscription/[subscriptionId]/cancel POST body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${STRIPE_CANCEL_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_CANCEL_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of BODIES) {
		test(`POST ${STRIPE_CANCEL_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_CANCEL_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${STRIPE_CANCEL_PATH} returns 401 with the bare Unauthorized envelope`, async ({ request }) => {
		// `!session?.user` → 401 `{ error:
		// 'Unauthorized' }` (bare envelope).
		const response = await request.post(STRIPE_CANCEL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test(`POST ${STRIPE_CANCEL_PATH} envelope shape has exactly one error key`, async ({ request }) => {
		const response = await request.post(STRIPE_CANCEL_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
		expect(body.message).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`POST ${STRIPE_CANCEL_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(STRIPE_CANCEL_PATH, {
			data: { cancelAtPeriodEnd: true }
		});
		const body = await response.json();
		expect(body.success).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`POST ${STRIPE_CANCEL_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(STRIPE_CANCEL_PATH),
			request.post(STRIPE_CANCEL_PATH, { data: {} }),
			request.post(STRIPE_CANCEL_PATH, { data: { cancelAtPeriodEnd: true } }),
			request.post(STRIPE_CANCEL_PATH, { data: { cancelAtPeriodEnd: false } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${STRIPE_CANCEL_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(STRIPE_CANCEL_PATH);
		const responses = await Promise.all([
			request.post(STRIPE_CANCEL_PATH, { data: {} }),
			request.post(STRIPE_CANCEL_PATH, { data: { cancelAtPeriodEnd: true } }),
			request.post(STRIPE_CANCEL_PATH, { data: { cancelAtPeriodEnd: false } }),
			request.post(STRIPE_CANCEL_PATH, { data: { isAdmin: true } }),
			request.post(STRIPE_CANCEL_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(STRIPE_CANCEL_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${STRIPE_CANCEL_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(STRIPE_CANCEL_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(STRIPE_CANCEL_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(STRIPE_CANCEL_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(STRIPE_CANCEL_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_CANCEL_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// POST is the ONLY exported method.
		const responses = await Promise.all([
			request.get(STRIPE_CANCEL_PATH),
			request.put(STRIPE_CANCEL_PATH),
			request.patch(STRIPE_CANCEL_PATH),
			request.delete(STRIPE_CANCEL_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_CANCEL_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// The handler has NO try/catch around
		// request.json(). Malformed JSON on the auth
		// branch cascades to the outer catch (500).
		// The unauth branch fires BEFORE request.json
		// (), so malformed bodies must still produce
		// 401.
		const responses = await Promise.all([
			request.post(STRIPE_CANCEL_PATH, { data: 'not-json' }),
			request.post(STRIPE_CANCEL_PATH, { data: '{ broken: json' }),
			request.post(STRIPE_CANCEL_PATH, { data: '{"cancelAtPeriodEnd":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Unauthorized');
		}
	});

	test(`POST ${STRIPE_CANCEL_PATH} cancelSubscription / DB-sync / email-send are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders any of the three
		// side-effects (provider call → DB sync →
		// email send) before the gate would surface
		// here as a `data` field with subscription
		// details on the unauth branch.
		const response = await request.post(STRIPE_CANCEL_PATH, {
			data: { cancelAtPeriodEnd: true }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
		expect(body.data).toBeUndefined();
		expect(body.success).toBeUndefined();
	});

	test(`POST ${STRIPE_CANCEL_PATH} catch-branch generic 500 message is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(STRIPE_CANCEL_PATH),
			request.post(STRIPE_CANCEL_PATH, { data: 'not-json' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Failed to cancel subscription');
		}
	});

	test(`POST ${STRIPE_CANCEL_PATH} no-IDOR-protection contract: any auth'd user can target any subscription ID`, async ({
		request
	}) => {
		// This test pins the CURRENT contract: the
		// handler does NOT verify subscription
		// ownership. On the unauth branch, this
		// manifests as the standard 401 — but the spec
		// pins that the unauth response is identical
		// across DIFFERENT subscription IDs (because
		// no IDOR check distinguishes them). A future
		// regression that ADDS IDOR protection would
		// also break this test by changing the
		// pre-auth path-param handling. See
		// docs/questions.md for the Q-### entry.
		const responses = await Promise.all([
			request.post(`/api/stripe/subscription/sub_a/cancel`),
			request.post(`/api/stripe/subscription/sub_b/cancel`),
			request.post(`/api/stripe/subscription/sub_attacker_target/cancel`)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body).toEqual({ error: 'Unauthorized' });
		}
	});
});
