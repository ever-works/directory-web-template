import { test, expect } from '@playwright/test';

// /api/admin/settings deeper edges. Anonymous PUT must reject.

test.describe('Admin settings deeper anonymous rejection', () => {
	test('PUT /api/admin/settings with valid JSON rejects anonymous', async ({ request }) => {
		const resp = await request.put('/api/admin/settings', {
			data: { theme: 'dark' }
		});
		expect(resp.status()).toBeLessThan(500);
		expect(resp.status()).toBeGreaterThanOrEqual(400);
	});

	test('PATCH /api/admin/settings rejects anonymous', async ({ request }) => {
		const resp = await request.patch('/api/admin/settings', {
			data: { feature: true }
		});
		expect(resp.status()).toBeLessThan(500);
		expect(resp.status()).toBeGreaterThanOrEqual(400);
	});

	test('DELETE /api/admin/settings rejects anonymous', async ({ request }) => {
		const resp = await request.delete('/api/admin/settings');
		expect(resp.status()).toBeLessThan(500);
		expect(resp.status()).toBeGreaterThanOrEqual(400);
	});

	test('OPTIONS /api/admin/settings non-5xx', async ({ request }) => {
		const resp = await request.fetch('/api/admin/settings', { method: 'OPTIONS' });
		expect(resp.status()).toBeLessThan(500);
	});
});
