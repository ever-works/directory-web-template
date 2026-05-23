import { test, expect } from '@playwright/test';

// Admin categories + reorder + nested edges — anonymous must reject all.

const PROBES = [
	{ method: 'GET', path: '/api/admin/categories' },
	{ method: 'POST', path: '/api/admin/categories' },
	{ method: 'GET', path: '/api/admin/categories/all' },
	{ method: 'GET', path: '/api/admin/categories/git' },
	{ method: 'POST', path: '/api/admin/categories/git' },
	{ method: 'POST', path: '/api/admin/categories/reorder' },
	{ method: 'PUT', path: '/api/admin/categories/reorder' },
	{ method: 'GET', path: '/api/admin/categories/probe-id' },
	{ method: 'PUT', path: '/api/admin/categories/probe-id' },
	{ method: 'PATCH', path: '/api/admin/categories/probe-id' },
	{ method: 'DELETE', path: '/api/admin/categories/probe-id' }
];

test.describe('Admin categories deeper rejection', () => {
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
