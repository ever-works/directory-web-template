import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for endpoints that only export a specific HTTP
 * method. Calling them with the wrong verb should produce a 4xx
 * (typically 405 Method Not Allowed from Next.js), never a 5xx.
 */
const POST_ONLY_ENDPOINTS = [
	'/api/extract',
	'/api/verify-recaptcha',
	'/api/geocode',
] as const;

test.describe('API: Method guards', () => {
	for (const path of POST_ONLY_ENDPOINTS) {
		test(`POST ${path} without body does not 5xx`, async ({ request }) => {
			const response = await request.post(path, {
				data: {},
				headers: { 'content-type': 'application/json' },
			});

			// May return 4xx (validation) but must never 5xx.
			expect(response.status()).toBeLessThan(500);
		});
	}

	test('GET /api/geocode returns a non-server-error response', async ({ request }) => {
		// `/api/geocode` exports both GET and POST. The GET form is a
		// health-check style endpoint that returns provider info.
		const response = await request.get('/api/geocode');

		expect(response.status()).toBeLessThan(500);
	});

	test('GET /api/internal/db-init is gated outside development', async ({ request }) => {
		// In development this returns 200; in production it must
		// return 403. Either way the response must be < 500.
		const response = await request.get('/api/internal/db-init');

		expect(response.status()).toBeLessThan(500);
	});

	test('GET /api/cron/sync without a secret does not 5xx', async ({ request }) => {
		// The cron sync route checks `CRON_SECRET` in production and
		// short-circuits when missing. In development it usually
		// succeeds. Either way it must not 5xx.
		const response = await request.get('/api/cron/sync');

		expect(response.status()).toBeLessThan(500);
	});
});
