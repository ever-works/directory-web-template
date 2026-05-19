import { test, expect } from '@playwright/test';

const PROBES = [
	{ method: 'GET', path: '/api/admin/featured-items' },
	{ method: 'POST', path: '/api/admin/featured-items' },
	{ method: 'GET', path: '/api/admin/featured-items/probe-id' },
	{ method: 'PUT', path: '/api/admin/featured-items/probe-id' },
	{ method: 'PATCH', path: '/api/admin/featured-items/probe-id' },
	{ method: 'DELETE', path: '/api/admin/featured-items/probe-id' }
];

test.describe('Admin featured-items deeper rejection', () => {
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
