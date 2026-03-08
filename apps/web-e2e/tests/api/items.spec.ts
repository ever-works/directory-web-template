import { test, expect } from '@playwright/test';

test.describe('API: Items', () => {
	test('featured items endpoint returns response', async ({ request }) => {
		const response = await request.get('/api/featured-items');

		expect(response.status()).toBeLessThan(500);
	});

	test('items engagement endpoint returns response', async ({ request }) => {
		const response = await request.get('/api/items/engagement');

		expect(response.status()).toBeLessThan(500);
	});
});
