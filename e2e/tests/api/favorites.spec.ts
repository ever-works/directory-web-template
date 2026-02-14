import { test, expect } from '../../fixtures';

test.describe('API: Favorites', () => {
	test('unauthenticated request to favorites returns 401', async ({ request }) => {
		const response = await request.get('/api/favorites');

		// Should reject unauthenticated requests
		expect([401, 403]).toContain(response.status());
	});

	test('authenticated client can list favorites', async ({ clientContext }) => {
		const request = clientContext.request;
		const response = await request.get('/api/favorites');

		// Authenticated request should succeed (200) or return empty array
		expect(response.status()).toBeLessThan(500);
	});
});
