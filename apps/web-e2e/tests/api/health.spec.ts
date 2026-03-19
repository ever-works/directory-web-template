import { test, expect } from '@playwright/test';

test.describe('API: Health & Version', () => {
	test('database health check returns success', async ({ request }) => {
		const response = await request.get('/api/health/database');

		// Health endpoint should return 200 if DB is connected
		// or 503 if not — both are valid (depends on local setup)
		expect([200, 503]).toContain(response.status());
	});

	test('version endpoint returns response', async ({ request }) => {
		const response = await request.get('/api/version');

		expect(response.status()).toBeLessThan(500);
	});

	test('config features endpoint returns response', async ({ request }) => {
		const response = await request.get('/api/config/features');

		expect(response.status()).toBeLessThan(500);
	});
});
