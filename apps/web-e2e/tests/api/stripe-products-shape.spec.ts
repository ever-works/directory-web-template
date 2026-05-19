import { test, expect } from '@playwright/test';

// /api/stripe/products may be public read. If 200, returns JSON.

test.describe('Stripe products read shape', () => {
	test('GET /api/stripe/products non-5xx and JSON if 200', async ({ request }) => {
		const resp = await request.get('/api/stripe/products');
		expect(resp.status()).toBeLessThan(500);
		if (resp.status() === 200) {
			const ct = (resp.headers()['content-type'] || '').toLowerCase();
			expect(ct).toContain('application/json');
			const body = await resp.json().catch(() => null);
			expect(body).toBeTruthy();
		}
	});

	test('HEAD /api/stripe/products non-5xx', async ({ request }) => {
		const resp = await request.fetch('/api/stripe/products', { method: 'HEAD' });
		expect(resp.status()).toBeLessThan(500);
	});

	test('OPTIONS /api/stripe/products non-5xx', async ({ request }) => {
		const resp = await request.fetch('/api/stripe/products', { method: 'OPTIONS' });
		expect(resp.status()).toBeLessThan(500);
	});
});
