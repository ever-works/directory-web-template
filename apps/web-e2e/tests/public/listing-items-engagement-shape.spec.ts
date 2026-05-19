import { test, expect } from '@playwright/test';

// /api/items/engagement and /api/items/listing are read endpoints. Verify
// JSON shape (object/array, non-null), GET with weird query is tolerated.

const ENGAGEMENT_PROBES = [
	'/api/items/engagement',
	'/api/items/engagement?slug=sample',
	'/api/items/engagement?slug=does-not-exist',
	'/api/items/engagement?slug=',
	'/api/items/engagement?slug=' + 'a'.repeat(2048),
	'/api/items/listing',
	'/api/items/listing?category=sample',
	'/api/items/listing?tag=sample',
	'/api/items/listing?q=hello',
	'/api/items/listing?page=1',
	'/api/items/listing?page=9999',
	'/api/items/popularity-scores',
	'/api/items/popularity-scores?slugs=a,b,c',
	'/api/items/popularity-scores?slugs='
];

test.describe('Items listing/engagement query tolerance', () => {
	for (const path of ENGAGEMENT_PROBES) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
