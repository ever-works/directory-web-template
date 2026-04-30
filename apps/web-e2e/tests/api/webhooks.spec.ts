import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for payment provider webhook endpoints.
 *
 * Webhooks are POST-only routes that receive provider-signed events.
 * From an unauthenticated browser session we cannot exercise the happy
 * path, but we can verify two important contracts:
 *
 * 1. GET on a webhook route does not 5xx (Next.js will typically return
 *    405 Method Not Allowed when only POST is exported). Anything
 *    >= 500 indicates a misconfigured route.
 * 2. POST without a valid signature is rejected with a 4xx, never a
 *    silent success or a server error.
 *
 * We accept any 4xx for the rejected POST so the test is resilient to
 * provider-specific error mapping (Stripe uses 400, Polar uses 401,
 * etc.).
 */
const PROVIDERS = [
	{ name: 'Stripe', path: '/api/stripe/webhook' },
	{ name: 'LemonSqueezy', path: '/api/lemonsqueezy/webhook' },
	{ name: 'Polar', path: '/api/polar/webhook' },
	{ name: 'Solidgate', path: '/api/solidgate/webhook' },
] as const;

test.describe('API: Payment webhooks', () => {
	for (const provider of PROVIDERS) {
		test(`${provider.name} webhook GET does not 5xx`, async ({ request }) => {
			const response = await request.get(provider.path);

			expect(response.status()).toBeLessThan(500);
		});

		test(`${provider.name} webhook POST without signature is rejected`, async ({ request }) => {
			const response = await request.post(provider.path, {
				data: { event: 'test', payload: {} },
				headers: { 'content-type': 'application/json' },
			});

			// Must be a client error (signature/validation failure), not a
			// server crash.
			expect(response.status()).toBeGreaterThanOrEqual(400);
			expect(response.status()).toBeLessThan(500);
		});
	}
});
