import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the LemonSqueezy plan-update endpoint served by
 * the `POST` export of
 * `apps/web/app/api/lemonsqueezy/update-plan/route.ts`.
 *
 * `POST /api/lemonsqueezy/update-plan` is the **third
 * sibling** in the LemonSqueezy subscription-management
 * trio (cancel + reactivate + update-plan), all sharing
 * the same email-gated auth contract, THREE-key 401
 * envelope with `code: 'AUTH_REQUIRED'`, Zod `safeParse`
 * validation, and `timestamp` field in the success
 * envelope.
 *
 * Distinct from the cancel + reactivate siblings:
 *
 *   - **Multi-field Zod schema with defaults:** the
 *     `updatePlanSchema` has TWO required fields
 *     (`subscriptionId`, `variantId`) AND FOUR
 *     OPTIONAL fields with defaults (`proration`,
 *     `invoiceImmediately`, `disableProrations`,
 *     `billingAnchor`). The FIRST per-source-file
 *     POST smoke pinning a multi-field-with-defaults
 *     Zod schema.
 *   - **`z.coerce.number().positive()`:** the FIRST
 *     per-source-file POST smoke pinning a Zod
 *     coerce-number contract (string-to-number
 *     coercion via `z.coerce`).
 *   - **`z.enum` with default:** `proration: z.enum
 *     (['immediate', 'next_period']).optional()
 *     .default('immediate')`. The FIRST per-source-
 *     file POST smoke pinning a Zod enum-with-
 *     default contract.
 *   - **`z.number().min(1).max(31)`** for
 *     `billingAnchor` — pins a day-of-month range
 *     constraint.
 *   - **Plan-update-specific metadata** — writes 7
 *     metadata fields including `session.user.email`
 *     as `updatedBy`. Same email-in-metadata pattern
 *     as reactivate sibling, but with FOUR
 *     additional flag fields (`proration`,
 *     `invoiceImmediately`, `disableProrations`,
 *     `billingAnchor`).
 *
 *   1. **`auth()` session lookup** — `!session?.
 *      user?.email` → 401 `{ error: 'Unauthorized',
 *      message: 'Authentication required', code:
 *      'AUTH_REQUIRED' }` (same THREE-key envelope
 *      as cancel + reactivate siblings).
 *   2. **JSON body parse** via `await request.json()`
 *      AFTER auth gate.
 *   3. **`updatePlanSchema.safeParse(body)`** with
 *      multi-field schema. Failure → 400 `{ error:
 *      'Invalid request data', details: <issues>,
 *      code: 'VALIDATION_ERROR' }`.
 *   4. **`getOrCreateLemonsqueezyProvider()`
 *      singleton initialization**.
 *   5. **`lemonsqueezy.updateSubscription({
 *      subscriptionId, priceId: variantId.toString(),
 *      metadata: { action, proration,
 *      invoiceImmediately, disableProrations,
 *      billingAnchor, updatedAt, updatedBy } })`**
 *      — load-bearing call.
 *   6. **Success payload** — `{ success: true,
 *      data: <result>, message: 'Subscription plan
 *      updated successfully', timestamp: <ISO> }`.
 *   7. **Outer catch** — `safeErrorResponse(error,
 *      'Failed to update subscription plan')`.
 *   8. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const LEMONSQUEEZY_UPDATE_PLAN_PATH = '/api/lemonsqueezy/update-plan';

const HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },

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
	{ data: { subscriptionId: 'sub_x' }, label: 'no variantId' },
	{ data: { variantId: 123 }, label: 'no subscriptionId' },

	// Valid bodies.
	{ data: { subscriptionId: 'sub_x', variantId: 123 }, label: 'minimal valid' },
	{ data: { subscriptionId: 'sub_x', variantId: '456' }, label: 'string variantId (would coerce if reachable)' },
	{
		data: {
			subscriptionId: 'sub_x',
			variantId: 123,
			proration: 'immediate',
			invoiceImmediately: false
		},
		label: 'partial-defaults valid'
	},
	{
		data: {
			subscriptionId: 'sub_x',
			variantId: 456,
			proration: 'next_period',
			invoiceImmediately: true,
			disableProrations: true,
			billingAnchor: 15
		},
		label: 'full-fields valid'
	},

	// Validation probes.
	{ data: { subscriptionId: 'sub_x', variantId: -1 }, label: 'negative variantId (would 400 if reachable)' },
	{
		data: { subscriptionId: 'sub_x', variantId: 123, proration: 'invalid_enum' },
		label: 'invalid proration enum (would 400 if reachable)'
	},
	{
		data: { subscriptionId: 'sub_x', variantId: 123, billingAnchor: 32 },
		label: 'out-of-range billingAnchor (would 400 if reachable)'
	},
	{
		data: { subscriptionId: 'sub_x', variantId: 123, billingAnchor: 0 },
		label: 'zero billingAnchor (would 400 if reachable)'
	},

	// Bypass attempts.
	{ data: { subscriptionId: 'sub_x', variantId: 1, isAdmin: true }, label: 'isAdmin=true bypass' },
	{
		data: { subscriptionId: 'sub_x', variantId: 1, updatedBy: 'attacker@example.com' },
		label: 'updatedBy override (would override session email if reachable)'
	}
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Invalid request data',
	'Subscription plan updated successfully',
	'Failed to update subscription plan'
] as const;

