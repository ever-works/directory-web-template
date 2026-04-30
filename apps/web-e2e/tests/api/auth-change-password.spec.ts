import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for `/api/auth/change-password`. The endpoint is
 * auth-gated and validates the request body. Without a session it
 * must surface a 4xx; the contract is "never crash" — anything 5xx
 * indicates the auth or validation layer broke.
 */
test.describe('API: Auth — change password', () => {
	test('POST /api/auth/change-password without a session does not 5xx', async ({ request }) => {
		const response = await request.post('/api/auth/change-password', {
			data: { currentPassword: 'old', newPassword: 'new' },
			headers: { 'content-type': 'application/json' },
		});

		expect(response.status()).toBeLessThan(500);
	});

	test('POST /api/auth/change-password with empty body does not 5xx', async ({ request }) => {
		const response = await request.post('/api/auth/change-password', {
			data: {},
			headers: { 'content-type': 'application/json' },
		});

		expect(response.status()).toBeLessThan(500);
	});
});
