import { test, expect } from '@playwright/test';

// LemonSqueezy payment provider security contract.

const LEMON_USER_ENDPOINTS = [
	{ method: 'POST', path: '/api/lemonsqueezy/checkout', name: 'lemon checkout' },
	{ method: 'POST', path: '/api/lemonsqueezy/cancel', name: 'lemon cancel' },
	{ method: 'POST', path: '/api/lemonsqueezy/reactivate', name: 'lemon reactivate' },
	{ method: 'POST', path: '/api/lemonsqueezy/update', name: 'lemon update' },
	{ method: 'POST', path: '/api/lemonsqueezy/update-plan', name: 'lemon update plan' },
	{ method: 'GET', path: '/api/lemonsqueezy/list', name: 'lemon list subs' }
];

test.describe('LemonSqueezy API rejects anonymous', () => {
	for (const { method, path, name } of LEMON_USER_ENDPOINTS) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method !== 'GET' ? { probe: true } : undefined
			});
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});
	}
});

test.describe('LemonSqueezy webhook rejects forged calls', () => {
	test('POST /api/lemonsqueezy/webhook without signature is rejected', async ({ request }) => {
		const resp = await request.post('/api/lemonsqueezy/webhook', {
			data: { meta: { event_name: 'fake' } },
			headers: { 'content-type': 'application/json' }
		});
		const status = resp.status();
		expect(status).toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
	});

	test('POST /api/lemonsqueezy/webhook with garbage signature is rejected', async ({
		request
	}) => {
		const resp = await request.post('/api/lemonsqueezy/webhook', {
			data: '{}',
			headers: { 'content-type': 'application/json', 'x-signature': 'garbage' }
		});
		expect(resp.status()).toBeLessThan(500);
		expect(resp.status()).toBeGreaterThanOrEqual(400);
	});
});
