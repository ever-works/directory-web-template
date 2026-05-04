import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the Polar payment-provider webhook endpoint served
 * by the `POST` export of
 * `apps/web/app/api/polar/webhook/route.ts`.
 *
 * `POST /api/polar/webhook` is the **first per-source-
 * file webhook POST smoke** the docs tree publishes
 * (the existing multi-provider `webhooks.spec.ts`
 * covers Stripe / LemonSqueezy / Polar / Solidgate
 * with two assertions each — GET-not-5xx and POST-
 * unauthenticated-rejected; this spec drills into the
 * Polar webhook handler specifically).
 *
 * It is also the **first POST smoke** the docs tree
 * publishes that uses **`await request.text()` (raw
 * body)** instead of `await request.json()` —
 * because Polar calculates signatures on the raw body,
 * not the parsed JSON. The handler manually parses the
 * raw text via `JSON.parse(bodyText)` inside a
 * try/catch.
 *
 * It is also the **first POST smoke** that uses
 * **`safeErrorResponse(..., 400)`** in the outer catch
 * (defaulting to **400 NOT 500** for unhandled
 * webhook errors) — preventing a 5xx crash on signature
 * / parsing errors that would otherwise trip Polar's
 * webhook-retry logic.
 *
 *   1. **Raw-body read via `await request.text()`** —
 *      no auth gate (webhooks are not session-
 *      authenticated; they use signature verification).
 *   2. **Manual JSON parse via `JSON.parse(bodyText)`**
 *      inside a per-call try/catch — failure → 400
 *      `{ error: 'Invalid JSON payload' }`.
 *   3. **`validateWebhookPayload(body)` structure
 *      check** — payload must have string `id`,
 *      string `type`, and object `data` keys → 400
 *      `{ error: 'Invalid webhook payload' }` if any
 *      missing.
 *   4. **`webhook-signature` header presence check** —
 *      missing → 400 `{ error: 'No signature
 *      provided' }`.
 *   5. **`polarProvider.handleWebhook(body,
 *      signatureHeader, bodyText, timestampHeader,
 *      webhookIdHeader)`** — load-bearing signature-
 *      verification call.
 *   6. **`!webhookResult.received`** check — 400
 *      `{ error: 'Webhook not processed' }`.
 *   7. **`routeWebhookEvent(webhookResult.type,
 *      webhookResult.data)`** — load-bearing event-
 *      routing call (subscription lifecycle, payment
 *      events, checkout updates) on the success
 *      branch.
 *   8. **Success payload** — `{ received: true }`
 *      with status 200.
 *   9. **Outer catch** —
 *      `safeErrorResponse(error, 'Webhook processing
 *      failed', 400)`. NOTE: catch defaults to 400
 *      (NOT 500) — a regression that flips this to
 *      500 would surface here as a `< 500` violation.
 *  10. **Method-resolution surface** — the route
 *      exports ONLY `POST`. `GET` / `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const POLAR_WEBHOOK_PATH = '/api/polar/webhook';

const POLAR_WEBHOOK_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { 'webhook-signature': 'fabricated' }, label: 'fabricated webhook-signature header' },
	{ headers: { 'webhook-signature': 'v1,deadbeef' }, label: 'v1,hex webhook-signature header' },
	{ headers: { 'webhook-timestamp': '1234567890' }, label: 'webhook-timestamp header' },
	{ headers: { 'webhook-id': 'fabricated' }, label: 'fabricated webhook-id header' },

	{
		headers: {
			'webhook-signature': 'v1,deadbeef',
			'webhook-timestamp': '1234567890',
			'webhook-id': 'fabricated'
		},
		label: 'all three webhook headers (fabricated)'
	},

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated session-token cookie' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' }
] as const;

const POLAR_WEBHOOK_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body (would 400 (validate-payload) if reachable)' },

	// Required-key probes — would surface "Invalid webhook payload" if reachable.
	{ data: { id: 'evt_1' }, label: 'no type or data fields' },
	{ data: { type: 'subscription.created' }, label: 'no id or data fields' },
	{ data: { data: { id: 'sub_1' } }, label: 'no id or type fields' },
	{ data: { id: 'evt_1', type: 'subscription.created' }, label: 'no data field' },

	// Type-violation probes.
	{ data: { id: 1, type: 'subscription.created', data: {} }, label: 'numeric id (would 400 (validate) if reachable)' },
	{
		data: { id: 'evt_1', type: 1, data: {} },
		label: 'numeric type (would 400 (validate) if reachable)'
	},
	{
		data: { id: 'evt_1', type: 'subscription.created', data: 'not-object' },
		label: 'string data (would 400 (validate) if reachable)'
	},

	// Valid bodies (would proxy to provider if reachable).
	{
		data: {
			id: 'evt_test',
			type: 'subscription.created',
			data: { id: 'sub_test', customer_id: 'cus_test' }
		},
		label: 'valid subscription.created event'
	},
	{
		data: { id: 'evt_test', type: 'checkout.succeeded', data: { id: 'co_test' } },
		label: 'valid checkout.succeeded event'
	},

	// Bypass attempts.
	{
		data: {
			id: 'evt_1',
			type: 'subscription.created',
			data: {},
			isAdmin: true
		},
		label: 'isAdmin=true bypass attempt'
	},
	{
		data: {
			id: 'evt_1',
			type: 'subscription.created',
			data: {},
			padding: 'x'.repeat(2_000)
		},
		label: 'large padded body'
	}
] as const;

const ALLOWED_PRE_DELIVERY_ERRORS = [
	'Invalid JSON payload',
	'Invalid webhook payload',
	'No signature provided',
	'Webhook not processed',
	'Webhook processing failed'
] as const;

test.describe('API: /api/polar/webhook POST body / header surface', () => {
	for (const { headers, label } of POLAR_WEBHOOK_HEADERS) {
		test(`POST ${POLAR_WEBHOOK_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(POLAR_WEBHOOK_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of POLAR_WEBHOOK_BODIES) {
		test(`POST ${POLAR_WEBHOOK_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(POLAR_WEBHOOK_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${POLAR_WEBHOOK_PATH} returns 400 with Invalid JSON payload for malformed JSON`, async ({
		request
	}) => {
		// The manual JSON.parse(bodyText) inside the
		// try/catch is the FIRST gate. Malformed JSON
		// must surface this 400 envelope.
		const response = await request.post(POLAR_WEBHOOK_PATH, {
			data: 'not-json-at-all',
			headers: { 'content-type': 'application/json' }
		});
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body).toEqual({ error: 'Invalid JSON payload' });
	});

	test(`POST ${POLAR_WEBHOOK_PATH} returns 400 with Invalid webhook payload for missing required keys`, async ({
		request
	}) => {
		// The validateWebhookPayload(body) check is the
		// SECOND gate. Empty object body must surface
		// this 400 envelope.
		const response = await request.post(POLAR_WEBHOOK_PATH, {
			data: {},
			headers: { 'content-type': 'application/json' }
		});
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body).toEqual({ error: 'Invalid webhook payload' });
	});

	test(`POST ${POLAR_WEBHOOK_PATH} returns 400 with No signature provided for missing webhook-signature header`, async ({
		request
	}) => {
		// The webhook-signature header presence check is
		// the THIRD gate. A valid payload without the
		// header must surface this 400 envelope.
		const response = await request.post(POLAR_WEBHOOK_PATH, {
			data: { id: 'evt_1', type: 'subscription.created', data: {} },
			headers: { 'content-type': 'application/json' }
		});
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body).toEqual({ error: 'No signature provided' });
	});

	test(`POST ${POLAR_WEBHOOK_PATH} envelope shape on rejected branches has exactly one error key`, async ({
		request
	}) => {
		// All four 400 envelopes are `{ error: '...' }`
		// — strict envelope-shape assertion across all
		// pre-delivery rejection branches.
		const responses = await Promise.all([
			request.post(POLAR_WEBHOOK_PATH, { data: 'not-json' }),
			request.post(POLAR_WEBHOOK_PATH, { data: {} }),
			request.post(POLAR_WEBHOOK_PATH, { data: { id: 'e', type: 't', data: {} } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(Object.keys(body)).toEqual(['error']);
			expect(body.received).toBeUndefined();
			expect(body.success).toBeUndefined();
		}
	});

	test(`POST ${POLAR_WEBHOOK_PATH} does NOT echo the success-branch received key on rejected branches`, async ({
		request
	}) => {
		// Success branch returns `{ received: true }`.
		// All rejection branches MUST omit `received`.
		const responses = await Promise.all([
			request.post(POLAR_WEBHOOK_PATH),
			request.post(POLAR_WEBHOOK_PATH, { data: {} }),
			request.post(POLAR_WEBHOOK_PATH, { data: { id: 'e', type: 't', data: {} } }),
			request.post(POLAR_WEBHOOK_PATH, {
				data: { id: 'e', type: 't', data: {} },
				headers: { 'webhook-signature': 'v1,deadbeef' }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.received).toBeUndefined();
		}
	});

	test(`POST ${POLAR_WEBHOOK_PATH} catch branch defaults to 400 (NOT 500) for any unhandled error`, async ({
		request
	}) => {
		// The outer catch uses `safeErrorResponse(error,
		// 'Webhook processing failed', 400)` — defaulting
		// to 400, NOT 500. A regression that re-defaults
		// to 500 would surface here.
		const responses = await Promise.all([
			request.post(POLAR_WEBHOOK_PATH, { data: 'malformed{' }),
			request.post(POLAR_WEBHOOK_PATH, {
				data: {
					id: 'evt_invalid_signature',
					type: 'subscription.created',
					data: { id: 'sub_x' }
				},
				headers: { 'webhook-signature': 'v1,invalidsignature123' }
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBeGreaterThanOrEqual(400);
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${POLAR_WEBHOOK_PATH} every error message comes from the allowed pre-delivery list`, async ({
		request
	}) => {
		// Every error message on a rejection branch
		// MUST come from the static-string list. A
		// regression that introduces a new dynamic
		// error message would surface here.
		const responses = await Promise.all([
			request.post(POLAR_WEBHOOK_PATH, { data: 'not-json' }),
			request.post(POLAR_WEBHOOK_PATH, { data: {} }),
			request.post(POLAR_WEBHOOK_PATH, { data: { id: 'e', type: 't', data: {} } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(typeof body.error).toBe('string');
			expect(ALLOWED_PRE_DELIVERY_ERRORS).toContain(body.error);
		}
	});

	test(`POST ${POLAR_WEBHOOK_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(POLAR_WEBHOOK_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(POLAR_WEBHOOK_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(POLAR_WEBHOOK_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(POLAR_WEBHOOK_PATH, { headers: { 'X-Tenant-Id': 'fabricated' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${POLAR_WEBHOOK_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.get(POLAR_WEBHOOK_PATH),
			request.put(POLAR_WEBHOOK_PATH),
			request.patch(POLAR_WEBHOOK_PATH),
			request.delete(POLAR_WEBHOOK_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${POLAR_WEBHOOK_PATH} signature-verification call is NOT entered without webhook-signature header`, async ({
		request
	}) => {
		// A regression that skipped the
		// `if (!signatureHeader)` check would surface
		// here: the response would be either a 200
		// `{ received: true }` (load-bearing failure)
		// or a different 400 message. Both fail the
		// expectation.
		const response = await request.post(POLAR_WEBHOOK_PATH, {
			data: { id: 'evt_x', type: 'subscription.created', data: { id: 'sub_x' } }
		});
		expect(response.status()).toBe(400);

		const body = await response.json();
		expect(body.error).toBe('No signature provided');
		expect(body.received).toBeUndefined();
	});
});
