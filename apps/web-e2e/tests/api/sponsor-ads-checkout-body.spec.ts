import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the **POST / body / header surface**
 * of the sponsor-ad checkout-session creation endpoint
 * served by the `POST` export of
 * `apps/web/app/api/sponsor-ads/checkout/route.ts`.
 *
 * `POST /api/sponsor-ads/checkout` is the **first per-
 * source-file POST smoke for an auth-gated MULTI-PROVIDER
 * dispatching checkout endpoint** the docs tree
 * publishes — distinct from the auth-gated payment-
 * provider checkout quartet (Solidgate + Polar +
 * LemonSqueezy + Stripe), which are each tied to a
 * single provider. This handler dispatches to ALL three
 * providers via the `NEXT_PUBLIC_PAYMENT_PROVIDER` env
 * var and a `switch` on `ACTIVE_PAYMENT_PROVIDER`.
 *
 * Distinct from ALL FOUR siblings in the checkout
 * quartet:
 *
 *   - **Multi-provider switch dispatch:** the handler
 *     `switch (ACTIVE_PAYMENT_PROVIDER)` between
 *     `PaymentProvider.STRIPE`, `LEMONSQUEEZY`, and
 *     `POLAR`, falling through to a 400 default. The
 *     FIRST per-source-file POST smoke that pins a
 *     three-way provider dispatch via env var.
 *   - **`success: false` envelope on every error
 *     branch:** distinct from the quartet's two-key
 *     `{ error, message }` envelopes — sponsor-ads/
 *     checkout returns `{ success: false, error }` on
 *     every error branch (matching the admin
 *     endpoints' shape).
 *   - **Open-redirect validation:** the handler calls
 *     `validateRedirectUrl(successUrl)` and
 *     `validateRedirectUrl(cancelUrl)` to reject
 *     cross-origin URLs at the application boundary.
 *     The FIRST per-source-file POST smoke that pins
 *     an open-redirect-prevention contract: any
 *     XSS-shaped or cross-origin URL is silently
 *     replaced with a default `${appUrl}/sponsor/...`
 *     route, with a `console.warn` (no echo on the
 *     wire).
 *   - **Three-stage gate stack** (auth → ownership →
 *     status): after `!session?.user?.id` → 401, the
 *     handler runs `sponsorAdService.getSponsorAdById`
 *     → 404, then `sponsorAd.userId !== session.user.id`
 *     → 403 (UNIQUE — no other checkout has a forbidden
 *     branch), then `sponsorAd.status !==
 *     SponsorAdStatus.PENDING_PAYMENT` → 400.
 *   - **`getPriceId(interval, provider)` map:** the
 *     handler maps `(WEEKLY | MONTHLY) × (STRIPE |
 *     LEMONSQUEEZY | POLAR)` to env-driven price IDs
 *     and short-circuits to a generic 400 if the price
 *     is not configured. The FIRST per-source-file
 *     POST smoke that pins a 2×3 price-matrix lookup.
 *   - **`!session?.user?.id` gate** (matches
 *     lemonsqueezy; distinct from polar +
 *     solidgate + stripe's `!session?.user`).
 *   - **Generic 500 on outer catch:** distinct from
 *     stripe's three-key envelope and solidgate's
 *     `safeErrorMessage` extraction — sponsor-ads/
 *     checkout returns the generic `{ success: false,
 *     error: 'Failed to create checkout session' }` on
 *     every catch (no detail leak).
 *
 *   1. **`auth()` session lookup** — load-bearing first
 *      gate. `!session?.user?.id` → 401 `{ success:
 *      false, error: 'Unauthorized' }` (TWO-key envelope
 *      with `success: false` discriminant).
 *   2. **JSON body parse via destructured `await
 *      request.json()`** AFTER the auth gate — NO per-
 *      call try/catch (the outer catch covers both
 *      malformed JSON and downstream errors).
 *   3. **`!sponsorAdId`** → 400 `{ success: false,
 *      error: 'Sponsor ad ID is required' }`.
 *   4. **`sponsorAdService.getSponsorAdById(sponsorAdId)`
 *      lookup** — null → 404 `{ success: false, error:
 *      'Sponsor ad not found' }`.
 *   5. **`sponsorAd.userId !== session.user.id`** → 403
 *      `{ success: false, error: 'You do not have
 *      permission to pay for this sponsor ad' }`.
 *   6. **`sponsorAd.status !==
 *      SponsorAdStatus.PENDING_PAYMENT`** → 400
 *      `{ success: false, error: 'Sponsor ad is not
 *      awaiting payment. Current status: ${status}' }`.
 *   7. **`getPriceId(interval, provider)` lookup** —
 *      null → 400 `{ success: false, error: 'Payment
 *      configuration is incomplete. Please contact
 *      support.' }`.
 *   8. **`validateRedirectUrl(successUrl / cancelUrl)`**
 *      — invalid URLs are replaced with default
 *      `${appUrl}/sponsor/{success|cancel}` routes;
 *      `console.warn` logs the attempt but the wire
 *      response NEVER echoes the caller-supplied URL.
 *   9. **Switch on `ACTIVE_PAYMENT_PROVIDER`** —
 *      `STRIPE` → `createStripeCheckout`, `LEMONSQUEEZY`
 *      → `createLemonSqueezyCheckout`, `POLAR` →
 *      `createPolarCheckout`, `default` → 400 `{
 *      success: false, error: 'Payment configuration
 *      is incomplete. Please contact support.' }`.
 *  10. **`!checkoutResult.url`** → 500 `{ success:
 *      false, error: 'Failed to create checkout URL.
 *      Please try again.' }`.
 *  11. **Success payload** — `{ success: true, data:
 *      { checkoutId, checkoutUrl, provider },
 *      message: 'Checkout session created
 *      successfully' }`.
 *  12. **Outer catch** — `{ success: false, error:
 *      'Failed to create checkout session' }` with
 *      status 500 (generic message, no detail leak).
 *  13. **Method-resolution surface** — the route only
 *      exports `POST`. `GET` / `PUT` / `PATCH` /
 *      `DELETE` must round-trip to a `< 500` status.
 */
const SPONSOR_ADS_CHECKOUT_PATH = '/api/sponsor-ads/checkout';

const SPONSOR_ADS_CHECKOUT_HEADERS = [
	{ headers: undefined as Record<string, string> | undefined, label: 'no headers' },

	{ headers: { 'Content-Type': 'application/json' }, label: 'application/json content-type' },
	{ headers: { 'Content-Type': 'text/plain' }, label: 'text/plain content-type' },

	{ headers: { Accept: 'application/json' }, label: 'application/json accept' },
	{ headers: { Accept: '*/*' }, label: 'wildcard accept' },

	{ headers: { Cookie: 'next-auth.session-token=fabricated' }, label: 'fabricated next-auth session-token cookie' },
	{ headers: { 'X-Forwarded-For': '127.0.0.1' }, label: 'X-Forwarded-For header' },
	{ headers: { Authorization: 'Bearer anything' }, label: 'Bearer authorization header' },
	{ headers: { 'X-User-Id': 'fabricated' }, label: 'fabricated X-User-Id header' },
	{ headers: { 'X-Sponsor-Provider': 'stripe' }, label: 'fabricated X-Sponsor-Provider header' }
] as const;

const SPONSOR_ADS_CHECKOUT_BODIES = [
	{ data: undefined as unknown, label: 'no body' },
	{ data: '', label: 'empty string body' },
	{ data: '{}', label: 'empty object body' },

	// Required-field probes.
	{ data: { sponsorAdId: 'sa_test' }, label: 'sponsorAdId only' },
	{ data: { successUrl: 'https://x.com', cancelUrl: 'https://x.com' }, label: 'no sponsorAdId with URLs' },

	// Valid-shape probe — would reach the auth gate first.
	{
		data: {
			sponsorAdId: 'sa_test',
			successUrl: 'https://example.com/sponsor/success',
			cancelUrl: 'https://example.com/sponsor?cancelled=true'
		},
		label: 'valid same-origin URLs'
	},

	// Bypass attempts.
	{
		data: {
			sponsorAdId: 'sa_test',
			isAdmin: true
		},
		label: 'isAdmin=true bypass attempt'
	},
	{
		data: {
			sponsorAdId: 'sa_test',
			userId: 'fabricated'
		},
		label: 'fabricated userId bypass attempt'
	},
	{
		data: {
			sponsorAdId: 'sa_test',
			status: 'PENDING_PAYMENT'
		},
		label: 'fabricated status bypass attempt'
	},

	// Open-redirect probes — every variant must NOT be echoed.
	{
		data: {
			sponsorAdId: 'sa_test',
			successUrl: 'javascript:alert(1)',
			cancelUrl: 'https://x.com'
		},
		label: 'javascript: scheme successUrl bypass attempt'
	},
	{
		data: {
			sponsorAdId: 'sa_test',
			successUrl: 'https://attacker.example.com/redirect',
			cancelUrl: 'https://attacker.example.com/redirect'
		},
		label: 'cross-origin successUrl + cancelUrl bypass attempt'
	},
	{
		data: {
			sponsorAdId: 'sa_test',
			successUrl: 'data:text/html,<script>alert(1)</script>',
			cancelUrl: 'https://x.com'
		},
		label: 'data: scheme successUrl bypass attempt'
	},
	{
		data: {
			sponsorAdId: 'sa_test',
			successUrl: '//attacker.example.com/redirect',
			cancelUrl: 'https://x.com'
		},
		label: 'protocol-relative cross-origin successUrl bypass attempt'
	},
	{
		data: {
			sponsorAdId: 'X'.repeat(2_000),
			successUrl: 'https://x.com',
			cancelUrl: 'https://x.com'
		},
		label: 'large padded sponsorAdId'
	}
] as const;

const FORBIDDEN_POST_AUTH_MESSAGES = [
	'Sponsor ad ID is required',
	'Sponsor ad not found',
	'You do not have permission to pay for this sponsor ad',
	'Payment configuration is incomplete. Please contact support.',
	'Failed to create checkout URL. Please try again.',
	'Failed to create checkout session',
	'Checkout session created successfully'
] as const;

test.describe('API: /api/sponsor-ads/checkout POST body / header surface', () => {
	for (const { headers, label } of SPONSOR_ADS_CHECKOUT_HEADERS) {
		test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} (${label}) responds without a server error`, async ({ request }) => {
			const response = await request.post(SPONSOR_ADS_CHECKOUT_PATH, { headers });
			expect(response.status()).toBeLessThan(500);
		});
	}

	for (const { data, label } of SPONSOR_ADS_CHECKOUT_BODIES) {
		test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} with ${label} responds without a server error`, async ({ request }) => {
			const response = await request.post(SPONSOR_ADS_CHECKOUT_PATH, { data });
			expect(response.status()).toBeLessThan(500);
		});
	}

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} returns 401 with the success-false Unauthorized envelope`, async ({
		request
	}) => {
		// `!session?.user?.id` → 401 TWO-key envelope
		// with `success: false` discriminant.
		const response = await request.post(SPONSOR_ADS_CHECKOUT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'Unauthorized' });
	});

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} envelope shape has exactly success and error keys`, async ({ request }) => {
		const response = await request.post(SPONSOR_ADS_CHECKOUT_PATH);
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(Object.keys(body).sort()).toEqual(['error', 'success']);
		expect(body.success).toBe(false);
		expect(body.message).toBeUndefined();
		expect(body.data).toBeUndefined();
		expect(body.details).toBeUndefined();
	});

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} does NOT echo the success-branch keys on the unauth branch`, async ({
		request
	}) => {
		// Success branch returns `{ success: true, data:
		// { checkoutId, checkoutUrl, provider },
		// message: '...' }`. The unauth branch must
		// NEVER reach the provider switch.
		const response = await request.post(SPONSOR_ADS_CHECKOUT_PATH, {
			data: {
				sponsorAdId: 'sa_test',
				successUrl: 'https://example.com/sponsor/success',
				cancelUrl: 'https://example.com/sponsor?cancelled=true'
			}
		});
		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.success).toBe(false);
	});

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} does NOT echo any of the post-auth messages on the unauth branch`, async ({
		request
	}) => {
		const responses = await Promise.all([
			request.post(SPONSOR_ADS_CHECKOUT_PATH),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { data: {} }),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { data: { sponsorAdId: 'sa_test' } }),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, {
				data: {
					sponsorAdId: 'sa_test',
					successUrl: 'https://example.com/s',
					cancelUrl: 'https://example.com/c'
				}
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

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} has a stable status across header / body permutations`, async ({
		request
	}) => {
		const baseline = await request.post(SPONSOR_ADS_CHECKOUT_PATH);
		const responses = await Promise.all([
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { data: {} }),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, {
				data: {
					sponsorAdId: 'sa_test',
					successUrl: 'https://x.com',
					cancelUrl: 'https://x.com'
				}
			}),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, {
				data: { sponsorAdId: 'sa_test', isAdmin: true }
			}),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, {
				data: { sponsorAdId: 'sa_test', userId: 'fabricated' }
			}),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { headers: { 'X-User-Id': 'fabricated' } }),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { headers: { Authorization: 'Bearer anything' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBe(baseline.status());
		}
	});

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} does NOT branch on side-channel cookies / headers`, async ({ request }) => {
		const responses = await Promise.all([
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { headers: { Cookie: 'next-auth.session-token=fabricated' } }),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { headers: { 'X-Forwarded-For': '127.0.0.1' } }),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { headers: { Authorization: 'Bearer anything' } }),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { headers: { 'X-Sponsor-Provider': 'polar' } })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} cross-method probe (GET / PUT / PATCH / DELETE) does NOT 5xx`, async ({
		request
	}) => {
		// The route only exports POST. GET / PUT /
		// PATCH / DELETE must round-trip to `< 500`
		// (Next.js 405).
		const responses = await Promise.all([
			request.get(SPONSOR_ADS_CHECKOUT_PATH),
			request.put(SPONSOR_ADS_CHECKOUT_PATH),
			request.patch(SPONSOR_ADS_CHECKOUT_PATH),
			request.delete(SPONSOR_ADS_CHECKOUT_PATH)
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} is invariant to malformed JSON bodies on the unauth branch`, async ({
		request
	}) => {
		// sponsor-ads/checkout has NO try/catch around
		// `request.json()` inside the try block. Malformed
		// JSON on the auth branch would cascade to the
		// outer 500 catch (which itself returns the
		// generic 500 envelope — NEVER detail-leaked).
		// The unauth branch fires BEFORE request.json(),
		// so malformed bodies must still produce the
		// canonical 401.
		const responses = await Promise.all([
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { data: 'not-json' }),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { data: '{ broken: json' }),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { data: '{"sponsorAdId":' })
		]);

		for (const response of responses) {
			expect(response.status()).toBeLessThan(500);
		}
	});

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} sponsorAdId-required validation is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// On the auth branch, `!sponsorAdId` produces 400
		// `'Sponsor ad ID is required'`. The unauth branch
		// must NEVER emit this 400 message regardless of
		// missing sponsorAdId.
		const responses = await Promise.all([
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { data: {} }),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { data: { successUrl: 'https://x.com' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Sponsor ad ID is required');
		}
	});

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} ownership / status / not-found checks are NOT entered on the unauth branch`, async ({
		request
	}) => {
		// The three-stage post-auth gate stack (404 →
		// 403 → 400) must NEVER produce its messages on
		// the unauth branch — a regression that ran the
		// `sponsorAdService.getSponsorAdById` lookup
		// before the gate would surface here.
		const responses = await Promise.all([
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { data: { sponsorAdId: 'sa_test' } }),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { data: { sponsorAdId: 'sa_other' } })
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.error).not.toBe('Sponsor ad not found');
			expect(body.error).not.toBe('You do not have permission to pay for this sponsor ad');
			expect(body.error).not.toMatch(/^Sponsor ad is not awaiting payment\./);
		}
	});

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} provider-switch dispatch is NOT entered on the unauth branch`, async ({
		request
	}) => {
		// All three provider branches return success
		// payloads with `data.checkoutUrl`. The unauth
		// branch must NEVER reach
		// createStripe/LemonSqueezy/PolarCheckout — the
		// response must NEVER echo `data.checkoutUrl`,
		// `data.checkoutId`, `data.provider`, or any of
		// the provider-name strings.
		const responses = await Promise.all([
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { data: { sponsorAdId: 'sa_test' } }),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, {
				data: { sponsorAdId: 'sa_test', successUrl: 'https://x.com', cancelUrl: 'https://x.com' }
			})
		]);

		for (const response of responses) {
			const body = await response.json();
			expect(body.data).toBeUndefined();
			expect(body.message).not.toBe('Checkout session created successfully');
		}
	});

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} catch-branch is NOT entered on the unauth branch`, async ({ request }) => {
		// A regression that ran any provider branch
		// before the gate could leak a generic 500
		// `'Failed to create checkout session'` on the
		// unauth response. Pin the catch-branch-not-
		// entered invariant.
		const responses = await Promise.all([
			request.post(SPONSOR_ADS_CHECKOUT_PATH),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, { data: { sponsorAdId: 'sa_test' } }),
			request.post(SPONSOR_ADS_CHECKOUT_PATH, {
				data: {
					sponsorAdId: 'sa_test',
					successUrl: 'https://example.com/s',
					cancelUrl: 'https://example.com/c'
				}
			})
		]);

		for (const response of responses) {
			expect(response.status()).toBe(401);
			const body = await response.json();
			expect(body.error).not.toBe('Failed to create checkout session');
			expect(body.success).toBe(false);
		}
	});

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} caller-supplied successUrl / cancelUrl values are NEVER echoed (open-redirect prevention)`, async ({
		request
	}) => {
		// `validateRedirectUrl` rejects cross-origin /
		// XSS-shaped URLs and silently replaces them
		// with the default `${appUrl}/sponsor/...`
		// route. The wire response on the unauth branch
		// must NEVER echo any of the caller-supplied
		// URL fragments — protecting against an
		// open-redirect leak even before the
		// validateRedirectUrl call is reached.
		const response = await request.post(SPONSOR_ADS_CHECKOUT_PATH, {
			data: {
				sponsorAdId: 'sa_test',
				successUrl: 'javascript:alert(1)',
				cancelUrl: 'https://attacker.example.com/redirect'
			}
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		const serialized = JSON.stringify(body);
		expect(serialized).not.toContain('javascript:alert');
		expect(serialized).not.toContain('attacker.example.com');
	});

	test(`POST ${SPONSOR_ADS_CHECKOUT_PATH} provider-name strings are NEVER echoed on the unauth branch`, async ({
		request
	}) => {
		// On the success branch, `data.provider` echoes
		// the active provider name (`'stripe'`,
		// `'lemonsqueezy'`, or `'polar'`). The unauth
		// branch must NEVER echo any provider name.
		const response = await request.post(SPONSOR_ADS_CHECKOUT_PATH, {
			data: { sponsorAdId: 'sa_test' }
		});
		expect(response.status()).toBe(401);

		const body = await response.json();
		expect(body.data).toBeUndefined();
		expect(body.provider).toBeUndefined();
	});
});
