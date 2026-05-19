import { test, expect } from '@playwright/test';

// Location lookup endpoints power the address autocomplete + the map
// view. Public reads are OK (no PII), but the response shape must stay
// stable.

const LOCATION_GET = [
	'/api/location/countries',
	'/api/location/cities?country=US',
	'/api/location/coordinates?address=test',
	'/api/location/search?q=san+francisco'
];

test.describe('Location API tolerance', () => {
	for (const path of LOCATION_GET) {
		test(`GET ${path} does not 5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), `${path}`).toBeLessThan(500);
		});
	}

	test('GET /api/location/search with empty query does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/location/search?q=');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/location/cities with no country does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/location/cities');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/geocode does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/geocode?address=test');
		expect(resp.status()).toBeLessThan(500);
	});

	test('GET /api/geocode with no address does not 5xx', async ({ request }) => {
		const resp = await request.get('/api/geocode');
		expect(resp.status()).toBeLessThan(500);
	});
});
