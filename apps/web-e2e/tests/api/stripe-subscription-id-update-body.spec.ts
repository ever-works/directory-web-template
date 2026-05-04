import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Stripe subscription-plan-update endpoint
 * served by the `POST` export of
 * `apps/web/app/api/stripe/subscription/[subscriptionId]/update/route.ts`.
 *
 * `POST /api/stripe/subscription/[subscriptionId]/
 * update` is the **first per-source-file POST smoke**
 * the docs tree publishes that pins a **USER-SCOPED
 * IDOR check on a Stripe subscription endpoint** —
 * after the tenant-scoped DB lookup the handler also
 * compares `userSubscription.userId !==
 * session.user.id` and returns 404 `'Subscription
 * not found or access denied'`. Sits on the
 * stripe-subscription IDOR spectrum:
 *
 *   - [`stripe-subscription-id-cancel-body-spec.md`]
 *     — NO IDOR check at all.
 *   - [`stripe-subscription-id-reactivate-body-spec.md`]
 *     — TENANT-only scoped (partial-IDOR).
 *   - **THIS spec** — TENANT-scoped DB lookup plus
 *     EXPLICIT USER-id equality check (full IDOR).
 *
 * It is also the **first per-source-file POST smoke**
 * the docs tree publishes that pins a **THREE-state
 * allow-list pre-check 400 contract** — `if
 * (subscription.status !== 'active' &&
 * subscription.status !== 'pending' &&
 * subscription.status !== 'paused')` → 400
 * `'Subscription is not active'`. Distinct from the
 * reactivate sibling which uses a SINGLE-flag
 * pre-check on `subscription.cancelAtPeriodEnd`.
 *
 * It is also the **first per-source-file POST smoke**
 * the docs tree publishes that pins a **PaymentPlan-
 * enum-from-`@/lib/constants` validation** —
 * `Object.values(PaymentPlan).includes(newPlanId)` →
 * 400 `'Invalid plan ID'`. Distinct from the
 * LemonSqueezy update-plan sibling which uses Zod
 * `safeParse` for its validation chain. This is a
 * raw `Object.values(...).includes(...)` membership
 * check against an enum imported from the project's
 * `@/lib/constants` module — NOT a schema-driven
 * validation.
 *
 * It is also the **first per-source-file POST smoke**
 * the docs tree publishes that pins a **conditional
 * tenant filter on a DB-UPDATE WHERE clause** —
 * `...(tenantId ? [eq(subscriptions.tenantId,
 * tenantId)] : [])` spreads zero or one Drizzle
 * filter into the AND clause based on whether
 * `getTenantId()` returns a truthy value at request
 * time. Every prior tenant-scoped POST smoke uses an
 * UNCONDITIONAL tenant filter (for example, the
 * reactivate sibling reads a subscription via
 * `getSubscriptionByProviderSubscriptionId` which is
 * unconditionally tenant-scoped); this update
 * handler is the first to make the tenant clause
 * structurally optional in a DB write.
 *
 * Distinct from EVERY prior POST smoke:
 *
 *   - **USER-scoped IDOR** — `userSubscription.userId
 *     !== session.user.id` → merged 404
 *     `'Subscription not found or access denied'`
 *     (FIRST per-source-file POST smoke pinning a
 *     user-scoped IDOR on a Stripe subscription
 *     endpoint).
 *   - **THREE-state pre-check 400** — `'active' /
 *     'pending' / 'paused'` allow-list (FIRST per-
 *     source-file POST smoke pinning a THREE-state
 *     allow-list pre-check 400 contract).
 *   - **PaymentPlan enum-includes validation** —
 *     `Object.values(PaymentPlan).includes(newPlanId)`
 *     (FIRST per-source-file POST smoke pinning an
 *     enum-from-constants-includes validation).
 *   - **Conditional tenant-filter on DB UPDATE
 *     WHERE** — `...(tenantId ? [eq(...)] : [])`
 *     (FIRST per-source-file POST smoke pinning a
 *     conditional tenant filter in a DB UPDATE).
 *   - **Body parsing IS used** — `await request.
 *     json()` IS called, distinct from reactivate
 *     sibling which does NOT parse.
 *   - **TWO required fields** — `{ newPlanId,
 *     newPriceId }` destructured from body.
 *   - **Multi-step write chain** — `stripeProvider.
 *     updateSubscription({ subscriptionId, priceId:
 *     newPriceId })`, `db.update(subscriptions).set
 *     ({ planId, priceId, updatedAt }).where(...)`,
 *     and async `paymentEmailService.
 *     sendSubscriptionPlanChangedEmail(...)`.
 *   - **Plan-changed email contract** — the email
 *     payload includes BOTH `oldPlanName:
 *     subscription.planId` (read from the DB row
 *     BEFORE the update) AND `newPlanName: newPlanId`
 *     (FIRST per-source-file POST smoke pinning an
 *     email with both old + new plan names).
 *   - **Dynamic success message** — `Plan updated to
 *     ${newPlanId} successfully` (template literal
 *     with `newPlanId` interpolation). Distinct from
 *     reactivate sibling's static message.
 *   - **Returns raw `updatedSubscription`** in the
 *     `data` field — Stripe SDK provider object
 *     verbatim.
 *   - **Generic 500 catch** — single static string
 *     `'Failed to update subscription'`.
 *
 *   1. **`auth()` session lookup** — `!session?.user`
 *      → 401 `{ error: 'Unauthorized' }` (bare
 *      envelope).
 *   2. **`{ newPlanId, newPriceId } = await request.
 *      json()`** — body parse AFTER the auth gate.
 *   3. **`{ subscriptionId } = await params`** —
 *      dynamic-segment route param resolution.
 *   4. **PaymentPlan-enum-includes validation** —
 *      `!Object.values(PaymentPlan).includes
 *      (newPlanId)` → 400 `'Invalid plan ID'`.
 *   5. **`getOrCreateStripeProvider()` singleton
 *      initialization** AFTER the validation step.
 *   6. **Tenant-scoped DB IDOR check** —
 *      `getSubscriptionByProviderSubscriptionId
 *      ('stripe', subscriptionId)` returns null OR
 *      `userSubscription.userId !== session.user.id`
 *      → 404 `'Subscription not found or access
 *      denied'`. **THIS is the user-scoped IDOR
 *      check.**
 *   7. **THREE-state pre-check 400** —
 *      `subscription.status !== 'active' &&
 *      subscription.status !== 'pending' &&
 *      subscription.status !== 'paused'` → 400
 *      `'Subscription is not active'`.
 *   8. **`stripeProvider.updateSubscription({
 *      subscriptionId, priceId: newPriceId })`** —
 *      load-bearing provider call.
 *   9. **`getTenantId()` resolution + DB UPDATE
 *      with conditional tenant filter** —
 *      `db.update(subscriptions).set({ planId,
 *      priceId, updatedAt }).where(and(eq
 *      (subscriptions.subscriptionId,
 *      subscriptionId), ...(tenantId ? [eq
 *      (subscriptions.tenantId, tenantId)] : []
 *      )))`.
 *  10. **Async email side-effect** —
 *      `paymentEmailService.
 *      sendSubscriptionPlanChangedEmail({
 *      customerName, customerEmail, oldPlanName:
 *      subscription.planId, newPlanName: newPlanId,
 *      subscriptionId, ... })` wrapped in try/catch
 *      (failure does NOT fail the update).
 *  11. **Success payload** — `{ success: true,
 *      data: <updatedSubscription>, message: 'Plan
 *      updated to ${newPlanId} successfully' }`
 *      with status 200.
 *  12. **Generic 500 catch** — `{ error: 'Failed
 *      to update subscription' }`.
 *  13. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const NON_EXISTENT_SUB_ID = '__definitely-not-a-real-stripe-subscription-id__';
