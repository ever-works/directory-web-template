import { test, expect } from '@playwright/test';

// Polar subscription / portal endpoints — anonymous probes must 4xx not 5xx.

const POLAR_PROBES = [
	{ method: 'POST', path: '/api/polar/checkout' },
	{ method: 'POST', path: '/api/polar/subscription/portal' },
	{ method: 'POST', path: '/api/polar/subscription/probe-id/cancel' },
	{ method: 'POST', path: '/api/polar/subscription/probe-id/reactivate' }
];

test.describe('Polar API anonymous rejection (deeper)', () => {
	for (const { method, path } of POLAR_PROBES) {
		test(`${method} ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: { probe: true }
			});
			const status = resp.status();
			expect(status, `${method} ${path}`).toBeLessThan(500);
			expect(status).toBeGreaterThanOrEqual(400);
		});
	}

	test('POST /api/polar/webhook without signature is rejected', async ({ request }) => {
		const resp = await request.post('/api/polar/webhook', {
			data: { type: 'whatever' },
			headers: { 'content-type': 'application/json' }
		});
		expect(resp.status()).toBeLessThan(500);
		expect(resp.status()).toBeGreaterThanOrEqual(400);
	});
});
