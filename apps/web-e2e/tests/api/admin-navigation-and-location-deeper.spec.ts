import { test, expect } from '@playwright/test';

const PROBES = [
	{ method: 'GET', path: '/api/admin/navigation' },
	{ method: 'POST', path: '/api/admin/navigation' },
	{ method: 'PUT', path: '/api/admin/navigation' },
	{ method: 'DELETE', path: '/api/admin/navigation' },
	{ method: 'GET', path: '/api/admin/location-index' },
	{ method: 'POST', path: '/api/admin/location-index' },
	{ method: 'PUT', path: '/api/admin/location-index' },
	{ method: 'DELETE', path: '/api/admin/location-index' },
	{ method: 'GET', path: '/api/admin/geo-analytics' },
	{ method: 'GET', path: '/api/admin/dashboard/stats' },
	{ method: 'GET', path: '/api/admin/settings/map-status' }
];

test.describe('Admin navigation/location/analytics deeper rejection', () => {
	for (const { method, path } of PROBES) {
		test(`${method} ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'GET' || method === 'DELETE' ? undefined : { probe: true }
			});
			expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});
	}
});
