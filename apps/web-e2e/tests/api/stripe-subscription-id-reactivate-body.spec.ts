import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Stripe subscription-reactivate endpoint served
 * by the `POST` export of
 * `apps/web/app/api/stripe/subscription/[subscriptionId]/reactivate/route.ts`.
 *
 * `POST /api/stripe/subscription/[subscriptionId]/
 * reactivate` is the **first per-source-file POST
 * smoke** the docs tree publishes that pins a
 * **TENANT-SCOPED-but-NOT-USER-SCOPED partial-IDOR
 * finding** — the handler authenticates the user
 * via `auth()` and then looks up the subscription
 * via `getSubscriptionByProviderSubscriptionId
 * ('stripe', subscriptionId)`, which scopes the
 * query by `tenantId` (NOT by `userId`).
 *
 * Compare to the siblings:
 *
 *   - [`stripe-subscription-id-cancel-body-spec.md`]
 *     — NO IDOR check at all (a Q-010-style finding).
 *   - [`polar-subscription-id-cancel-body-spec.md`]
 *     — full user-scoped IDOR via `getCustomerId`
 *     and `subscriptionCustomerId === userPolar
 *     CustomerId`.
 *
 * The Stripe reactivate handler sits BETWEEN those
 * two — it does enforce a tenant-scoped check
 * (which prevents cross-tenant access) but does NOT
 * verify per-user ownership within the same tenant.
 * This is a partial-IDOR finding worth pinning as
 * the CURRENT contract.
 *
 * It is also the **first per-source-file POST smoke**
 * that pins a **STATE-MACHINE PRE-CHECK 400
 * contract** — the handler reads `subscription.
 * cancelAtPeriodEnd` from the DB row and returns
 * 400 `'Subscription is not scheduled for
 * cancellation'` BEFORE calling the provider.
 * Distinct from the polar/subscription/[id]/
 * reactivate sibling which surfaces the same 400
 * via a catch-substring detection on the upstream
 * Polar error message; this Stripe variant has the
 * 400 baked into the handler's own state-machine
 * pre-check.
 *
 * Distinct from EVERY prior POST smoke:
 *
 *   - **NO body parsing** — `request.json()` is
 *     never called (matches polar reactivate
 *     sibling, distinct from stripe cancel sibling
 *     which DOES parse).
 *   - **TENANT-scoped DB IDOR check** — partial-
 *     IDOR finding (FIRST per-source-file POST
 *     smoke pinning a tenant-scoped-but-NOT-user-
 *     scoped IDOR contract).
 *   - **STATE-MACHINE PRE-CHECK 400** — `if (!
 *     subscription.cancelAtPeriodEnd)` BEFORE the
 *     provider call.
 *   - **Multi-step write** — `stripeProvider.
 *     updateSubscription` AND
 *     `updateSubscriptionBySubscriptionId` (DB
 *     sync write), then async email side-effect.
 *   - **Generic 500 catch** — single static string
 *     `'Failed to reactivate subscription'`, NO
 *     substring detection (distinct from polar
 *     reactivate's THREE-string catch dispatcher).
 *   - **Static success message** `'Subscription
 *     reactivated successfully'` (no conditional
 *     branch, matches polar reactivate sibling).
 *   - **Returns raw `reactivatedSubscription`** in
 *     the `data` field — Stripe SDK provider
 *     object verbatim.
 *
 *   1. **`auth()` session lookup** — `!session?.user`
 *      → 401 `{ error: 'Unauthorized' }` (bare
 *      envelope).
 *   2. **`{ subscriptionId }` param resolution** via
 *      dynamic-segment route.
 *   3. **`getOrCreateStripeProvider()` singleton
 *      initialization** AFTER the auth gate.
 *   4. **Tenant-scoped DB IDOR check** —
 *      `getSubscriptionByProviderSubscriptionId
 *      ('stripe', subscriptionId)` returns null →
 *      404 `'Subscription not found or access
 *      denied'`.
 *   5. **STATE-MACHINE PRE-CHECK 400** — `if (!
 *      subscription.cancelAtPeriodEnd)` → 400
 *      `'Subscription is not scheduled for
 *      cancellation'`.
 *   6. **`stripeProvider.updateSubscription({
 *      subscriptionId, cancelAtPeriodEnd: false
 *      })`** — load-bearing provider call.
 *   7. **`updateSubscriptionBySubscriptionId({
 *      subscriptionId, cancelAtPeriodEnd: false,
 *      cancelledAt: null, updatedAt, status:
 *      'active' })`** — DB sync write.
 *   8. **Async email side-effect** —
 *      `paymentEmailService.
 *      sendSubscriptionReactivatedEmail(...)`
 *      wrapped in try/catch (failure does NOT fail
 *      the reactivation).
 *   9. **Success payload** — `{ success: true,
 *      data: <reactivatedSubscription>, message:
 *      'Subscription reactivated successfully' }`
 *      with status 200.
 *   10. **Generic 500 catch** — `{ error: 'Failed
 *       to reactivate subscription' }`.
 *   11. **Method-resolution surface** — the route
 *       exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *       / `DELETE` must round-trip to a `< 500`
 *       status.
 */
const NON_EXISTENT_SUB_ID = '__definitely-not-a-real-stripe-subscription-id__';
const STRIPE_REACTIVATE_PATH = `/api/stripe/subscription/${NON_EXISTENT_SUB_ID}/reactivate`;

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { 'X-Tenant-Id': 'fabricated' }, label: 'fabricated X-Tenant-Id header (tenant-scope probe)' }
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
	{ data: { tenantId: 'attacker_tenant' }, label: 'fabricated tenantId attempt (ignored)' },
	{ data: { userId: 'attacker_user' }, label: 'fabricated userId attempt (ignored)' },
	{ data: { subscriptionId: 'sub_other' }, label: 'fabricated subscriptionId in body (ignored — path wins)' },
	{ data: { padding: 'x'.repeat(500) }, label: 'mid-padded body (ignored)' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Subscription not found or access denied',
	'Subscription is not scheduled for cancellation',
	'Subscription reactivated successfully',
	'Failed to reactivate subscription'
] as const;

