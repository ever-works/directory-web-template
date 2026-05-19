import { test, expect } from '@playwright/test';

const PROBES = [
	{ method: 'GET', path: '/api/admin/tags' },
	{ method: 'POST', path: '/api/admin/tags' },
	{ method: 'GET', path: '/api/admin/tags/all' },
	{ method: 'GET', path: '/api/admin/tags/probe-id' },
	{ method: 'PUT', path: '/api/admin/tags/probe-id' },
	{ method: 'DELETE', path: '/api/admin/tags/probe-id' },
	{ method: 'GET', path: '/api/admin/roles' },
	{ method: 'POST', path: '/api/admin/roles' },
	{ method: 'GET', path: '/api/admin/roles/active' },
	{ method: 'GET', path: '/api/admin/roles/stats' },
	{ method: 'GET', path: '/api/admin/roles/probe-id' },
	{ method: 'PUT', path: '/api/admin/roles/probe-id' },
	{ method: 'PATCH', path: '/api/admin/roles/probe-id' },
	{ method: 'DELETE', path: '/api/admin/roles/probe-id' },
	{ method: 'GET', path: '/api/admin/roles/probe-id/permissions' },
	{ method: 'POST', path: '/api/admin/roles/probe-id/permissions' },
	{ method: 'PUT', path: '/api/admin/roles/probe-id/permissions' }
];

test.describe('Admin tags + roles deeper rejection', () => {
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
