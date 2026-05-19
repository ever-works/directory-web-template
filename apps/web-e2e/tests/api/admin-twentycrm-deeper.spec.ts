import { test, expect } from '@playwright/test';

const PROBES = [
	{ method: 'GET', path: '/api/admin/twenty-crm/config' },
	{ method: 'PUT', path: '/api/admin/twenty-crm/config' },
	{ method: 'PATCH', path: '/api/admin/twenty-crm/config' },
	{ method: 'POST', path: '/api/admin/twenty-crm/test-connection' },
	{ method: 'GET', path: '/api/admin/twenty-crm/test-connection' }
];

test.describe('Admin twenty-crm deeper rejection', () => {
	for (const { method, path } of PROBES) {
		test(`${method} ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'GET' ? undefined : { probe: true }
			});
			expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});
	}
});