test.describe('API: /api/stripe/subscription/[subscriptionId]/reactivate POST body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${STRIPE_REACTIVATE_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_REACTIVATE_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of BODIES) {
		test(`POST ${STRIPE_REACTIVATE_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_REACTIVATE_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${STRIPE_REACTIVATE_PATH} returns 401 with the bare Unauthorized envelope`, async ({ request }) => {
		// `!session?.user` → 401 `{ error:
		// 'Unauthorized' }` (bare envelope).
		const response = await request.post(STRIPE_REACTIVATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test(`POST ${STRIPE_REACTIVATE_PATH} envelope shape has exactly one error key`, async ({ request }) => {
		const response = await request.post(STRIPE_REACTIVATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
		expect(body.message).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`POST ${STRIPE_REACTIVATE_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(STRIPE_REACTIVATE_PATH, {
			data: { cancelAtPeriodEnd: false }
		});
		const body = await response.json();
		expect(body.success).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`POST ${STRIPE_REACTIVATE_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(STRIPE_REACTIVATE_PATH),
			request.post(STRIPE_REACTIVATE_PATH, { data: {} }),
			request.post(STRIPE_REACTIVATE_PATH, { data: { cancelAtPeriodEnd: false } }),
			request.post(STRIPE_REACTIVATE_PATH, { data: { tenantId: 'attacker' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
				expect(body.message).not.toBe(msg);
			}
		}
	});

	test(`POST ${STRIPE_REACTIVATE_PATH} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.post(STRIPE_REACTIVATE_PATH);
		const responses = await Promise.all([
			request.post(STRIPE_REACTIVATE_PATH, { data: {} }),
			request.post(STRIPE_REACTIVATE_PATH, { data: { cancelAtPeriodEnd: true } }),
			request.post(STRIPE_REACTIVATE_PATH, { data: { cancelAtPeriodEnd: false } }),
			request.post(STRIPE_REACTIVATE_PATH, { data: { isAdmin: true } }),
			request.post(STRIPE_REACTIVATE_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(STRIPE_REACTIVATE_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${STRIPE_REACTIVATE_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(STRIPE_REACTIVATE_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(STRIPE_REACTIVATE_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(STRIPE_REACTIVATE_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(STRIPE_REACTIVATE_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_REACTIVATE_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// POST is the ONLY exported method.
		const responses = await Promise.all([
			request.get(STRIPE_REACTIVATE_PATH),
			request.put(STRIPE_REACTIVATE_PATH),
			request.patch(STRIPE_REACTIVATE_PATH),
			request.delete(STRIPE_REACTIVATE_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_REACTIVATE_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// The handler does NOT parse the body at all
		// (no `request.json()` call). Malformed JSON
		// must NOT cause a 5xx — the body is ignored
		// upstream of the auth gate.
		const responses = await Promise.all([
			request.post(STRIPE_REACTIVATE_PATH, { data: 'not-json' }),
			request.post(STRIPE_REACTIVATE_PATH, { data: '{ broken: json' }),
			request.post(STRIPE_REACTIVATE_PATH, { data: '{"cancelAtPeriodEnd":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_REACTIVATE_PATH} tenant-scoped DB-IDOR check is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, the tenant-scoped DB-
		// IDOR check runs:
		// `getSubscriptionByProviderSubscriptionId
		// ('stripe', subscriptionId)` → 404 if null.
		// The unauth branch must NEVER emit the
		// 'Subscription not found or access denied'
		// message from this branch.
		const response = await request.post(STRIPE_REACTIVATE_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		expect(body.error).not.toBe('Subscription not found or access denied');
	});

	test(`POST ${STRIPE_REACTIVATE_PATH} state-machine 400 pre-check is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The handler reads
		// `subscription.cancelAtPeriodEnd` from the
		// DB row and returns 400 if false BEFORE
		// calling the provider. The unauth branch
		// must NEVER emit the 400 'Subscription is
		// not scheduled for cancellation' message.
		const responses = await Promise.all([
			request.post(STRIPE_REACTIVATE_PATH),
			request.post(STRIPE_REACTIVATE_PATH, { data: { cancelAtPeriodEnd: false } }),
			request.post(STRIPE_REACTIVATE_PATH, { data: { force: true } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Subscription is not scheduled for cancellation');
		}
	});

	test(`POST ${STRIPE_REACTIVATE_PATH} updateSubscription / DB-sync / email-send chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders any of the
		// three post-auth side-effects before the
		// auth gate would surface a `data` field
		// with subscription details on the unauth
		// branch.
		const response = await request.post(STRIPE_REACTIVATE_PATH);
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBeUndefined();
		expect(body.message).not.toBe('Subscription reactivated successfully');
	});

	test(`POST ${STRIPE_REACTIVATE_PATH} catch-branch generic-500 is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// The catch is a single line returning 500
		// `'Failed to reactivate subscription'`. The
		// unauth branch must produce 401, NOT the
		// catch's 500 message.
		const responses = await Promise.all([
			request.post(STRIPE_REACTIVATE_PATH),
			request.post(STRIPE_REACTIVATE_PATH, { data: {} })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Failed to reactivate subscription');
		}
	});

	test(`POST ${STRIPE_REACTIVATE_PATH} body is COMPLETELY ignored on the unauth branch`, async ({ request }) => {
		// The handler does NOT call request.json().
		// EVERY body permutation must produce the
		// EXACT same status AND envelope.
		const baseline = await request.post(STRIPE_REACTIVATE_PATH);
		const baselineBody = await baseline.json();

		const responses = await Promise.all([
			request.post(STRIPE_REACTIVATE_PATH, { data: { cancelAtPeriodEnd: true } }),
			request.post(STRIPE_REACTIVATE_PATH, { data: { cancelAtPeriodEnd: false } }),
			request.post(STRIPE_REACTIVATE_PATH, { data: { force: true } }),
			request.post(STRIPE_REACTIVATE_PATH, { data: 'not-json' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});

	test(`POST ${STRIPE_REACTIVATE_PATH} unauth status is invariant across distinct subscription IDs`, async ({
		request
	}) => {
		// The tenant-scoped DB-IDOR check fires only
		// AFTER the auth gate. On the unauth branch,
		// the response must be IDENTICAL across
		// distinct subscription IDs — pinning that
		// the tenant-scoped DB read is NOT entered
		// upstream of the gate.
		const baseline = await request.post(STRIPE_REACTIVATE_PATH);
		const baselineBody = await baseline.json();

		const otherIds = ['sub_other_1', 'sub_other_2', 'cus_attacker', '../../../../etc/passwd'];
		for (const id of otherIds) {
			const response = await request.post(`/api/stripe/subscription/${encodeURIComponent(id)}/reactivate`);
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});
});
