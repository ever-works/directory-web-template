import { test, expect } from '@playwright/test';

// /api/payment/* endpoints govern billing account state across providers.
// All must reject anonymous; user-owned reads require correct auth scoping.

const PAYMENT_GET = [
	'/api/payment/account',
	'/api/payment/probe-sub',
	'/api/payment/account/probe-user'
];

const PAYMENT_MUTATING = [
	{ method: 'POST', path: '/api/payment/account', name: 'create payment account' },
	{ method: 'PATCH', path: '/api/payment/account/probe', name: 'patch account' }
];

test.describe('Payment account endpoints reject anonymous', () => {
	for (const path of PAYMENT_GET) {
		test(`GET ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.get(path);
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
		});
	}

	for (const { method, path, name } of PAYMENT_MUTATING) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method, data: { probe: true } });
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});
	}
});

test.describe('Sponsor-ads checkout rejects anonymous', () => {
	test('POST /api/sponsor-ads/checkout rejects anonymous', async ({ request }) => {
		const resp = await request.post('/api/sponsor-ads/checkout', { data: { probe: true } });
		const status = resp.status();
		expect(status).toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
	});

	test('GET /api/sponsor-ads (public list) does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/sponsor-ads');
		expect(resp.status()).toBeLessThan(500);
	});
});
