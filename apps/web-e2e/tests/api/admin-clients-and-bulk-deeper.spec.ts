import { test, expect } from '@playwright/test';

const PROBES = [
	{ method: 'GET', path: '/api/admin/clients' },
	{ method: 'POST', path: '/api/admin/clients' },
	{ method: 'GET', path: '/api/admin/clients/probe-clientId' },
	{ method: 'PUT', path: '/api/admin/clients/probe-clientId' },
	{ method: 'PATCH', path: '/api/admin/clients/probe-clientId' },
	{ method: 'DELETE', path: '/api/admin/clients/probe-clientId' },
	{ method: 'GET', path: '/api/admin/clients/advanced-search' },
	{ method: 'POST', path: '/api/admin/clients/advanced-search' },
	{ method: 'GET', path: '/api/admin/clients/dashboard' },
	{ method: 'GET', path: '/api/admin/clients/stats' },
	{ method: 'POST', path: '/api/admin/clients/bulk' }
];

test.describe('Admin clients deeper rejection', () => {
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
