import { test, expect } from '@playwright/test';

// Polar payment provider surface. Same security contract as Stripe: user
// endpoints reject anonymous; webhook rejects unsigned/garbage signatures.

const POLAR_USER_ENDPOINTS = [
	{ method: 'POST', path: '/api/polar/checkout', name: 'polar checkout' },
	{ method: 'POST', path: '/api/polar/subscription/probe/cancel', name: 'polar cancel sub' },
	{ method: 'POST', path: '/api/polar/subscription/probe/reactivate', name: 'polar reactivate sub' },
	{ method: 'POST', path: '/api/polar/subscription/portal', name: 'polar portal' }
];

test.describe('Polar API rejects anonymous', () => {
	for (const { method, path, name } of POLAR_USER_ENDPOINTS) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method, data: { probe: true } });
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status, `${path} must not 5xx`).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});
	}
});

test.describe('Polar webhook signature gate', () => {
	test('POST /api/polar/webhook without signature is rejected', async ({ request }) => {
		const resp = await request.post('/api/polar/webhook', {
			data: { type: 'fake.event' },
			headers: { 'content-type': 'application/json' }
		});
		const status = resp.status();
		expect(status).toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
		expect([400, 401, 403]).toContain(status);
	});

	test('POST /api/polar/webhook with garbage signature is rejected', async ({ request }) => {
		const resp = await request.post('/api/polar/webhook', {
			data: '{"type":"fake"}',
			headers: { 'content-type': 'application/json', 'webhook-signature': 'garbage' }
		});
		expect(resp.status()).toBeLessThan(500);
		expect(resp.status()).toBeGreaterThanOrEqual(400);
	});
});
