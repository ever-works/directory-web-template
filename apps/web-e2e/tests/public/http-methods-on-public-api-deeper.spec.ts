import { test, expect } from '@playwright/test';

// Public API endpoints should reject unsupported HTTP verbs with 4xx (not 5xx).
// Many handlers default-export only GET — DELETE/PUT/PATCH must short-circuit
// cleanly, never throw.

const PUBLIC_GET_ENDPOINTS = [
	'/api/items.json',
	'/api/featured-items',
	'/api/items/listing',
	'/api/items/popularity-scores',
	'/api/categories/exists',
	'/api/collections/exists',
	'/api/surveys/exists',
	'/api/location/cities',
	'/api/location/countries',
	'/api/location/search',
	'/api/config/features',
	'/api/tenant',
	'/api/version'
];

const UNSUPPORTED_METHODS = ['DELETE', 'PUT', 'PATCH'] as const;

test.describe('Public GET endpoints reject unsupported verbs', () => {
	for (const path of PUBLIC_GET_ENDPOINTS) {
		for (const method of UNSUPPORTED_METHODS) {
			test(`${method} ${path} non-5xx`, async ({ request }) => {
				const resp = await request.fetch(path, { method });
				expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
				expect(resp.status()).toBeGreaterThanOrEqual(400);
			});
		}
	}
});
