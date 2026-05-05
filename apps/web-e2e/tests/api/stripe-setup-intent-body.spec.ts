import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Stripe setup-intent creation endpoint served
 * by the `POST` export of
 * `apps/web/app/api/stripe/setup-intent/route.ts`.
 *
 * `POST /api/stripe/setup-intent` is the **first per-
 * source-file POST smoke** the docs tree publishes
 * that pins a **zero-argument `POST()` handler
 * signature** — no `request` parameter at all. EVERY
 * prior per-source-file POST smoke takes either a
 * `NextRequest` or `Request` parameter. This is the
 * FIRST zero-arg POST contract in the rollout.
 *
 * It is also the **first per-source-file POST smoke**
 * that pins a **raw payment-provider object as the
 * success payload** (`return NextResponse.json
 * (setupIntent)` returns the Stripe SetupIntent object
 * verbatim, NO `{ success, data, message }` wrapper
 * envelope).
 *
 * Distinct from EVERY prior per-source-file POST
 * smoke:
 *
 *   - **Zero-argument `POST()` signature:** no
 *     `request` parameter. NO body parse, NO header
 *     read, NO query-param read.
 *   - **Bare 401 envelope** `{ error:
 *     'Unauthorized' }` — UNIQUE: distinct from the
 *     stripe-checkout sibling's TWO-key envelope
 *     `{ error, message }` and the canonical
 *     `{ success: false, error }` envelope.
 *   - **`!session?.user` gate** (matches stripe-
 *     checkout; distinct from auth-change-password's
 *     `!session?.user?.id`).
 *   - **Raw provider-object success payload:** no
 *     wrapper envelope. The response IS the Stripe
 *     SetupIntent object directly.
 *   - **Single-line catch:** `{ error: 'Failed to
 *     create setup intent' }` 500. The simplest
 *     catch in any per-source-file POST smoke.
 *   - **`stripeProvider.createSetupIntent(session.
 *     user)`** is the only load-bearing call — no
 *     pre-validation, no helper pipeline.
 *
 *   1. **`auth()` session lookup** —
 *      `!session?.user` → 401 `{ error:
 *      'Unauthorized' }` (bare envelope).
 *   2. **`getOrCreateStripeProvider()` singleton
 *      initialization** — happens AFTER the auth
 *      gate.
 *   3. **`stripeProvider.createSetupIntent(session.
 *      user)`** — load-bearing call with NO body
 *      parse, NO body validation.
 *   4. **Success payload** — raw SetupIntent object
 *      (NO wrapper envelope) with status 200.
 *   5. **Outer catch** — 500 `{ error: 'Failed to
 *      create setup intent' }`.
 *   6. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH`
 *      / `DELETE` must round-trip to a `< 500`
 *      status.
 */
const STRIPE_SETUP_INTENT_PATH = '/api/stripe/setup-intent';

const STRIPE_SETUP_INTENT_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { 'X-Stripe-Token': 'anything' }, label: 'fabricated X-Stripe-Token header' }
] as const;

const STRIPE_SETUP_INTENT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Body content is IGNORED (zero-arg handler).
	{ data: { foo: 'bar' }, label: 'arbitrary object body (ignored by handler)' },
	{ data: { customer: 'cus_attacker' }, label: 'fabricated customer override (ignored)' },
	{ data: { isAdmin: true }, label: 'isAdmin=true bypass attempt (ignored)' },
	{ data: { userId: 'fabricated' }, label: 'fabricated userId bypass attempt (ignored)' },

	// Malformed JSON probes — NOT parsed (zero-arg handler).
	{ data: 'not-json', label: 'raw text body (not parsed)' },
	{ data: '{ broken: json', label: 'malformed JSON body (not parsed)' },

	// Padded body.
	{ data: { padding: 'x'.repeat(2_000) }, label: 'large padded body' }
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = ['Failed to create setup intent'] as const;

test.describe('API: /api/stripe/setup-intent POST body / header surface', () => {
	for (const { headers, label } of STRIPE_SETUP_INTENT_HEADERS) {
		test(`POST ${STRIPE_SETUP_INTENT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_SETUP_INTENT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of STRIPE_SETUP_INTENT_BODIES) {
		test(`POST ${STRIPE_SETUP_INTENT_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_SETUP_INTENT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${STRIPE_SETUP_INTENT_PATH} returns 401 with the bare Unauthorized envelope`, async ({ request }) => {
		// `!session?.user` → 401 `{ error:
		// 'Unauthorized' }` (bare envelope, NO success
		// key).
		const response = await request.post(STRIPE_SETUP_INTENT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ error: 'Unauthorized' });
	});

	test(`POST ${STRIPE_SETUP_INTENT_PATH} envelope shape has exactly one error key (NO success key)`, async ({
		request
	}) => {
		// Strict envelope-shape: exactly `error` key,
		// NO `success`/`message`/`data` keys.
		const response = await request.post(STRIPE_SETUP_INTENT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body)).toEqual(['error']);
		expect(body.success).toBeUndefined();
		expect(body.message).toBeUndefined();
		expect(body.data).toBeUndefined();
	});

	test(`POST ${STRIPE_SETUP_INTENT_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(STRIPE_SETUP_INTENT_PATH),
			request.post(STRIPE_SETUP_INTENT_PATH, { data: {} }),
			request.post(STRIPE_SETUP_INTENT_PATH, { data: { customer: 'cus_attacker' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			for (const msg of FORBIDDEN_POST_AUTH_MESSAGES) {
				expect(body.error).not.toBe(msg);
			}
		}
	});

	test(`POST ${STRIPE_SETUP_INTENT_PATH} does NOT echo a SetupIntent client_secret on the unauth branch`, async ({
		request
	}) => {
		// Success payload is the RAW Stripe SetupIntent
		// object with `client_secret` field. The unauth
		// branch must NEVER expose this field. A
		// regression that ran createSetupIntent before
		// the auth gate would surface the
		// `client_secret` here — a CRITICAL leak (the
		// secret authorizes payment-method attachment).
		const response = await request.post(STRIPE_SETUP_INTENT_PATH);
		const body = await response.json();
		expect(body.client_secret).toBeUndefined();
		expect(body.id).toBeUndefined();
		expect(body.customer).toBeUndefined();
	});

	test(`POST ${STRIPE_SETUP_INTENT_PATH} does NOT echo any Stripe SetupIntent fields on the unauth branch`, async ({
		request
	}) => {
		// Pin the full set of SetupIntent fields that
		// must NEVER appear: id / client_secret /
		// status / usage / customer / created.
		const FORBIDDEN_SETUP_INTENT_FIELDS = [
			'id',
			'client_secret',
			'status',
			'usage',
			'customer',
			'created'
		] as const;

		const response = await request.post(STRIPE_SETUP_INTENT_PATH);
		const body = await response.json();
		for (const field of FORBIDDEN_SETUP_INTENT_FIELDS) {
			expect(body[field]).toBeUndefined();
		}
	});

	test(`POST ${STRIPE_SETUP_INTENT_PATH} body content is IGNORED (zero-arg handler signature)`, async ({
		request
	}) => {
		// The handler is `export async function POST()`
		// with no `request` parameter. So the body is
		// completely ignored. Pin that arbitrary body
		// content does not change the response.
		const baseline = await request.post(STRIPE_SETUP_INTENT_PATH);
		const baselineBody = await baseline.json();

		const responses = await Promise.all([
			request.post(STRIPE_SETUP_INTENT_PATH, { data: {} }),
			request.post(STRIPE_SETUP_INTENT_PATH, { data: { foo: 'bar' } }),
			request.post(STRIPE_SETUP_INTENT_PATH, { data: { customer: 'cus_x' } }),
			request.post(STRIPE_SETUP_INTENT_PATH, { data: 'not-json' }),
			request.post(STRIPE_SETUP_INTENT_PATH, { data: '{ broken: json' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
			const body = await response.json();
			expect(body).toEqual(baselineBody);
		}
	});

	test(`POST ${STRIPE_SETUP_INTENT_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(STRIPE_SETUP_INTENT_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(STRIPE_SETUP_INTENT_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(STRIPE_SETUP_INTENT_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(STRIPE_SETUP_INTENT_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(STRIPE_SETUP_INTENT_PATH, { headers: { 'X-Stripe-Token': 'anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_SETUP_INTENT_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// POST is the ONLY exported method.
		const responses = await Promise.all([
			request.get(STRIPE_SETUP_INTENT_PATH),
			request.put(STRIPE_SETUP_INTENT_PATH),
			request.patch(STRIPE_SETUP_INTENT_PATH),
			request.delete(STRIPE_SETUP_INTENT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_SETUP_INTENT_PATH} createSetupIntent + provider initialization are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// A regression that re-orders
		// `createSetupIntent(...)` before the gate
		// would surface a CRITICAL leak: the
		// `client_secret` field would appear in the
		// unauth response (giving any caller the
		// ability to attach a payment method to the
		// fabricated customer).
		const response = await request.post(STRIPE_SETUP_INTENT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.error).toBe('Unauthorized');
		expect(body.client_secret).toBeUndefined();
		// Catch-branch message must NOT appear either.
		expect(body.error).not.toBe('Failed to create setup intent');
	});

	test(`POST ${STRIPE_SETUP_INTENT_PATH} catch-branch message is NOT echoed on the unauth branch`, async ({
		request
	}) => {
		// The outer catch returns 500 with `{ error:
		// 'Failed to create setup intent' }`. The
		// unauth branch must NEVER produce this
		// message — it should always be the canonical
		// 'Unauthorized' bare envelope.
		const responses = await Promise.all([
			request.post(STRIPE_SETUP_INTENT_PATH),
			request.post(STRIPE_SETUP_INTENT_PATH, { data: {} }),
			request.post(STRIPE_SETUP_INTENT_PATH, { data: 'not-json' })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Failed to create setup intent');
		}
	});
});
