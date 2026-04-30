import { test, expect } from '@playwright/test';

test.describe('API: Scalar API reference UI (/api/reference)', () => {
	test('reference page returns a successful response', async ({ request }) => {
		const response = await request.get('/api/reference');

		// Scalar serves an HTML page — should be 2xx and not a 5xx.
		expect(response.status()).toBeLessThan(400);
	});

	test('openapi.json is reachable', async ({ request }) => {
		const response = await request.get('/openapi.json');

		// We don't assert content shape here because the OpenAPI spec is
		// generated at build time and may evolve. It must at least not 5xx.
		expect(response.status()).toBeLessThan(500);
	});
});
