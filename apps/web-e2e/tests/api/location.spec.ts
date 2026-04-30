import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the public Location surface used by the maps /
 * geo-search UI. When the location feature is disabled (the default
 * for local dev unless `LOCATION_ENABLED` is set), every endpoint
 * returns 404. When it is enabled, each endpoint returns a 200 (and
 * possibly an empty array). Either way, the contract is "no 5xx".
 */
const LOCATION_LISTING_ENDPOINTS = [
	'/api/location/countries',
	'/api/location/cities',
] as const;

test.describe('API: Location listing endpoints', () => {
	for (const path of LOCATION_LISTING_ENDPOINTS) {
		test(`GET ${path} returns a non-server-error response`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}
});

test.describe('API: Location search endpoint', () => {
	test('GET /api/location/search without parameters does not 5xx', async ({ request }) => {
		// When location is enabled, returns 400 (no params); when disabled,
		// returns 404. Either way must not 5xx.
		const response = await request.get('/api/location/search');

		expect(response.status()).toBeLessThan(500);
	});

	test('GET /api/location/search with city parameter does not 5xx', async ({ request }) => {
		const response = await request.get('/api/location/search?city=Paris');

		expect(response.status()).toBeLessThan(500);
	});

	test('GET /api/location/search with country parameter does not 5xx', async ({ request }) => {
		const response = await request.get('/api/location/search?country=France');

		expect(response.status()).toBeLessThan(500);
	});

	test('GET /api/location/search with valid radius parameters does not 5xx', async ({ request }) => {
		const response = await request.get('/api/location/search?near_lat=48.85&near_lng=2.35&radius=25');

		expect(response.status()).toBeLessThan(500);
	});

	test('GET /api/location/search with invalid coordinates does not 5xx', async ({ request }) => {
		// Invalid coordinates should produce 400 (when enabled) or 404
		// (when disabled), never 5xx.
		const response = await request.get('/api/location/search?near_lat=not-a-number&near_lng=also-bad');

		expect(response.status()).toBeLessThan(500);
	});
});
