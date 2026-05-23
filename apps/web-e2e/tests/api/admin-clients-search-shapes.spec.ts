import { test, expect } from '@playwright/test';

// Admin advanced-search must reject anonymous regardless of query shape.

const PROBES = [
	'/api/admin/clients/advanced-search',
	'/api/admin/clients/advanced-search?q=test',
	'/api/admin/clients/advanced-search?q=' + 'a'.repeat(2000),
	'/api/admin/clients/advanced-search?country=US&plan=pro',
	'/api/admin/clients/advanced-search?createdAfter=2024-01-01'
];

test.describe('Admin advanced-search anonymous rejection', () => {
	for (const path of PROBES) {
		test(`GET ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});

		test(`POST ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.post(path, { data: { probe: true } });
			expect(resp.status(), `POST ${path}`).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});
	}
});
