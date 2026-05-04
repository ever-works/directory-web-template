import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Stripe payment-provider webhook endpoint
 * served by the `POST` export of
 * `apps/web/app/api/stripe/webhook/route.ts`.
 *
 * `POST /api/stripe/webhook` is the **fourth and final
 * per-source-file webhook POST smoke** the docs tree
 * publishes — completing the four-provider webhook
 * quartet (Polar / LemonSqueezy / Solidgate /
 * Stripe). The existing multi-provider
 * `webhooks.spec.ts` covers all four with two
 * assertions each (GET-not-5xx and POST-rejected);
 * this spec drills into the Stripe webhook handler
 * specifically.
 *
 * Distinct from ALL three siblings — this is the
 * **simplest** of the four handlers:
 *
 *   - **Single-header signature check via
 *     `stripe-signature`:** unique header name
 *     distinct from polar (`webhook-signature`),
 *     lemonsqueezy (`x-signature`), and solidgate
 *     (`x-signature || solidgate-signature`).
 *   - **NO JSON parse:** the handler reads the raw
 *     body via `await request.text()` and passes it
 *     as a STRING directly to `stripeProvider.
 *     handleWebhook(body, signature)`. Matches
 *     lemonsqueezy; distinct from polar and solidgate
 *     which parse via `JSON.parse(body)`.
 *   - **NO `validateWebhookPayload` check:** distinct
 *     from polar's 4-tier chain.
 *   - **NO idempotency check:** distinct from
 *     solidgate's in-memory `Set<string>` tracker.
 *   - **NO event-type-string-fallback in the switch
 *     dispatcher:** matches ONLY the
 *     `WebhookEventType` enum values (8 mapped + the
 *     UNIQUE `BILLING_PORTAL_SESSION_UPDATED` Stripe-
 *     specific event = 9 cases). Distinct from
 *     solidgate which accepts both enum AND lowercase
 *     strings for each event.
 *   - **`BILLING_PORTAL_SESSION_UPDATED` in switch:**
 *     UNIQUE Stripe-specific event handler that NO
 *     other webhook smoke covers.
 *   - **POST-only export:** matches polar and
 *     lemonsqueezy; distinct from solidgate which also
 *     exports a documentation GET handler.
 *   - **Same 400-default catch as all three siblings:**
 *     outer catch returns 400 (NOT 500) via raw
 *     `NextResponse.json({ error: 'Webhook processing
 *     failed' }, { status: 400 })`.
 *
 *   1. **Raw-body read via `await request.text()`** —
 *      no auth gate (webhooks use signature
 *      verification, not session auth).
 *   2. **`stripe-signature` header presence check** —
 *      missing → 400 `{ error: 'No signature
 *      provided' }`.
 *   3. **`stripeProvider.handleWebhook(body,
 *      signature)`** — load-bearing signature-
 *      verification call. Receives the RAW body
 *      STRING, not a parsed object.
 *   4. **`!webhookResult.received` check** — 400
 *      `{ error: 'Webhook not processed' }`.
 *   5. **Switch-statement event dispatcher** — 9
 *      event types matched on `WebhookEventType` enum
 *      values ONLY (no string fallback). Default
 *      branch only `console.log`s.
 *   6. **Success payload** — `{ received: true }`
 *      with status 200.
 *   7. **Outer catch** — `console.error` + 400
 *      `{ error: 'Webhook processing failed' }`.
 *   8. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const STRIPE_WEBHOOK_PATH = '/api/stripe/webhook';

const STRIPE_WEBHOOK_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	// Stripe uses `stripe-signature` (unique header name).
	{ headers: { 'stripe-signature': 'fabricated' }, label: 'fabricated stripe-signature header' },
	{
		headers: { 'stripe-signature': 't=1640995200,v1=abc123def456' },
		label: 't=ts,v1=hex stripe-signature header'
	},
	{ headers: { 'stripe-signature': '' }, label: 'empty stripe-signature header' },

	// Sibling-provider headers should be IGNORED.
	{ headers: { 'webhook-signature': 'fabricated' }, label: 'polar-shape webhook-signature (ignored)' },
	{ headers: { 'x-signature': 'fabricated' }, label: 'lemonsqueezy-shape x-signature (ignored)' },
	{ headers: { 'solidgate-signature': 'fabricated' }, label: 'solidgate-shape solidgate-signature (ignored)' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' }
] as const;

