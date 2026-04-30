import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for `/api/location/coordinates`. The endpoint is
 * intentionally public — when the location feature is enabled it
 * returns lat/lng pairs for every indexed item; when disabled it
 * surfaces a 404. Either contract is fine; we only enforce the "no
 * 5xx" invariant so a regression in the location index or feature
 * gate is caught.
 */
const LOCATION_COORDINATE_QUERIES = [
	'/api/location/coordinates',
	'/api/location/coordinates?city=Paris',
	'/api/location/coordinates?country=France',
] as const;

test.describe('API: Location coordinates', () => {
	for (const path of LOCATION_COORDINATE_QUERIES) {
		test(`GET ${path} returns a non-server-error response`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}
});
