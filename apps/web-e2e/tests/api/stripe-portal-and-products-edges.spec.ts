import { test, expect } from '@playwright/test';

// Stripe portal-related edges. Anonymous must 4xx; tolerable response codes.

const PROBES = [
	{ method: 'POST', path: '/api/stripe/subscription/portal' },
	{ method: 'GET', path: '/api/stripe/subscription' },
	{ method: 'POST', path: '/api/stripe/subscription' },
	{ method: 'GET', path: '/api/stripe/subscriptions' },
	{ method: 'POST', path: '/api/stripe/subscription/probe-sub-id/cancel' },
	{ method: 'POST', path: '/api/stripe/subscription/probe-sub-id/reactivate' },
	{ method: 'PUT', path: '/api/stripe/subscription/probe-sub-id/update' },
	{ method: 'POST', path: '/api/stripe/subscription/probe-sub-id/update' }
];

test.describe('Stripe portal + subs deeper rejection', () => {
	for (const { method, path } of PROBES) {
		test(`${method} ${path} non-5xx + 4xx`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'GET' ? undefined : { probe: true }
			});
			expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});
	}
});
