import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the LemonSqueezy payment-provider webhook endpoint
 * served by the `POST` export of
 * `apps/web/app/api/lemonsqueezy/webhook/route.ts`.
 *
 * `POST /api/lemonsqueezy/webhook` is the **second
 * per-source-file webhook POST smoke** the docs tree
 * publishes (after
 * [`polar-webhook-body-spec.md`](polar-webhook-body-spec.md)).
 * The existing multi-provider `webhooks.spec.ts`
 * covers Stripe / LemonSqueezy / Polar / Solidgate
 * with two assertions each — GET-not-5xx and POST-
 * unauthenticated-rejected; this spec drills into the
 * LemonSqueezy webhook handler specifically.
 *
 * Distinct from the sibling
 * `polar-webhook-body.spec.ts`:
 *
 *   - **Different signature header:** LemonSqueezy
 *     uses `x-signature` (lowercase, single field);
 *     Polar uses `webhook-signature` +
 *     `webhook-timestamp` + `webhook-id`.
 *   - **NO manual JSON parse:** the handler reads the
 *     raw body via `await request.text()` and passes
 *     it as a STRING to
 *     `lemonSqueezyProvider.handleWebhook(body,
 *     signature)`. The provider parses the body
 *     itself; the route does NOT call
 *     `JSON.parse(bodyText)`.
 *   - **Simpler 2-tier rejection chain:** only `'No
 *     signature provided'` (400) and `'Webhook not
 *     processed'` (400). Polar has 4 tiers (Invalid
 *     JSON payload / Invalid webhook payload / No
 *     signature provided / Webhook not processed).
 *   - **Switch-statement event dispatcher:**
 *     `webhookResult.type` is mapped via
 *     `mapLemonSqueezyEventType(...)` and dispatched
 *     into one of 8 distinct handlers (subscription
 *     created / updated / cancelled, payment
 *     succeeded / failed, subscription payment
 *     succeeded / failed, trial ending). The default
 *     branch only `console.log`s the unhandled
 *     event.
 *   - **Same 400-default catch as polar:** outer
 *     catch is raw `NextResponse.json({ error:
 *     'Webhook processing failed' }, { status:
 *     400 })` — NOT `safeErrorResponse(...)` like
 *     polar uses.
 *
 *   1. **Raw-body read via `await request.text()`** —
 *      no auth gate (webhooks use signature
 *      verification, not session auth).
 *   2. **`x-signature` header presence check** —
 *      missing → 400 `{ error: 'No signature
 *      provided' }`.
 *   3. **`lemonSqueezyProvider.handleWebhook(body,
 *      signature)`** — load-bearing signature-
 *      verification call. Note: receives the RAW
 *      body STRING, not a parsed object.
 *   4. **`!webhookResult.received` check** — 400
 *      `{ error: 'Webhook not processed' }`.
 *   5. **`mapLemonSqueezyEventType(webhookResult.
 *      type)` mapping** — translates LemonSqueezy
 *      event names to internal `WebhookEventType`
 *      enum (8 mapped + default).
 *   6. **Switch-statement event dispatcher** —
 *      dispatches to one of 8 handler functions based
 *      on `eventType`. Default branch only
 *      `console.log`s.
 *   7. **Success payload** — `{ received: true }`
 *      with status 200.
 *   8. **Outer catch** — `console.error` + 400
 *      `{ error: 'Webhook processing failed' }`.
 *      NOT `safeErrorResponse(...)`. Same 400-default
 *      as polar but via raw `NextResponse.json` call.
 *   9. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const LEMONSQUEEZY_WEBHOOK_PATH = '/api/lemonsqueezy/webhook';

const LEMONSQUEEZY_WEBHOOK_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	// LemonSqueezy uses `x-signature` (lowercase, single field).
	{ headers: { 'x-signature': 'fabricated' }, label: 'fabricated x-signature header' },
	{ headers: { 'x-signature': 'deadbeef0123456789abcdef' }, label: 'hex x-signature header' },
	{ headers: { 'x-signature': '' }, label: 'empty x-signature header' },

	// Polar headers should be IGNORED (this route only reads x-signature).
	{ headers: { 'webhook-signature': 'fabricated' }, label: 'polar-shape webhook-signature header (ignored)' },
	{ headers: { 'webhook-timestamp': '1234567890' }, label: 'polar-shape webhook-timestamp header (ignored)' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' }
] as const;

