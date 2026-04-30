import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the read-only Stripe / payment-provider public
 * endpoints used by the marketing pricing page.
 *
 * `/api/stripe/products` is gated by `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING`
 * and `STRIPE_SECRET_KEY` — when neither is set it returns 400; when
 * both are set it returns 200. In all environments the response must
 * be < 500.
 */
test.describe('API: Stripe public surfaces', () => {
	test('GET /api/stripe/products returns a non-server-error response', async ({ request }) => {
		const response = await request.get('/api/stripe/products');

		expect(response.status()).toBeLessThan(500);
	});
});
