import { test, expect } from '@playwright/test';

// OPTIONS preflights from cross-origin clients must non-5xx on every
// API endpoint. The handler doesn't have to ALLOW the request — but a 5xx
// is a regression.

const PROBES = [
	'/api/items.json',
	'/api/auth/session',
	'/api/auth/csrf',
	'/api/auth/providers',
	'/api/version',
	'/api/tenant',
	'/api/health',
	'/api/featured-items',
	'/api/config/features',
	'/api/items/listing',
	'/api/items/popularity-scores',
	'/api/location/cities',
	'/api/location/countries',
	'/api/location/search'
];

test.describe('OPTIONS method tolerance', () => {
	for (const path of PROBES) {
		test(`OPTIONS ${path} non-5xx`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method: 'OPTIONS',
				headers: {
					origin: 'https://example.com',
					'access-control-request-method': 'GET',
					'access-control-request-headers': 'content-type'
				}
			});
			expect(resp.status(), `OPTIONS ${path}`).toBeLessThan(500);
		});
	}
});
