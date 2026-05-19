import { test, expect } from '@playwright/test';

// Solidgate payment provider security contract.

test.describe('Solidgate API rejects anonymous', () => {
	test('POST /api/solidgate/checkout rejects anonymous', async ({ request }) => {
		const resp = await request.post('/api/solidgate/checkout', { data: { probe: true } });
		const status = resp.status();
		expect(status).toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
		expect([400, 401, 403, 404, 405]).toContain(status);
	});

	test('POST /api/solidgate/webhook without signature is rejected', async ({ request }) => {
		const resp = await request.post('/api/solidgate/webhook', {
			data: { event_type: 'fake' },
			headers: { 'content-type': 'application/json' }
		});
		const status = resp.status();
		expect(status).toBeGreaterThanOrEqual(400);
		expect(status).toBeLessThan(500);
	});

	test('POST /api/solidgate/webhook with garbage signature is rejected', async ({ request }) => {
		const resp = await request.post('/api/solidgate/webhook', {
			data: '{}',
			headers: { 'content-type': 'application/json', 'signature': 'garbage', 'merchant': 'fake' }
		});
		expect(resp.status()).toBeLessThan(500);
		expect(resp.status()).toBeGreaterThanOrEqual(400);
	});

	test('GET /api/solidgate/webhook is method-not-allowed (not 5xx)', async ({ request }) => {
		const resp = await request.get('/api/solidgate/webhook');
		expect(resp.status()).toBeLessThan(500);
		expect(resp.status()).toBeGreaterThanOrEqual(400);
	});
});
