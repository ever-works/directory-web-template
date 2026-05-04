import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Solidgate payment-provider webhook endpoint
 * served by the `POST` export of
 * `apps/web/app/api/solidgate/webhook/route.ts`.
 *
 * `POST /api/solidgate/webhook` is the **third per-
 * source-file webhook POST smoke** the docs tree
 * publishes (after
 * [`polar-webhook-body-spec.md`](polar-webhook-body-spec.md)
 * and
 * [`lemonsqueezy-webhook-body-spec.md`](lemonsqueezy-webhook-body-spec.md)).
 * The existing multi-provider `webhooks.spec.ts`
 * covers Stripe / LemonSqueezy / Polar / Solidgate
 * with two assertions each — GET-not-5xx and POST-
 * unauthenticated-rejected; this spec drills into the
 * Solidgate webhook handler specifically.
 *
 * Distinct from BOTH the polar AND lemonsqueezy
 * siblings:
 *
 *   - **Two-header signature fallback:** Solidgate
 *     reads `x-signature || solidgate-signature` —
 *     UNIQUE: NEITHER polar (`webhook-signature`) NOR
 *     lemonsqueezy (`x-signature` only) uses this
 *     two-header fallback pattern.
 *   - **Manual JSON parse like polar but NO `validate
 *     WebhookPayload` check:** the handler calls
 *     `JSON.parse(body)` (matching polar) but DOES
 *     NOT validate the parsed shape (distinct from
 *     polar's `validateWebhookPayload(body)` 4-tier
 *     chain).
 *   - **In-memory idempotency Set:** the FIRST
 *     webhook smoke that pins an idempotency
 *     contract. `processedWebhooks: Set<string>`
 *     tracks `webhookId` for 24 hours via
 *     `setTimeout(() => processedWebhooks.delete
 *     (webhookId), WEBHOOK_EXPIRY_MS)`. Duplicate
 *     webhook IDs return **200** `{ received: true }`
 *     (NOT 400) — the FIRST webhook smoke with TWO
 *     200-success branches.
 *   - **Switch dispatcher accepting BOTH enum AND
 *     string values:** 9 event types are matched on
 *     BOTH the `WebhookEventType.PAYMENT_SUCCEEDED`
 *     enum AND the lowercase `'payment_succeeded'`
 *     string. UNIQUE: lemonsqueezy uses ONLY the
 *     mapped enum, polar uses ONLY `webhookResult.
 *     type` from the provider response.
 *   - **GET export with informative message:** the
 *     route exports a GET handler that returns 200
 *     `{ message: 'Solidgate webhook endpoint',
 *     instructions: '...', method: 'POST' }` — UNIQUE:
 *     polar and lemonsqueezy export only POST.
 *   - **Same 400-default catch as polar +
 *     lemonsqueezy:** outer catch is raw
 *     `NextResponse.json({ error: 'Webhook processing
 *     failed' }, { status: 400 })`.
 *
 *   1. **Raw-body read via `await request.text()`** —
 *      no auth gate (webhooks use signature
 *      verification, not session auth).
 *   2. **Two-header signature fallback** —
 *      `x-signature || solidgate-signature`. Missing
 *      BOTH → 400 `{ error: 'No signature
 *      provided' }`.
 *   3. **Manual JSON parse via `JSON.parse(body)`**
 *      INSIDE the outer `try` block — failure cascades
 *      to the catch (400 `'Webhook processing
 *      failed'`).
 *   4. **Idempotency check** — `webhookId =
 *      parsedBody.id || x-request-id`. If
 *      `processedWebhooks.has(webhookId)` → 200
 *      `{ received: true }` (NOT 400 — duplicates
 *      are silently acked).
 *   5. **`solidgateProvider.handleWebhook(parsedBody,
 *      signature, body)`** — load-bearing signature-
 *      verification call. Receives parsed body, raw
 *      signature, AND raw body string.
 *   6. **`!webhookResult.received` check** — 400
 *      `{ error: 'Webhook not processed' }`.
 *   7. **Switch-statement event dispatcher** — 9
 *      event types matched on BOTH enum AND string.
 *      Default branch only `console.log`s.
 *   8. **Success payload** — `{ received: true }`
 *      with status 200.
 *   9. **Outer catch** — `console.error` + 400
 *      `{ error: 'Webhook processing failed' }`.
 *  10. **Method-resolution surface** — the route
 *      exports `GET` AND `POST`. `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const SOLIDGATE_WEBHOOK_PATH = '/api/solidgate/webhook';

const SOLIDGATE_WEBHOOK_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	// Solidgate reads x-signature OR solidgate-signature (two-header fallback).
	{ headers: { 'x-signature': 'fabricated' }, label: 'fabricated x-signature header' },
	{ headers: { 'solidgate-signature': 'fabricated' }, label: 'fabricated solidgate-signature header (fallback)' },
	{
		headers: { 'x-signature': 'sha256=abcdef0123456789' },
		label: 'sha256-prefixed x-signature header'
	},

	// Polar headers should be ignored by solidgate.
	{ headers: { 'webhook-signature': 'fabricated' }, label: 'polar-shape webhook-signature header (ignored)' },
	{ headers: { 'webhook-timestamp': '1234567890' }, label: 'polar-shape webhook-timestamp header (ignored)' },

	// x-request-id is read for idempotency.
	{ headers: { 'x-request-id': 'fabricated-req-id' }, label: 'x-request-id header for idempotency' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' }
] as const;

const SOLIDGATE_WEBHOOK_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Valid Solidgate event-shape probes.
	{
		data: {
			id: 'evt_test',
			type: 'payment.succeeded',
			data: { id: 'pay_test' }
		},
		label: 'valid payment.succeeded event'
	},
	{
		data: {
			id: 'evt_test',
			type: 'subscription.created',
			data: { id: 'sub_test' }
		},
		label: 'valid subscription.created event'
	},

	// Test snake_case event names (handler accepts both).
	{
		data: { id: 'evt_test', type: 'payment_succeeded', data: { id: 'pay_x' } },
		label: 'snake_case payment_succeeded event'
	},

	// Type-violation probes.
	{ data: { type: 1 }, label: 'numeric type' },

	// Bypass attempts.
	{
		data: { id: 'evt_x', type: 'payment.succeeded', data: { id: 'pay_x' }, isAdmin: true },
		label: 'isAdmin=true bypass attempt'
	},
	{
		data: { id: 'evt_x', type: 'payment.succeeded', data: { id: 'pay_x' }, padding: 'x'.repeat(2_000) },
		label: 'large padded body'
	},

	// Malformed body probes.
	{ data: 'not-json-at-all', label: 'raw text body (no JSON)' },
	{ data: '{ broken: json', label: 'malformed JSON body' }
] as const;

const ALLOWED_PRE_DELIVERY_ERRORS = [
	'No signature provided',
	'Webhook not processed',
	'Webhook processing failed'
] as const;

test.describe('API: /api/solidgate/webhook POST body / header surface', () => {
	for (const { headers, label } of SOLIDGATE_WEBHOOK_HEADERS) {
		test(`POST ${SOLIDGATE_WEBHOOK_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(SOLIDGATE_WEBHOOK_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of SOLIDGATE_WEBHOOK_BODIES) {
		test(`POST ${SOLIDGATE_WEBHOOK_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(SOLIDGATE_WEBHOOK_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${SOLIDGATE_WEBHOOK_PATH} returns 400 with No signature provided when both signature headers are missing`, async ({
		request
	}) => {
		// The two-header fallback fires only if BOTH
		// x-signature AND solidgate-signature are
		// missing. Without either, the gate produces
		// the 400 envelope.
		const response = await request.post(SOLIDGATE_WEBHOOK_PATH, {
			data: { id: 'evt_test', type: 'payment.succeeded', data: {} },
			headers: { 'content-type': 'application/json' }
		});
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body).toEqual({ error: 'No signature provided' });
	});

	test(`POST ${SOLIDGATE_WEBHOOK_PATH} accepts solidgate-signature as fallback when x-signature is missing`, async ({
		request
	}) => {
		// A request with solidgate-signature but NOT
		// x-signature must NOT produce 'No signature
		// provided' — the fallback header satisfies the
		// gate. The request will still fail signature
		// verification, but with a different envelope.
		const response = await request.post(SOLIDGATE_WEBHOOK_PATH, {
			data: { id: 'evt_test', type: 'payment.succeeded', data: {} },
			headers: { 'solidgate-signature': 'fabricated-fallback' }
		});

		// The signature is invalid, so the response
		// will be 400 'Webhook processing failed' or
		// 'Webhook not processed' — but NOT 'No
		// signature provided'.
		expect(response.status()).toBeGreaterThanOrEqual(400);
		expect(response.status()).toBeLessThan(500);

		const body = await response.json();
		expect(body.error).not.toBe('No signature provided');
	});

	test(`POST ${SOLIDGATE_WEBHOOK_PATH} envelope shape on rejected branches has exactly one error key`, async ({
		request
	}) => {
		// All rejection envelopes are `{ error: '...' }`.
		const responses = await Promise.all([
			request.post(SOLIDGATE_WEBHOOK_PATH),
			request.post(SOLIDGATE_WEBHOOK_PATH, {
				data: { id: 'evt_test', type: 'payment.succeeded', data: {} }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(Object.keys(body)).toEqual(['error']);
			expect(body.received).toBeUndefined();
			expect(body.success).toBeUndefined();
		}
	});

	test(`POST ${SOLIDGATE_WEBHOOK_PATH} does NOT echo the success-branch received key on rejected branches`, async ({
		request
	}) => {
		// Success branch returns `{ received: true }`.
		// All rejection branches MUST omit `received`.
		const responses = await Promise.all([
			request.post(SOLIDGATE_WEBHOOK_PATH),
			request.post(SOLIDGATE_WEBHOOK_PATH, { data: {} }),
			request.post(SOLIDGATE_WEBHOOK_PATH, {
				data: { id: 'evt_test', type: 'payment.succeeded', data: {} }
			}),
			request.post(SOLIDGATE_WEBHOOK_PATH, {
				data: { id: 'evt_test', type: 'payment.succeeded', data: {} },
				headers: { 'x-signature': 'deadbeef' }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.received).toBeUndefined();
		}
	});

	test(`POST ${SOLIDGATE_WEBHOOK_PATH} catch branch defaults to 400 (NOT 500) for any unhandled error`, async ({
		request
	}) => {
		// The outer catch returns 400 (NOT 500). A
		// regression that flips this to 500 would
		// surface here.
		const responses = await Promise.all([
			// Malformed JSON inside the try block: cascades to catch.
			request.post(SOLIDGATE_WEBHOOK_PATH, {
				data: 'malformed{',
				headers: { 'x-signature': 'fabricated' }
			}),
			// Invalid signature: cascades to 'Webhook not processed' or catch.
			request.post(SOLIDGATE_WEBHOOK_PATH, {
				data: { id: 'evt_test', type: 'payment.succeeded', data: {} },
				headers: { 'x-signature': 'invalid' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeGreaterThanOrEqual(400);
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${SOLIDGATE_WEBHOOK_PATH} every error message comes from the allowed list`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(SOLIDGATE_WEBHOOK_PATH),
			request.post(SOLIDGATE_WEBHOOK_PATH, { data: {} }),
			request.post(SOLIDGATE_WEBHOOK_PATH, {
				data: { id: 'evt_test', type: 'payment.succeeded', data: {} }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(typeof body.error).toBe('string');
			expect(ALLOWED_PRE_DELIVERY_ERRORS).toContain(body.error);
		}
	});

	test(`POST ${SOLIDGATE_WEBHOOK_PATH} ignores polar-shape webhook-signature header (only x-signature OR solidgate-signature satisfy the gate)`, async ({
		request
	}) => {
		// Polar's `webhook-signature` header should
		// NOT satisfy the solidgate two-header fallback
		// gate.
		const response = await request.post(SOLIDGATE_WEBHOOK_PATH, {
			data: { id: 'evt_test', type: 'payment.succeeded', data: {} },
			headers: { 'webhook-signature': 'fabricated', 'webhook-timestamp': '1234567890' }
		});
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body).toEqual({ error: 'No signature provided' });
	});

	test(`POST ${SOLIDGATE_WEBHOOK_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(SOLIDGATE_WEBHOOK_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(SOLIDGATE_WEBHOOK_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(SOLIDGATE_WEBHOOK_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(SOLIDGATE_WEBHOOK_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`GET ${SOLIDGATE_WEBHOOK_PATH} returns 200 with the informative-message envelope`, async ({ request }) => {
		// Solidgate is the ONLY webhook route that
		// exports a GET handler. The GET returns 200
		// with `{ message, instructions, method: 'POST' }`.
		const response = await request.get(SOLIDGATE_WEBHOOK_PATH);
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body.message).toBe('Solidgate webhook endpoint');
		expect(body.method).toBe('POST');
	});

	test(`POST ${SOLIDGATE_WEBHOOK_PATH} cross-method probe (PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// GET and POST are exported. PUT / PATCH /
		// DELETE must round-trip to `< 500`.
		const responses = await Promise.all([
			request.put(SOLIDGATE_WEBHOOK_PATH),
			request.patch(SOLIDGATE_WEBHOOK_PATH),
			request.delete(SOLIDGATE_WEBHOOK_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${SOLIDGATE_WEBHOOK_PATH} signature-verification call is NOT entered without any signature header`, async ({
		request
	}) => {
		// A regression that skipped the
		// `if (!signature)` check would surface here:
		// the response would either be 200
		// `{ received: true }` or a different 400
		// message. Both fail.
		const response = await request.post(SOLIDGATE_WEBHOOK_PATH, {
			data: {
				id: 'evt_test',
				type: 'payment.succeeded',
				data: { id: 'pay_test' }
			}
		});
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body.error).toBe('No signature provided');
		expect(body.received).toBeUndefined();
	});

	test(`POST ${SOLIDGATE_WEBHOOK_PATH} switch-statement event dispatcher is NOT entered without valid signature`, async ({
		request
	}) => {
		// Without a valid signature, the dispatcher
		// must NEVER be entered. The response must
		// NEVER echo `received: true`.
		const responses = await Promise.all([
			request.post(SOLIDGATE_WEBHOOK_PATH, {
				data: {
					id: 'evt_x',
					type: 'payment.succeeded',
					data: { id: 'pay_x' }
				},
				headers: { 'x-signature': 'deadbeef' }
			}),
			request.post(SOLIDGATE_WEBHOOK_PATH, {
				data: {
					id: 'evt_x',
					type: 'subscription_created',
					data: { id: 'sub_x' }
				},
				headers: { 'solidgate-signature': 'invalid' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeGreaterThanOrEqual(400);
			expect(response.status()).toBeLessThan(500);
			const body = await response.json();
			expect(body.received).toBeUndefined();
		}
	});
});