const STRIPE_WEBHOOK_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Valid Stripe event-shape probes.
	{
		data: {
			id: 'evt_test',
			type: 'customer.subscription.created',
			data: { object: { id: 'sub_test', customer: 'cus_test' } },
			created: 1640995200,
			livemode: false
		},
		label: 'valid customer.subscription.created event'
	},
	{
		data: {
			id: 'evt_test',
			type: 'invoice.payment_succeeded',
			data: { object: { id: 'in_test' } },
			created: 1640995200,
			livemode: false
		},
		label: 'valid invoice.payment_succeeded event'
	},
	{
		data: {
			id: 'evt_test',
			type: 'billing_portal.session.updated',
			data: { object: { id: 'bps_test' } },
			created: 1640995200,
			livemode: false
		},
		label: 'valid billing_portal.session.updated event (Stripe-unique)'
	},

	// Type-violation probes.
	{ data: { type: 1 }, label: 'numeric type' },

	// Bypass attempts.
	{
		data: {
			id: 'evt_x',
			type: 'customer.subscription.created',
			data: { object: { id: 'sub_x' } },
			isAdmin: true
		},
		label: 'isAdmin=true bypass attempt'
	},
	{
		data: {
			id: 'evt_x',
			type: 'customer.subscription.created',
			data: { object: { id: 'sub_x' } },
			padding: 'x'.repeat(2_000)
		},
		label: 'large padded body'
	},

	// Malformed body probes (no JSON parse, so these pass through to provider as raw text).
	{ data: 'not-json-at-all', label: 'raw text body (no JSON)' },
	{ data: '{ broken: json', label: 'malformed JSON body' }
] as const;

const ALLOWED_PRE_DELIVERY_ERRORS = [
	'No signature provided',
	'Webhook not processed',
	'Webhook processing failed'
] as const;

