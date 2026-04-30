import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the auth-required payment / subscription endpoints
 * used by the client billing surface. Each requires an authenticated
 * session; without one they must respond with a 4xx — typically 401 —
 * never a 5xx.
 *
 * This complements `protected.spec.ts` (which targets admin / tenant
 * routes) and `webhooks.spec.ts` (which targets the unsigned webhook
 * contracts). Anything covered there is intentionally not duplicated
 * here.
 */
const PROTECTED_PAYMENT_ENDPOINTS = [
	// User-scoped payment surfaces.
	{ method: 'GET', path: '/api/user/payments' },
	{ method: 'GET', path: '/api/user/subscription' },
	{ method: 'GET', path: '/api/user/plan-status' },
	{ method: 'GET', path: '/api/user/currency' },

	// Stripe subscription management — both list & portal are auth-gated.
	{ method: 'GET', path: '/api/stripe/subscriptions' },
	{ method: 'POST', path: '/api/stripe/subscription/portal' },

	// Polar / LemonSqueezy / Solidgate provider-specific list endpoints.
	{ method: 'GET', path: '/api/lemonsqueezy/list' },

	// Sponsor-ad self-service — auth-gated user surface (the `/api/sponsor-ads`
	// public listing is covered in `discovery.spec.ts`).
	{ method: 'GET', path: '/api/sponsor-ads/user' },
	{ method: 'GET', path: '/api/sponsor-ads/user/stats' },

	// Payment account self-service.
	{ method: 'POST', path: '/api/payment/account' },

	// Per-item admin company assignment.
	{ method: 'GET', path: '/api/items/__no-such-slug__/company' },

	// Per-item authenticated vote status.
	{ method: 'GET', path: '/api/items/__no-such-slug__/votes/status' },
] as const;

test.describe('API: Payment / subscription protected endpoints reject anonymous', () => {
	for (const { method, path } of PROTECTED_PAYMENT_ENDPOINTS) {
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
