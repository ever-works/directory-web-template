import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the version surface.
 *
 * `/api/version` — GET returns repo version info (200) or a graceful
 *   error if the content repo is not yet cloned. We accept any < 500
 *   response so the test stays valid across environments.
 *
 * `/api/version/sync` — exposes both GET (current sync state) and
 *   POST (trigger a manual sync). POST may be authenticated/disabled
 *   in some environments — the contract here is "must not 5xx".
 */
test.describe('API: Version & sync', () => {
	test('GET /api/version returns a non-server-error response', async ({ request }) => {
		const response = await request.get('/api/version');

		expect(response.status()).toBeLessThan(500);
	});

	test('GET /api/version/sync returns a non-server-error response', async ({ request }) => {
		const response = await request.get('/api/version/sync');

		expect(response.status()).toBeLessThan(500);
	});

	test('POST /api/version/sync responds without server error', async ({ request }) => {
		// We deliberately POST with no body — the endpoint should either
		// accept (200), reject as unauthorized (401/403) or report a
		// validation problem (4xx). It must not 5xx.
		const response = await request.post('/api/version/sync', { data: {} });

		expect(response.status()).toBeLessThan(500);
	});
});
