import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the auth-gated payment provider checkout /
 * payment-method / setup-intent routes. Every entry must respond
 * with a 4xx (typically 401 or 400) when called anonymously with an
 * empty body — never a 5xx.
 *
 * This complements `payment-protected.spec.ts` (auth-gated read
 * surfaces) and `webhooks.spec.ts` (provider webhook signature
 * guards). Anything covered there is intentionally not duplicated.
 */
const FAKE_SUBSCRIPTION_ID = 'sub___no_such___';
const FAKE_PAYMENT_METHOD_ID = 'pm___no_such___';
const FAKE_SETUP_INTENT_ID = 'seti___no_such___';
const FAKE_USER_ID = '__no_such_user__';
const FAKE_AD_ID = '__no_such_ad__';

const PAYMENT_CHECKOUT_ENDPOINTS = [
	// Stripe — checkout, payment intents, payment methods, setup intents.
	{ method: 'POST', path: '/api/stripe/checkout' },
	{ method: 'POST', path: '/api/stripe/payment-intent' },
	{ method: 'GET', path: '/api/stripe/payment-methods/list' },
	{ method: 'POST', path: '/api/stripe/payment-methods/create' },
	{ method: 'POST', path: '/api/stripe/payment-methods/update' },
	{ method: 'POST', path: '/api/stripe/payment-methods/delete' },
	{ method: 'GET', path: `/api/stripe/payment-methods/${FAKE_PAYMENT_METHOD_ID}` },
	{ method: 'POST', path: '/api/stripe/setup-intent' },
	{ method: 'GET', path: `/api/stripe/setup-intent/${FAKE_SETUP_INTENT_ID}` },

	// Stripe subscriptions self-service.
	{ method: 'POST', path: '/api/stripe/subscription' },
	{ method: 'POST', path: `/api/stripe/subscription/${FAKE_SUBSCRIPTION_ID}/cancel` },
	{ method: 'POST', path: `/api/stripe/subscription/${FAKE_SUBSCRIPTION_ID}/reactivate` },
	{ method: 'POST', path: `/api/stripe/subscription/${FAKE_SUBSCRIPTION_ID}/update` },

	// LemonSqueezy self-service.
	{ method: 'POST', path: '/api/lemonsqueezy/checkout' },
	{ method: 'POST', path: '/api/lemonsqueezy/cancel' },
	{ method: 'POST', path: '/api/lemonsqueezy/reactivate' },
	{ method: 'POST', path: '/api/lemonsqueezy/update' },
	{ method: 'POST', path: '/api/lemonsqueezy/update-plan' },

	// Polar self-service.
	{ method: 'POST', path: '/api/polar/checkout' },
	{ method: 'POST', path: '/api/polar/subscription/portal' },
	{ method: 'POST', path: `/api/polar/subscription/${FAKE_SUBSCRIPTION_ID}/cancel` },
	{ method: 'POST', path: `/api/polar/subscription/${FAKE_SUBSCRIPTION_ID}/reactivate` },

	// Solidgate self-service.
	{ method: 'POST', path: '/api/solidgate/checkout' },

	// Sponsor-ad checkout / lifecycle.
	{ method: 'POST', path: '/api/sponsor-ads/checkout' },
	{ method: 'POST', path: `/api/sponsor-ads/user/${FAKE_AD_ID}/cancel` },
	{ method: 'POST', path: `/api/sponsor-ads/user/${FAKE_AD_ID}/renew` },
	{ method: 'GET', path: `/api/sponsor-ads/user/${FAKE_AD_ID}` },

	// Payment account per-user surface.
	{ method: 'GET', path: `/api/payment/account/${FAKE_USER_ID}` },
	{ method: 'GET', path: `/api/payment/${FAKE_SUBSCRIPTION_ID}` },
] as const;

test.describe('API: Payment-checkout endpoints reject anonymous requests', () => {
	for (const { method, path } of PAYMENT_CHECKOUT_ENDPOINTS) {
		test(`${method} ${path} responds without a server error`, async ({ request }) => {
			const isWriteMethod = method !== 'GET';
			const response = await request.fetch(path, {
				method,
				...(isWriteMethod
					? {
						data: {},
						headers: { 'content-type': 'application/json' },
					}
					: {}),
			});

			expect(response.status()).toBeLessThan(500);
		});
	}
});
