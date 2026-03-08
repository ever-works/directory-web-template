import { test, expect } from '../../fixtures';

test.describe('API: Favorites', () => {
	test('unauthenticated request to favorites returns 401', async ({ request }) => {
		const response = await request.get('/api/favorites', { timeout: 60_000 });

		// Should reject unauthenticated requests
		expect([401, 403]).toContain(response.status());
	});

	test('authenticated client can list favorites', async ({ clientContext }) => {
		const request = clientContext.request;
		const response = await request.get('/api/favorites');

		// Authenticated request should succeed — not 401/403
		expect(response.status()).not.toBe(401);
		expect(response.status()).not.toBe(403);
		expect(response.status()).toBeLessThan(500);
	});
});
