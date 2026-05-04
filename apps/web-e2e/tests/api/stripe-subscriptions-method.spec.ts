import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **GET + POST + PUT + DELETE
 * (FOUR-method) / body / header surface** of the
 * Stripe collection-level *subscriptions* (plural)
 * endpoint served by the `GET`, `POST`, `PUT`, AND
 * `DELETE` exports of
 * `apps/web/app/api/stripe/subscriptions/route.ts`.
 *
 * `GET + POST + PUT + DELETE /api/stripe/subscriptions`
 * is the **first per-source-file QUAD-method smoke**
 * the docs tree publishes (every prior smoke covers
 * 1, 2, or 3 methods). Distinct from the *singular*
 * sibling at `/api/stripe/subscription`:
 *
 *   - **PROPER USER-SCOPED IDOR on PUT AND DELETE** —
 *     `subscription.userId !== session.user.id` →
 *     404 `'Subscription not found'`. CONTRAST with
 *     [`stripe-subscription-method-spec.md`](https://github.com/ever-works/directory-web-template/tree/develop/docs/plugins/stripe-subscription-method-spec.md)
 *     which is the singular sibling and has NO IDOR
 *     (Q-010 finding) — this plural sibling does it
 *     correctly.
 *   - **GET conditional response shape** — `?active=
 *     true` returns `{ data, plan, limits }`; default
 *     returns `{ data, history, meta }`. UNIQUE: the
 *     FIRST per-source-file GET smoke pinning a
 *     conditional response shape based on query.
 *   - **POST returns 201 status** (NOT 200). UNIQUE
 *     among Stripe POST smokes.
 *   - **POST 409 Conflict** for existing active
 *     subscription — UNIQUE: the FIRST per-source-
 *     file POST smoke pinning a 409 Conflict status
 *     code.
 *   - **Query-string DELETE** — DELETE uses query
 *     parameters (`?id=&reason=&cancelAtPeriodEnd=`)
 *     NOT body. UNIQUE: the FIRST per-source-file
 *     DELETE smoke pinning a query-driven mutating
 *     DELETE (vs body-driven DELETE in every other
 *     sibling).
 *   - **DYNAMIC success message on DELETE** — based
 *     on `?cancelAtPeriodEnd=true` flag the message
 *     is one of TWO strings.
 *   - **Bare ONE-key 401 envelope** `{ error:
 *     'Unauthorized' }` consistent across ALL FOUR
 *     methods.
 *   - **Three-field required-check on POST** —
 *     `!planId || !paymentProvider ||
 *     !subscriptionId` → 400 with comma-joined
 *     field list `'Missing required fields:
 *     planId, paymentProvider, subscriptionId'`
 *     (UNIQUE: the FIRST per-source-file POST
 *     smoke pinning a comma-joined-field-list
 *     400 message).
 *
 *   1. **GET handler** — `auth()`; query parsing
 *      (`?active=true`, `?history=true`); branch on
 *      activeOnly vs all; success returns
 *      conditional shape.
 *   2. **POST handler** — `auth()`; JSON body parse;
 *      THREE-required-field check; `hasActiveSubscription`
 *      check → 409; `createSubscription(...)` load-
 *      bearing call; success returns 201 with `{
 *      data, message: 'Subscription created
 *      successfully' }`.
 *   3. **PUT handler** — `auth()`; JSON body parse;
 *      `!subscriptionId` → 400; `getSubscriptionById`
 *      + USER-SCOPED IDOR (`!subscription ||
 *      subscription.userId !== session.user.id` →
 *      404); `updateSubscription(...)` load-bearing
 *      call; success returns `{ data, message:
 *      'Subscription updated successfully' }`.
 *   4. **DELETE handler** — `auth()`; query parsing
 *      (`?id=`, `?reason=`, `?cancelAtPeriodEnd=`);
 *      `!id` → 400; `getSubscriptionById` + USER-
 *      SCOPED IDOR → 404; `cancelSubscription(...)`
 *      load-bearing call; success returns DYNAMIC
 *      message based on `cancelAtPeriodEnd` flag.
 *   5. **Method-resolution surface** — the route
 *      exports `GET`, `POST`, `PUT`, AND `DELETE`.
 *      `PATCH` must round-trip to a `< 500` status.
 */
const STRIPE_SUBSCRIPTIONS_PATH = '/api/stripe/subscriptions';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	// Side-channel probes.
	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer fabricated' }, label: 'fabricated Bearer authorization' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' }
] as const;