test.describe('API: /api/stripe/webhook POST body / header surface', () => {
	for (const { headers, label } of STRIPE_WEBHOOK_HEADERS) {
		test(`POST ${STRIPE_WEBHOOK_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_WEBHOOK_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of STRIPE_WEBHOOK_BODIES) {
		test(`POST ${STRIPE_WEBHOOK_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(STRIPE_WEBHOOK_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${STRIPE_WEBHOOK_PATH} returns 400 with No signature provided when stripe-signature header is missing`, async ({
		request
	}) => {
		// The stripe-signature header presence check is
		// the FIRST gate. Missing header must surface
		// this 400 envelope.
		const response = await request.post(STRIPE_WEBHOOK_PATH, {
			data: { id: 'evt_test', type: 'customer.subscription.created' },
			headers: { 'content-type': 'application/json' }
		});
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body).toEqual({ error: 'No signature provided' });
	});

	test(`POST ${STRIPE_WEBHOOK_PATH} envelope shape on rejected branches has exactly one error key`, async ({
		request
	}) => {
		// All rejection envelopes are `{ error: '...' }`.
		const responses = await Promise.all([
			request.post(STRIPE_WEBHOOK_PATH),
			request.post(STRIPE_WEBHOOK_PATH, {
				data: { id: 'evt_test', type: 'customer.subscription.created' }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(Object.keys(body)).toEqual(['error']);
			expect(body.received).toBeUndefined();
			expect(body.success).toBeUndefined();
		}
	});

	test(`POST ${STRIPE_WEBHOOK_PATH} does NOT echo the success-branch received key on rejected branches`, async ({
		request
	}) => {
		// Success branch returns `{ received: true }`.
		// All rejection branches MUST omit `received`.
		const responses = await Promise.all([
			request.post(STRIPE_WEBHOOK_PATH),
			request.post(STRIPE_WEBHOOK_PATH, { data: {} }),
			request.post(STRIPE_WEBHOOK_PATH, {
				data: { id: 'evt_test', type: 'customer.subscription.created' }
			}),
			request.post(STRIPE_WEBHOOK_PATH, {
				data: { id: 'evt_test', type: 'customer.subscription.created' },
				headers: { 'stripe-signature': 'deadbeef' }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.received).toBeUndefined();
		}
	});

	test(`POST ${STRIPE_WEBHOOK_PATH} catch branch defaults to 400 (NOT 500) for any unhandled error`, async ({
		request
	}) => {
		// The outer catch returns 400 (NOT 500). A
		// regression that flips this to 500 would
		// surface here.
		const responses = await Promise.all([
			request.post(STRIPE_WEBHOOK_PATH, { data: 'malformed{' }),
			request.post(STRIPE_WEBHOOK_PATH, {
				data: {
					id: 'evt_test',
					type: 'customer.subscription.created',
					data: { object: { id: 'sub_x' } }
				},
				headers: { 'stripe-signature': 't=1640995200,v1=invalidsignature' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeGreaterThanOrEqual(400);
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_WEBHOOK_PATH} every error message comes from the allowed list`, async ({ request }) => {
		// 3-message set (matches lemonsqueezy + solidgate;
		// distinct from polar's 5-message set).
		const responses = await Promise.all([
			request.post(STRIPE_WEBHOOK_PATH),
			request.post(STRIPE_WEBHOOK_PATH, { data: {} }),
			request.post(STRIPE_WEBHOOK_PATH, {
				data: { id: 'evt_test', type: 'customer.subscription.created' }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(typeof body.error).toBe('string');
			expect(ALLOWED_PRE_DELIVERY_ERRORS).toContain(body.error);
		}
	});

	test(`POST ${STRIPE_WEBHOOK_PATH} ignores sibling-provider signature headers (only stripe-signature satisfies the gate)`, async ({
		request
	}) => {
		// A request with polar / lemonsqueezy / solidgate
		// signature headers (but NOT stripe-signature)
		// must still produce 'No signature provided'.
		const responses = await Promise.all([
			request.post(STRIPE_WEBHOOK_PATH, {
				data: { id: 'evt_test' },
				headers: { 'webhook-signature': 'fabricated' }
			}),
			request.post(STRIPE_WEBHOOK_PATH, {
				data: { id: 'evt_test' },
				headers: { 'x-signature': 'fabricated' }
			}),
			request.post(STRIPE_WEBHOOK_PATH, {
				data: { id: 'evt_test' },
				headers: { 'solidgate-signature': 'fabricated' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(400);
			const body = await response.json();
			expect(body).toEqual({ error: 'No signature provided' });
		}
	});

	test(`POST ${STRIPE_WEBHOOK_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(STRIPE_WEBHOOK_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(STRIPE_WEBHOOK_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(STRIPE_WEBHOOK_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(STRIPE_WEBHOOK_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_WEBHOOK_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// POST is the only exported method. All four
		// other HTTP verbs must round-trip to `< 500`.
		const responses = await Promise.all([
			request.get(STRIPE_WEBHOOK_PATH),
			request.put(STRIPE_WEBHOOK_PATH),
			request.patch(STRIPE_WEBHOOK_PATH),
			request.delete(STRIPE_WEBHOOK_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${STRIPE_WEBHOOK_PATH} signature-verification call is NOT entered without stripe-signature header`, async ({
		request
	}) => {
		// A regression that skipped the
		// `if (!signature)` check would surface here:
		// the response would either be 200
		// `{ received: true }` or a different 400
		// message. Both fail.
		const response = await request.post(STRIPE_WEBHOOK_PATH, {
			data: {
				id: 'evt_test',
				type: 'customer.subscription.created',
				data: { object: { id: 'sub_test' } }
			}
		});
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body.error).toBe('No signature provided');
		expect(body.received).toBeUndefined();
	});

	test(`POST ${STRIPE_WEBHOOK_PATH} switch-statement event dispatcher (incl. BILLING_PORTAL_SESSION_UPDATED) is NOT entered without valid signature`, async ({
		request
	}) => {
		// Without a valid signature, the dispatcher
		// (including the unique BILLING_PORTAL_SESSION_
		// UPDATED case) must NEVER be entered. The
		// response must NEVER echo `received: true`.
		const responses = await Promise.all([
			request.post(STRIPE_WEBHOOK_PATH, {
				data: {
					id: 'evt_x',
					type: 'customer.subscription.created',
					data: { object: { id: 'sub_x' } }
				},
				headers: { 'stripe-signature': 'deadbeef' }
			}),
			// The Stripe-unique billing_portal event.
			request.post(STRIPE_WEBHOOK_PATH, {
				data: {
					id: 'evt_x',
					type: 'billing_portal.session.updated',
					data: { object: { id: 'bps_x' } }
				},
				headers: { 'stripe-signature': 'invalid' }
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
