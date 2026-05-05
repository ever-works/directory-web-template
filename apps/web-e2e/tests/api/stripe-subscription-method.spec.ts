import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST + PUT + DELETE / body /
 * header surface** of the Stripe collection-level
 * subscription endpoint served by the `POST`, `PUT`,
 * AND `DELETE` exports of
 * `apps/web/app/api/stripe/subscription/route.ts`.
 *
 * `POST + PUT + DELETE /api/stripe/subscription` is
 * the **first per-source-file triple-method smoke**
 * the docs tree publishes for a Stripe subscription-
 * management endpoint that documents a **Q-010-style
 * NO-IDOR finding on PUT AND DELETE** — the handlers
 * authenticate the session but DO NOT verify that
 * the `subscriptionId` from the body actually belongs
 * to the calling user. ANY authenticated user can
 * update or cancel ANY Stripe subscription by ID,
 * bypassing the IDOR checks of the per-id siblings
 * (`[subscriptionId]/update`,
 * `[subscriptionId]/cancel`).
 *
 * Sibling specs:
 *   - The per-id update sibling
 *     [`stripe-subscription-id-update-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-subscription-id-update-body.spec.ts)
 *     DOES enforce a user-scoped IDOR check.
 *   - The per-id cancel sibling
 *     [`stripe-subscription-id-cancel-body.spec.ts`](https://github.com/ever-works/directory-web-template/tree/develop/apps/web-e2e/tests/api/stripe-subscription-id-cancel-body.spec.ts)
 *     has NO IDOR (already a known finding); this
 *     collection-level route extends the no-IDOR
 *     surface to PUT.
 *
 * Distinct from EVERY prior triple-method smoke:
 *
 *   - **NO IDOR check on PUT or DELETE** — UNIQUE:
 *     the FIRST per-source-file triple-method smoke
 *     pinning a Q-010-style NO-IDOR finding on
 *     mutating subscriptionId-keyed methods (PUT
 *     updates and DELETE cancels accept ANY
 *     subscriptionId from any authenticated user).
 *   - **Different body-required field on POST vs
 *     PUT/DELETE** — POST requires `priceId` +
 *     `paymentMethodId`; PUT requires
 *     `subscriptionId`; DELETE requires
 *     `subscriptionId`. UNIQUE: the FIRST per-
 *     source-file triple-method smoke pinning
 *     three DIFFERENT required-field shapes on the
 *     three methods.
 *   - **POST 400 `'Failed to create customer'`
 *     branch** — UNIQUE: only POST has the `!
 *     customerId` check (PUT and DELETE skip the
 *     customer-id resolution).
 *   - **Returns RAW Stripe subscription object
 *     verbatim** — UNIQUE: no wrapper envelope on
 *     success; the FIRST per-source-file triple-
 *     method smoke pinning a raw-Stripe-object
 *     success contract on ALL THREE methods.
 *   - **`metadata: { userId: session.user.id }`
 *     OVERWRITE on PUT** — UNIQUE: PUT writes the
 *     CALLER'S userId into the subscription's
 *     metadata regardless of who actually owns the
 *     subscription (compounds the Q-010 finding;
 *     can be used to launder ownership records).
 *   - **Bare ONE-key 401 envelope** `{ error:
 *     'Unauthorized' }` consistent across all three
 *     methods.
 *
 *   1. **POST handler** — `!session?.user` → 401;
 *      JSON body parse; `getOrCreateStripeProvider`;
 *      `getCustomerId(session.user)`; `!customerId`
 *      → 400 `'Failed to create customer'`;
 *      `createSubscription(...)` load-bearing call;
 *      success returns raw Stripe subscription
 *      object.
 *   2. **PUT handler** — `!session?.user` → 401;
 *      JSON body parse;
 *      `getOrCreateStripeProvider`;
 *      `updateSubscription({ subscriptionId,
 *      priceId, cancelAtPeriodEnd, metadata })` --
 *      NO IDOR CHECK; success returns raw Stripe
 *      subscription object.
 *   3. **DELETE handler** — `!session?.user` → 401;
 *      JSON body parse;
 *      `getOrCreateStripeProvider`;
 *      `cancelSubscription(subscriptionId,
 *      cancelAtPeriodEnd)` -- NO IDOR CHECK;
 *      success returns raw Stripe subscription
 *      object.
 *   4. **Method-resolution surface** — the route
 *      exports `POST`, `PUT`, AND `DELETE`. `GET` /
 *      `PATCH` must round-trip to a `< 500` status.
 */
const STRIPE_SUBSCRIPTION_PATH = '/api/stripe/subscription';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

test.describe('API: /api/stripe/subscription POST + PUT + DELETE method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${STRIPE_SUBSCRIPTION_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(STRIPE_SUBSCRIPTION_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`PUT ${STRIPE_SUBSCRIPTION_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.put(STRIPE_SUBSCRIPTION_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`DELETE ${STRIPE_SUBSCRIPTION_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.delete(STRIPE_SUBSCRIPTION_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${STRIPE_SUBSCRIPTION_PATH} returns 401 with the canonical bare ONE-key envelope`, async ({
		request
	}) => {
		const response = await request.post(STRIPE_SUBSCRIPTION_PATH, {
			data: { priceId: 'price_x', paymentMethodId: 'pm_x' }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		expect(body.success).toBeUndefined();
	});

	test(`PUT ${STRIPE_SUBSCRIPTION_PATH} returns 401 with the canonical bare ONE-key envelope`, async ({
		request
	}) => {
		const response = await request.put(STRIPE_SUBSCRIPTION_PATH, {
			data: { subscriptionId: 'sub_x' }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
	});

	test(`DELETE ${STRIPE_SUBSCRIPTION_PATH} returns 401 with the canonical bare ONE-key envelope`, async ({
		request
	}) => {
		const response = await request.delete(STRIPE_SUBSCRIPTION_PATH, {
			data: { subscriptionId: 'sub_x' }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
	});

	test(`POST + PUT + DELETE ${STRIPE_SUBSCRIPTION_PATH} have IDENTICAL 401 envelopes`, async ({
		request
	}) => {
		const postResponse = await request.post(STRIPE_SUBSCRIPTION_PATH, {
			data: { priceId: 'price_x', paymentMethodId: 'pm_x' }
		});
		const putResponse = await request.put(STRIPE_SUBSCRIPTION_PATH, {
			data: { subscriptionId: 'sub_x' }
		});
		const deleteResponse = await request.delete(STRIPE_SUBSCRIPTION_PATH, {
			data: { subscriptionId: 'sub_x' }
		});

		expect(postResponse.status()).toBe(401);
		expect(putResponse.status()).toBe(401);
		expect(deleteResponse.status()).toBe(401);

		const postBody = await postResponse.json();
		const putBody = await putResponse.json();
		const deleteBody = await deleteResponse.json();
		expect(postBody).toEqual(putBody);
		expect(putBody).toEqual(deleteBody);
	});

	test(`POST ${STRIPE_SUBSCRIPTION_PATH} 401 envelope shape has exactly the error key`, async ({
		request
	}) => {
		const response = await request.post(STRIPE_SUBSCRIPTION_PATH);
		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
		expect(body.id).toBeUndefined();
	});

	test(`POST ${STRIPE_SUBSCRIPTION_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(STRIPE_SUBSCRIPTION_PATH, {
			data: { priceId: 'price_x', paymentMethodId: 'pm_x' }
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// Post-auth messages must NEVER appear on
		// unauth.
		expect(serialized).not.toContain('Failed to create customer');
		expect(serialized).not.toContain('Failed to create subscription');
		expect(serialized).not.toContain('Failed to update subscription');
		expect(serialized).not.toContain('Failed to cancel subscription');
	});

	test(`PUT ${STRIPE_SUBSCRIPTION_PATH} updateSubscription is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: even though PUT has NO IDOR check
		// post-auth (Q-010 finding), the auth gate
		// itself must fire BEFORE updateSubscription.
		// Pin that an XSS marker in the body is NEVER
		// echoed back on the unauth branch.
		const response = await request.put(STRIPE_SUBSCRIPTION_PATH, {
			data: {
				subscriptionId: 'XSS-MARKER-12345',
				priceId: 'XSS-PRICE-MARKER',
				cancelAtPeriodEnd: true
			}
		});

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('XSS-MARKER-12345');
		expect(serialized).not.toContain('XSS-PRICE-MARKER');
	});

	test(`DELETE ${STRIPE_SUBSCRIPTION_PATH} cancelSubscription is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: even though DELETE has NO IDOR
		// check post-auth (Q-010 finding), the auth
		// gate itself must fire BEFORE
		// cancelSubscription. Pin that a fabricated
		// subscriptionId is NEVER echoed back.
		const response = await request.delete(STRIPE_SUBSCRIPTION_PATH, {
			data: {
				subscriptionId: 'XSS-CANCEL-MARKER-67890',
				cancelAtPeriodEnd: false
			}
		});

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('XSS-CANCEL-MARKER-67890');
	});

	test(`POST ${STRIPE_SUBSCRIPTION_PATH} cross-method probe (GET / PATCH) does NOT 5xx`, async ({
		request
	}) => {
		// POST + PUT + DELETE are exported. GET /
		// PATCH must round-trip to `< 500`.
		const responses = await Promise.all([
			request.get(STRIPE_SUBSCRIPTION_PATH),
			request.patch(STRIPE_SUBSCRIPTION_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_SUBSCRIPTION_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.post(STRIPE_SUBSCRIPTION_PATH, {
			data: { priceId: 'price_x', paymentMethodId: 'pm_x' }
		});
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.post(STRIPE_SUBSCRIPTION_PATH, {
				data: { priceId: 'price_x', paymentMethodId: 'pm_x' },
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(STRIPE_SUBSCRIPTION_PATH, {
				data: { priceId: 'price_x', paymentMethodId: 'pm_x' },
				headers: { 'X-User-Id': 'fabricated' }
			}),
			request.post(STRIPE_SUBSCRIPTION_PATH, {
				data: { priceId: 'price_x', paymentMethodId: 'pm_x' },
				headers: { Authorization: 'Bearer fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});
});