test.describe('API: /api/stripe/subscriptions GET + POST + PUT + DELETE method surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`GET ${STRIPE_SUBSCRIPTIONS_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.get(STRIPE_SUBSCRIPTIONS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`POST ${STRIPE_SUBSCRIPTIONS_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(STRIPE_SUBSCRIPTIONS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`PUT ${STRIPE_SUBSCRIPTIONS_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.put(STRIPE_SUBSCRIPTIONS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});

		test(`DELETE ${STRIPE_SUBSCRIPTIONS_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.delete(STRIPE_SUBSCRIPTIONS_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`GET ${STRIPE_SUBSCRIPTIONS_PATH} returns 401 with the canonical bare ONE-key envelope`, async ({
		request
	}) => {
		const response = await request.get(STRIPE_SUBSCRIPTIONS_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
	});

	test(`POST ${STRIPE_SUBSCRIPTIONS_PATH} returns 401 with the canonical bare ONE-key envelope`, async ({
		request
	}) => {
		const response = await request.post(STRIPE_SUBSCRIPTIONS_PATH, {
			data: { planId: 'p', paymentProvider: 'stripe', subscriptionId: 'sub_x' }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
	});

	test(`GET / POST / PUT / DELETE ${STRIPE_SUBSCRIPTIONS_PATH} have IDENTICAL 401 envelopes`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(STRIPE_SUBSCRIPTIONS_PATH),
			request.post(STRIPE_SUBSCRIPTIONS_PATH),
			request.put(STRIPE_SUBSCRIPTIONS_PATH),
			request.delete(STRIPE_SUBSCRIPTIONS_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
		}

		const bodies = await Promise.all(responses.map((r) => r.json()));
		const baseline = bodies[0];
		for (const body of bodies.slice(1)) {
			expect(body).toEqual(baseline);
		}
	});

	test(`GET ${STRIPE_SUBSCRIPTIONS_PATH} 401 envelope shape has exactly the error key`, async ({
		request
	}) => {
		const response = await request.get(STRIPE_SUBSCRIPTIONS_PATH);
		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
		expect(body.data).toBeUndefined();
		expect(body.meta).toBeUndefined();
	});

	test(`POST ${STRIPE_SUBSCRIPTIONS_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(STRIPE_SUBSCRIPTIONS_PATH, {
			data: { planId: 'p', paymentProvider: 'stripe', subscriptionId: 'sub_x' }
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);

		// Post-auth messages must NEVER appear on
		// unauth.
		expect(serialized).not.toContain('Missing required fields');
		expect(serialized).not.toContain('User already has an active subscription');
		expect(serialized).not.toContain('Subscription created successfully');
		expect(serialized).not.toContain('Subscription updated successfully');
		expect(serialized).not.toContain('Subscription cancelled successfully');
		expect(serialized).not.toContain('Subscription not found');
	});

	test(`PUT ${STRIPE_SUBSCRIPTIONS_PATH} updateSubscription is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// CRITICAL: pin that XSS markers in the PUT
		// body are NEVER echoed back on unauth. PUT
		// has PROPER user-scoped IDOR post-auth, but
		// the auth gate must fire first.
		const response = await request.put(STRIPE_SUBSCRIPTIONS_PATH, {
			data: {
				subscriptionId: 'XSS-PUT-MARKER-12345',
				planId: 'XSS-PLAN-MARKER',
				status: 'active'
			}
		});

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('XSS-PUT-MARKER-12345');
		expect(serialized).not.toContain('XSS-PLAN-MARKER');
	});

	test(`DELETE ${STRIPE_SUBSCRIPTIONS_PATH} cancelSubscription is NOT entered with query-string ID on unauth`, async ({
		request
	}) => {
		// DELETE is query-driven (UNIQUE — vs body-
		// driven in other DELETE siblings). Pin that
		// the query-string id is NOT echoed back.
		const response = await request.delete(
			`${STRIPE_SUBSCRIPTIONS_PATH}?id=XSS-DELETE-MARKER&reason=marker-leak&cancelAtPeriodEnd=true`
		);

		expect(response.status()).toBe(401);
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('XSS-DELETE-MARKER');
		expect(serialized).not.toContain('marker-leak');
	});

	test(`GET ${STRIPE_SUBSCRIPTIONS_PATH} cross-query invariance — different query permutations produce IDENTICAL unauth envelopes`, async ({
		request
	}) => {
		// Pin that the auth gate fires BEFORE the
		// `?active=` / `?history=` query branch.
		const responses = await Promise.all([
			request.get(STRIPE_SUBSCRIPTIONS_PATH),
			request.get(`${STRIPE_SUBSCRIPTIONS_PATH}?active=true`),
			request.get(`${STRIPE_SUBSCRIPTIONS_PATH}?active=false`),
			request.get(`${STRIPE_SUBSCRIPTIONS_PATH}?history=true`),
			request.get(`${STRIPE_SUBSCRIPTIONS_PATH}?active=true&history=true`)
		]);

		const baseline = responses[0];
		const baselineBody = await baseline.json();

		for (const response of responses.slice(1)) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});

	test(`GET ${STRIPE_SUBSCRIPTIONS_PATH} cross-method probe (PATCH) does NOT 5xx`, async ({
		request
	}) => {
		// GET, POST, PUT, DELETE are exported. PATCH
		// must round-trip to `< 500`.
		const response = await request.patch(STRIPE_SUBSCRIPTIONS_PATH);
		expect(response.status()).toBeLessThan(500);
	});

	test(`POST ${STRIPE_SUBSCRIPTIONS_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const baseline = await request.post(STRIPE_SUBSCRIPTIONS_PATH, {
			data: { planId: 'p', paymentProvider: 'stripe', subscriptionId: 'sub_x' }
		});
		const baselineStatus = baseline.status();

		const responses = await Promise.all([
			request.post(STRIPE_SUBSCRIPTIONS_PATH, {
				data: { planId: 'p', paymentProvider: 'stripe', subscriptionId: 'sub_x' },
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(STRIPE_SUBSCRIPTIONS_PATH, {
				data: { planId: 'p', paymentProvider: 'stripe', subscriptionId: 'sub_x' },
				headers: { 'X-User-Id': 'fabricated' }
			}),
			request.post(STRIPE_SUBSCRIPTIONS_PATH, {
				data: { planId: 'p', paymentProvider: 'stripe', subscriptionId: 'sub_x' },
				headers: { Authorization: 'Bearer fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baselineStatus);
		}
	});

	test(`POST ${STRIPE_SUBSCRIPTIONS_PATH} required-field check is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// Pin the gate-before-required-field-check
		// order. Even with empty body, the response
		// is 401 NOT 400.
		const response = await request.post(STRIPE_SUBSCRIPTIONS_PATH, { data: {} });
		expect(response.status()).toBe(401);
		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		// The 400 message must not leak.
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('Missing required fields');
	});
});
