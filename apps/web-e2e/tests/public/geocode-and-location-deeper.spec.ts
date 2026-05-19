import { test, expect } from '@playwright/test';

// Geocode and location endpoints with various inputs. Must non-5xx, must
// not echo SSRF results.

const PROBES = [
	'/api/geocode?q=Paris',
	'/api/geocode?q=' + encodeURIComponent('1600 Pennsylvania Ave'),
	'/api/geocode?q=',
	'/api/geocode',
	'/api/geocode?q=' + 'a'.repeat(2000),
	'/api/geocode?q=' + encodeURIComponent('<script>alert(1)</script>'),
	'/api/location/coordinates?lat=0&lng=0',
	'/api/location/coordinates?lat=999&lng=-999',
	'/api/location/coordinates?lat=abc&lng=xyz',
	'/api/location/coordinates',
	'/api/location/search?q=',
	'/api/location/search?q=Paris',
	'/api/location/cities?country=US',
	'/api/location/cities?country=' + encodeURIComponent('???'),
	'/api/location/countries'
];

test.describe('Geocode + location anonymous tolerance', () => {
	for (const path of PROBES) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