const LEMONSQUEEZY_WEBHOOK_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Valid LemonSqueezy event-shape probes (would proxy to provider if reachable).
	{
		data: {
			meta: { event_name: 'subscription_created' },
			data: { id: 'sub_test', type: 'subscriptions' }
		},
		label: 'valid subscription_created event'
	},
	{
		data: {
			meta: { event_name: 'order_created' },
			data: { id: 'ord_test', type: 'orders' }
		},
		label: 'valid order_created event'
	},
	{
		data: {
			meta: { event_name: 'subscription_payment_success' },
			data: { id: 'pay_test', type: 'subscription_invoices' }
		},
		label: 'valid subscription_payment_success event'
	},

	// Type-violation probes.
	{ data: { meta: 'not-object' }, label: 'string meta' },
	{ data: { meta: { event_name: 1 } }, label: 'numeric event_name' },

	// Bypass attempts.
	{
		data: {
			meta: { event_name: 'subscription_created' },
			data: { id: 'sub_x' },
			isAdmin: true
		},
		label: 'isAdmin=true bypass attempt'
	},
	{
		data: {
			meta: { event_name: 'subscription_created' },
			data: { id: 'sub_x' },
			padding: 'x'.repeat(2_000)
		},
		label: 'large padded body'
	},

	// Malformed body probes (no JSON parse, so these reach the provider as raw text).
	{ data: 'not-json-at-all', label: 'raw text body (no JSON)' },
	{ data: '{ broken: json', label: 'malformed JSON body' }
] as const;

const ALLOWED_PRE_DELIVERY_ERRORS = [
	'No signature provided',
	'Webhook not processed',
	'Webhook processing failed'
] as const;

