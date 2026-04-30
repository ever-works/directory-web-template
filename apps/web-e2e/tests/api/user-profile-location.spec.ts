import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for `/api/user/profile/location` — auth-gated read +
 * update of the signed-in user's saved default location and privacy
 * preference. Without a session both methods must surface a 4xx;
 * never a 5xx.
 */
test.describe('API: User profile location', () => {
	test('GET /api/user/profile/location without a session does not 5xx', async ({ request }) => {
		const response = await request.get('/api/user/profile/location');

		expect(response.status()).toBeLessThan(500);
	});

	test('PUT /api/user/profile/location without a session does not 5xx', async ({ request }) => {
		const response = await request.put('/api/user/profile/location', {
			data: {},
			headers: { 'content-type': 'application/json' },
		});

		expect(response.status()).toBeLessThan(500);
	});
});
