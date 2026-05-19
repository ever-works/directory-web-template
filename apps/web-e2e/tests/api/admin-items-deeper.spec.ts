import { test, expect } from '@playwright/test';

// Admin items deeper variants — many endpoints.

const PROBES = [
	{ method: 'GET', path: '/api/admin/items' },
	{ method: 'POST', path: '/api/admin/items' },
	{ method: 'GET', path: '/api/admin/items/stats' },
	{ method: 'POST', path: '/api/admin/items/bulk' },
	{ method: 'POST', path: '/api/admin/items/import' },
	{ method: 'POST', path: '/api/admin/items/import/validate' },
	{ method: 'GET', path: '/api/admin/items/export' },
	{ method: 'GET', path: '/api/admin/items/export/sample' },
	{ method: 'GET', path: '/api/admin/items/probe-id' },
	{ method: 'PUT', path: '/api/admin/items/probe-id' },
	{ method: 'PATCH', path: '/api/admin/items/probe-id' },
	{ method: 'DELETE', path: '/api/admin/items/probe-id' },
	{ method: 'GET', path: '/api/admin/items/probe-id/history' },
	{ method: 'POST', path: '/api/admin/items/probe-id/review' }
];

test.describe('Admin items deeper rejection', () => {
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