test.describe('API: /api/lemonsqueezy/update-plan POST body / header surface', () => {
	for (const { headers, label } of HEADERS) {
		test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} (${label}) responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of BODIES) {
		test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} returns 401 with the THREE-key Unauthorized envelope`, async ({
		request
	}) => {
		const response = await request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({
			error: 'Unauthorized',
			message: 'Authentication required',
			code: 'AUTH_REQUIRED'
		});
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} envelope shape has exactly error / message / code keys`, async ({
		request
	}) => {
		const response = await request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['code', 'error', 'message']);
		expect(body.code).toBe('AUTH_REQUIRED');
		expect(body.success).toBeUndefined();
		expect(body.timestamp).toBeUndefined();
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
			data: { subscriptionId: 'sub_x', variantId: 1 }
		});
		const body = await response.json();
		expect(body.success).toBeUndefined();
		expect(body.data).toBeUndefined();
		expect(body.timestamp).toBeUndefined();
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
				data: { subscriptionId: 'sub_x', variantId: 1 }
			}),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
				data: { subscriptionId: 'sub_x', variantId: 1, billingAnchor: 32 }
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

	test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} does NOT echo VALIDATION_ERROR or UPDATE_FAILED codes on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
				data: { subscriptionId: 'sub_x', variantId: -1 }
			}),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
				data: { subscriptionId: 'sub_x', variantId: 1, proration: 'invalid' }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.code).not.toBe('VALIDATION_ERROR');
			expect(body.code).not.toBe('UPDATE_FAILED');
			expect(body.code).toBe('AUTH_REQUIRED');
		}
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} caller-supplied updatedBy / metadata fields are NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// The handler writes session.user.email to
		// metadata.updatedBy. A caller-supplied
		// `updatedBy` would be IGNORED by the handler
		// (because the handler explicitly sets it from
		// session) but might be echoed if the unauth
		// response leaked the input. Pin no leak.
		const response = await request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
			data: {
				subscriptionId: 'sub_x',
				variantId: 1,
				updatedBy: 'attacker@example.com'
			}
		});
		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('attacker@example.com');
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH);
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
				data: { subscriptionId: 'sub_x', variantId: 1 }
			}),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
				data: {
					subscriptionId: 'sub_x',
					variantId: 1,
					proration: 'next_period',
					billingAnchor: 15
				}
			}),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
				data: { subscriptionId: 'sub_x', variantId: 1, isAdmin: true }
			}),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, { headers: { 'X-User-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} does NOT branch on side-channel cookies / headers`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
				headers: { Cookie: 'next-auth.session-token=fabricated' }
			}),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(LEMONSQUEEZY_UPDATE_PLAN_PATH),
			request.put(LEMONSQUEEZY_UPDATE_PLAN_PATH),
			request.patch(LEMONSQUEEZY_UPDATE_PLAN_PATH),
			request.delete(LEMONSQUEEZY_UPDATE_PLAN_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, { data: 'not-json' }),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, { data: '{ broken: json' }),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, { data: '{"subscriptionId":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.code).toBe('AUTH_REQUIRED');
		}
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} multi-field validation chain is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, missing required fields,
		// invalid enum values, out-of-range billingAnchor,
		// and negative variantId all surface 'Invalid
		// request data' 400 with `details`. The unauth
		// branch must NEVER emit these.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, { data: { subscriptionId: 'sub_x' } }),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
				data: { subscriptionId: 'sub_x', variantId: -1 }
			}),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
				data: { subscriptionId: 'sub_x', variantId: 1, proration: 'invalid' }
			}),
			request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
				data: { subscriptionId: 'sub_x', variantId: 1, billingAnchor: 32 }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Invalid request data');
			expect(body.details).toBeUndefined();
		}
	});

	test(`POST ${LEMONSQUEEZY_UPDATE_PLAN_PATH} updateSubscription call (with metadata write) is NOT entered on the unauth branch`, async ({
		request
	}) => {
		const response = await request.post(LEMONSQUEEZY_UPDATE_PLAN_PATH, {
			data: { subscriptionId: 'sub_test', variantId: 123, proration: 'immediate' }
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBeUndefined();
		expect(body.message).not.toBe('Subscription plan updated successfully');
	});
});
