import { test, expect } from '@playwright/test';

const PROBES = [
	{ method: 'GET', path: '/api/admin/collections' },
	{ method: 'POST', path: '/api/admin/collections' },
	{ method: 'GET', path: '/api/admin/collections/probe-id' },
	{ method: 'PUT', path: '/api/admin/collections/probe-id' },
	{ method: 'DELETE', path: '/api/admin/collections/probe-id' },
	{ method: 'GET', path: '/api/admin/collections/probe-id/items' },
	{ method: 'POST', path: '/api/admin/collections/probe-id/items' },
	{ method: 'PUT', path: '/api/admin/collections/probe-id/items' },
	{ method: 'DELETE', path: '/api/admin/collections/probe-id/items' }
];

test.describe('Admin collections nested deeper', () => {
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