const STRIPE_UPDATE_PATH = `/api/stripe/subscription/${NON_EXISTENT_SUB_ID}/update`;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header (user-scope probe)' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header (tenant-scope probe)' }
] as const;

const BODIES = [
	{ data: undefined as unknown, label: 'no body (handler parses but bails on JSON)' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (newPlanId / newPriceId both undefined)' },

	// Required-field shape probes — the handler does
	// NOT explicitly validate presence; it relies on
	// the PaymentPlan-enum-includes check to fail on
	// undefined / wrong newPlanId.
	{ data: { newPlanId: 'pro' }, label: 'only newPlanId (newPriceId missing)' },
	{ data: { newPriceId: 'price_xxx' }, label: 'only newPriceId (newPlanId missing)' },

	// PaymentPlan-enum-includes probes — these MUST
	// produce 400 'Invalid plan ID' on the AUTH
	// branch but MUST NOT produce that message on
	// the unauth branch.
	{ data: { newPlanId: 'NOT_A_REAL_PLAN', newPriceId: 'price_xxx' }, label: 'invalid newPlanId (not in PaymentPlan)' },
	{ data: { newPlanId: '', newPriceId: 'price_xxx' }, label: 'empty newPlanId' },
	{ data: { newPlanId: 0, newPriceId: 'price_xxx' }, label: 'numeric newPlanId' },
	{ data: { newPlanId: null, newPriceId: 'price_xxx' }, label: 'null newPlanId' },

	// Bypass attempts (handler does NOT branch on
	// these body keys, so all bypass attempts are
	// no-ops on unauth).
	{ data: { isAdmin: true, newPlanId: 'pro', newPriceId: 'price_xxx' }, label: 'isAdmin=true bypass attempt' },
	{ data: { tenantId: 'attacker_tenant', newPlanId: 'pro', newPriceId: 'price_xxx' }, label: 'fabricated tenantId in body (ignored — getTenantId wins)' },
	{ data: { userId: 'attacker_user', newPlanId: 'pro', newPriceId: 'price_xxx' }, label: 'fabricated userId in body (ignored — session wins)' },
	{ data: { subscriptionId: 'sub_other', newPlanId: 'pro', newPriceId: 'price_xxx' }, label: 'fabricated subscriptionId in body (ignored — path wins)' },
	{ data: { padding: 'x'.repeat(500), newPlanId: 'pro', newPriceId: 'price_xxx' }, label: 'mid-padded body' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Invalid plan ID',
	'Subscription not found or access denied',
	'Subscription is not active',
	'Failed to update subscription'
] as const;

test.describe('API: /api/stripe/subscription/[subscriptionId]/update POST body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${STRIPE_UPDATE_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_UPDATE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of BODIES) {
		test(`POST ${STRIPE_UPDATE_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_UPDATE_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${STRIPE_UPDATE_PATH} returns 401 with the bare Unauthorized envelope`, async ({ request }) => {
		// `!session?.user` → 401 `{ error:
		// 'Unauthorized' }` (bare envelope, same shape
		// as cancel + reactivate siblings).
		const response = await request.post(STRIPE_UPDATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test(`POST ${STRIPE_UPDATE_PATH} envelope shape has exactly one error key`, async ({ request }) => {
		const response = await request.post(STRIPE_UPDATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
		expect(body.message).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`POST ${STRIPE_UPDATE_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(STRIPE_UPDATE_PATH, {
			data: { newPlanId: 'pro', newPriceId: 'price_xxx' }
		});
		const body = await response.json();
		expect(body.success).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`POST ${STRIPE_UPDATE_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(STRIPE_UPDATE_PATH),
			request.post(STRIPE_UPDATE_PATH, { data: {} }),
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 'pro', newPriceId: 'price_xxx' } }),
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 'NOT_A_REAL_PLAN', newPriceId: 'price_xxx' } }),
			request.post(STRIPE_UPDATE_PATH, { data: { tenantId: 'attacker' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${STRIPE_UPDATE_PATH} does NOT echo the dynamic success message on the unauth branch`, async ({
		request
	}) => {
		// The dynamic success message is `Plan updated
		// to ${newPlanId} successfully` — the unauth
		// branch must NEVER emit any variant of this
		// template even when newPlanId is supplied in
		// the body.
		const responses = await Promise.all([
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 'pro', newPriceId: 'price_xxx' } }),
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 'free', newPriceId: 'price_xxx' } }),
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 'enterprise', newPriceId: 'price_xxx' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.message).not.toMatch(/^Plan updated to .+ successfully$/);
		}
	});

	test(`POST ${STRIPE_UPDATE_PATH} does NOT echo the caller-supplied newPlanId / newPriceId on the unauth branch`, async ({
		request
	}) => {
		// On unauth, the response must NEVER echo any
		// caller-supplied newPlanId or newPriceId
		// value. A regression that surfaces these
		// fields in the unauth response would imply
		// the body parse + downstream chain was
		// entered before the auth gate.
		const response = await request.post(STRIPE_UPDATE_PATH, {
			data: { newPlanId: 'attacker_plan_marker', newPriceId: 'attacker_price_marker' }
		});
		const bodyStr = await response.text();
		expect(bodyStr).not.toContain('attacker_plan_marker');
		expect(bodyStr).not.toContain('attacker_price_marker');
	});

	test(`POST ${STRIPE_UPDATE_PATH} has a stable status across header / body permutations`, async ({ request }) => {
		const baseline = await request.post(STRIPE_UPDATE_PATH);
		const responses = await Promise.all([
			request.post(STRIPE_UPDATE_PATH, { data: {} }),
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 'pro', newPriceId: 'price_xxx' } }),
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 'NOT_A_REAL_PLAN', newPriceId: 'price_xxx' } }),
			request.post(STRIPE_UPDATE_PATH, { data: { isAdmin: true } }),
			request.post(STRIPE_UPDATE_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(STRIPE_UPDATE_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${STRIPE_UPDATE_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(STRIPE_UPDATE_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(STRIPE_UPDATE_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(STRIPE_UPDATE_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(STRIPE_UPDATE_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(STRIPE_UPDATE_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_UPDATE_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// POST is the ONLY exported method.
		const responses = await Promise.all([
			request.get(STRIPE_UPDATE_PATH),
			request.put(STRIPE_UPDATE_PATH),
			request.patch(STRIPE_UPDATE_PATH),
			request.delete(STRIPE_UPDATE_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_UPDATE_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// The handler DOES call `request.json()` (after
		// the auth gate). On the unauth branch the
		// body is never read, so malformed JSON must
		// NOT cause a 5xx — the body parse is gated
		// behind the auth check.
		const responses = await Promise.all([
			request.post(STRIPE_UPDATE_PATH, { data: 'not-json' }),
			request.post(STRIPE_UPDATE_PATH, { data: '{ broken: json' }),
			request.post(STRIPE_UPDATE_PATH, { data: '{"newPlanId":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_UPDATE_PATH} body-parse JSON-parse error is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders `request.json()`
		// before the auth gate would surface a 500
		// `'Failed to update subscription'` with a
		// JSON-parse error in the catch. The unauth
		// branch must NEVER produce 500 on malformed
		// JSON — auth gate fires FIRST.
		const responses = await Promise.all([
			request.post(STRIPE_UPDATE_PATH, { data: 'not-json' }),
			request.post(STRIPE_UPDATE_PATH, { data: '{ broken' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).toBe('Unauthorized');
			expect(body.error).not.toBe('Failed to update subscription');
		}
	});

	test(`POST ${STRIPE_UPDATE_PATH} PaymentPlan-enum-includes validation is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The handler runs `Object.values(PaymentPlan).
		// includes(newPlanId)` AFTER the auth gate. The
		// unauth branch must NEVER emit the 400
		// `'Invalid plan ID'` message even when the
		// body declares an invalid plan.
		const responses = await Promise.all([
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 'NOT_A_REAL_PLAN', newPriceId: 'price_xxx' } }),
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: '', newPriceId: 'price_xxx' } }),
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 0, newPriceId: 'price_xxx' } }),
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: null, newPriceId: 'price_xxx' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Invalid plan ID');
		}
	});

	test(`POST ${STRIPE_UPDATE_PATH} user-scoped IDOR check is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The handler runs the merged DB-IDOR + user-id
		// equality check AFTER the auth gate. The
		// unauth branch must NEVER emit 404
		// `'Subscription not found or access denied'`
		// (the message that would surface IF a fake
		// session were grafted onto the unauth path
		// and the IDOR check fired).
		const response = await request.post(STRIPE_UPDATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Subscription not found or access denied');
	});

	test(`POST ${STRIPE_UPDATE_PATH} THREE-state pre-check 400 is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The handler reads `subscription.status` from
		// the DB row and returns 400 if it is NOT in
		// the `'active' / 'pending' / 'paused'` allow-
		// list BEFORE calling the provider. The unauth
		// branch must NEVER emit the 400 `'Subscription
		// is not active'` message.
		const responses = await Promise.all([
			request.post(STRIPE_UPDATE_PATH),
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 'pro', newPriceId: 'price_xxx' } }),
			request.post(STRIPE_UPDATE_PATH, { data: { force: true } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Subscription is not active');
		}
	});

	test(`POST ${STRIPE_UPDATE_PATH} updateSubscription / DB-update / email-send chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders any of the
		// three post-auth side-effects (provider
		// call, DB update with conditional tenant
		// filter, plan-changed email) before the
		// auth gate would surface a `data` field
		// with subscription details on the unauth
		// branch.
		const response = await request.post(STRIPE_UPDATE_PATH, {
			data: { newPlanId: 'pro', newPriceId: 'price_xxx' }
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBeUndefined();
		expect(body.message).not.toMatch(/^Plan updated to .+ successfully$/);
	});

	test(`POST ${STRIPE_UPDATE_PATH} catch-branch generic-500 is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// The catch is a single line returning 500
		// `'Failed to update subscription'`. The
		// unauth branch must produce 401, NOT the
		// catch's 500 message.
		const responses = await Promise.all([
			request.post(STRIPE_UPDATE_PATH),
			request.post(STRIPE_UPDATE_PATH, { data: {} }),
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 'pro', newPriceId: 'price_xxx' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Failed to update subscription');
		}
	});

	test(`POST ${STRIPE_UPDATE_PATH} body is COMPLETELY ignored on the unauth branch`, async ({ request }) => {
		// The handler DOES call request.json(), but
		// only after the auth gate. EVERY body
		// permutation must produce the EXACT same
		// status AND envelope on unauth.
		const baseline = await request.post(STRIPE_UPDATE_PATH);
		const baselineBody = await baseline.json();

		const responses = await Promise.all([
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 'pro', newPriceId: 'price_xxx' } }),
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 'free', newPriceId: 'price_yyy' } }),
			request.post(STRIPE_UPDATE_PATH, { data: { newPlanId: 'NOT_A_REAL_PLAN', newPriceId: 'price_xxx' } }),
			request.post(STRIPE_UPDATE_PATH, { data: 'not-json' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});

	test(`POST ${STRIPE_UPDATE_PATH} unauth status is invariant across distinct subscription IDs`, async ({
		request
	}) => {
		// The user-scoped DB-IDOR check fires only
		// AFTER the auth gate. On the unauth branch,
		// the response must be IDENTICAL across
		// distinct subscription IDs — pinning that
		// the tenant-scoped DB read AND the user-id
		// equality check are NOT entered upstream of
		// the gate.
		const baseline = await request.post(STRIPE_UPDATE_PATH);
		const baselineBody = await baseline.json();

		const otherIds = ['sub_other_1', 'sub_other_2', 'cus_attacker', '../../../../etc/passwd'];
		for (const id of otherIds) {
			const response = await request.post(`/api/stripe/subscription/${encodeURIComponent(id)}/update`, {
				data: { newPlanId: 'pro', newPriceId: 'price_xxx' }
			});
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});
});