test.describe('API: /api/lemonsqueezy/webhook POST body / header surface', () => {
	for (const { headers, label } of LEMONSQUEEZY_WEBHOOK_HEADERS) {
		test(`POST ${LEMONSQUEEZY_WEBHOOK_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(LEMONSQUEEZY_WEBHOOK_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of LEMONSQUEEZY_WEBHOOK_BODIES) {
		test(`POST ${LEMONSQUEEZY_WEBHOOK_PATH} with ${label} responds without a server error`, async ({
			request
		}) => {
			const response = await request.post(LEMONSQUEEZY_WEBHOOK_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${LEMONSQUEEZY_WEBHOOK_PATH} returns 400 with No signature provided when x-signature header is missing`, async ({
		request
	}) => {
		// The x-signature header presence check is the
		// FIRST gate (no JSON parse runs before it).
		// Missing header must surface this 400 envelope.
		const response = await request.post(LEMONSQUEEZY_WEBHOOK_PATH, {
			data: { meta: { event_name: 'subscription_created' } },
			headers: { 'content-type': 'application/json' }
		});
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body).toEqual({ error: 'No signature provided' });
	});

	test(`POST ${LEMONSQUEEZY_WEBHOOK_PATH} envelope shape on rejected branches has exactly one error key`, async ({
		request
	}) => {
		// All three rejection envelopes are
		// `{ error: '...' }` — strict envelope-shape
		// assertion across all pre-delivery rejection
		// branches.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_WEBHOOK_PATH),
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, {
				data: { meta: { event_name: 'subscription_created' } }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(Object.keys(body)).toEqual(['error']);
			expect(body.received).toBeUndefined();
			expect(body.success).toBeUndefined();
		}
	});

	test(`POST ${LEMONSQUEEZY_WEBHOOK_PATH} does NOT echo the success-branch received key on rejected branches`, async ({
		request
	}) => {
		// Success branch returns `{ received: true }`.
		// All rejection branches MUST omit `received`.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_WEBHOOK_PATH),
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, {
				data: { meta: { event_name: 'subscription_created' } }
			}),
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, {
				data: { meta: { event_name: 'subscription_created' } },
				headers: { 'x-signature': 'deadbeef' }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.received).toBeUndefined();
		}
	});

	test(`POST ${LEMONSQUEEZY_WEBHOOK_PATH} catch branch defaults to 400 (NOT 500) for any unhandled error`, async ({
		request
	}) => {
		// The outer catch returns 400 (NOT 500) — same
		// default as polar webhook but via raw
		// NextResponse.json call (NOT
		// safeErrorResponse). A regression that flips
		// this to 500 would surface here.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, { data: 'malformed{' }),
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, {
				data: {
					meta: { event_name: 'subscription_created' },
					data: { id: 'sub_x' }
				},
				headers: { 'x-signature': 'invalidsignature123' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeGreaterThanOrEqual(400);
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LEMONSQUEEZY_WEBHOOK_PATH} every error message comes from the allowed list`, async ({ request }) => {
		// Every error message on a rejection branch
		// MUST come from the static-string list.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_WEBHOOK_PATH),
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, { data: {} }),
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, {
				data: { meta: { event_name: 'subscription_created' } }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(typeof body.error).toBe('string');
			expect(ALLOWED_PRE_DELIVERY_ERRORS).toContain(body.error);
		}
	});

	test(`POST ${LEMONSQUEEZY_WEBHOOK_PATH} ignores polar-shape webhook headers (x-signature is the only signature header read)`, async ({
		request
	}) => {
		// LemonSqueezy reads ONLY `x-signature`. Polar
		// uses `webhook-signature`. A request with the
		// polar header but NOT x-signature should still
		// land on `'No signature provided'` — proving
		// the route does not accidentally read the
		// polar header.
		const response = await request.post(LEMONSQUEEZY_WEBHOOK_PATH, {
			data: { meta: { event_name: 'subscription_created' } },
			headers: {
				'webhook-signature': 'fabricated',
				'webhook-timestamp': '1234567890',
				'webhook-id': 'fabricated'
			}
		});
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body).toEqual({ error: 'No signature provided' });
	});

	test(`POST ${LEMONSQUEEZY_WEBHOOK_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LEMONSQUEEZY_WEBHOOK_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(LEMONSQUEEZY_WEBHOOK_PATH),
			request.put(LEMONSQUEEZY_WEBHOOK_PATH),
			request.patch(LEMONSQUEEZY_WEBHOOK_PATH),
			request.delete(LEMONSQUEEZY_WEBHOOK_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${LEMONSQUEEZY_WEBHOOK_PATH} signature-verification call is NOT entered without x-signature header`, async ({
		request
	}) => {
		// A regression that skipped the
		// `if (!signature)` check would surface here:
		// the response would either be 200
		// `{ received: true }` (load-bearing failure)
		// or a different 400 message. Both fail.
		const response = await request.post(LEMONSQUEEZY_WEBHOOK_PATH, {
			data: {
				meta: { event_name: 'subscription_created' },
				data: { id: 'sub_test' }
			}
		});
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body.error).toBe('No signature provided');
		expect(body.received).toBeUndefined();
	});

	test(`POST ${LEMONSQUEEZY_WEBHOOK_PATH} switch-statement event dispatcher is NOT entered without valid signature`, async ({
		request
	}) => {
		// The switch dispatcher runs only AFTER the
		// signature-verification call passes. Without a
		// valid signature, the dispatcher must NEVER be
		// entered, and the response must NEVER echo
		// `received: true`.
		const responses = await Promise.all([
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, {
				data: {
					meta: { event_name: 'subscription_created' },
					data: { id: 'sub_x' }
				},
				headers: { 'x-signature': 'deadbeef' }
			}),
			request.post(LEMONSQUEEZY_WEBHOOK_PATH, {
				data: {
					meta: { event_name: 'order_created' },
					data: { id: 'ord_x' }
				},
				headers: { 'x-signature': 'invalid' }
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
