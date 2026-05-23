import { test, expect } from '@playwright/test';

// Anything under /api/client/ must reject anonymous.

const CLIENT_GET_PROBES = [
	'/api/client/items',
	'/api/client/items/stats',
	'/api/client/items/coordinates',
	'/api/client/items/import/sample',
	'/api/client/dashboard/stats',
	'/api/client/geo-stats'
];

test.describe('Client API GETs all reject anonymous', () => {
	for (const path of CLIENT_GET_PROBES) {
		test(`GET ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), `GET ${path}`).toBeLessThan(500);
			expect(resp.status(), `GET ${path}`).toBeGreaterThanOrEqual(400);
		});
	}
});
