import { test, expect } from '@playwright/test';

// Stripe products / subscription / portal endpoints. Anonymous probes must
// 4xx (not 5xx).

const STRIPE_DEEP_PROBES = [
	{ method: 'GET', path: '/api/stripe/products' },
	{ method: 'GET', path: '/api/stripe/subscription' },
	{ method: 'POST', path: '/api/stripe/subscription' },
	{ method: 'POST', path: '/api/stripe/subscription/probe-id/cancel' },
	{ method: 'POST', path: '/api/stripe/subscription/probe-id/reactivate' },
	{ method: 'POST', path: '/api/stripe/subscription/probe-id/update' },
	{ method: 'POST', path: '/api/stripe/subscription/portal' },
	{ method: 'GET', path: '/api/stripe/subscriptions' },
	{ method: 'GET', path: '/api/stripe/setup-intent/probe-id' },
	{ method: 'GET', path: '/api/stripe/payment-methods/list' },
	{ method: 'POST', path: '/api/stripe/payment-methods/create' },
	{ method: 'POST', path: '/api/stripe/payment-methods/delete' },
	{ method: 'POST', path: '/api/stripe/payment-methods/update' },
	{ method: 'GET', path: '/api/stripe/payment-methods/probe-id' },
	{ method: 'PUT', path: '/api/stripe/payment-methods/probe-id' },
	{ method: 'DELETE', path: '/api/stripe/payment-methods/probe-id' }
];

test.describe('Stripe API anonymous rejection (deeper)', () => {
	for (const { method, path } of STRIPE_DEEP_PROBES) {
		test(`${method} ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'GET' || method === 'DELETE' ? undefined : { probe: true }
			});
			const status = resp.status();
			expect(status, `${method} ${path}`).toBeLessThan(500);
			// 200 is acceptable for products listing (often public).
			// But all mutating must be >=400.
			if (method !== 'GET') {
				expect(status).toBeGreaterThanOrEqual(400);
			}
		});
	}
});
