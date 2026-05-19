import { test, expect } from '@playwright/test';

const PROBES = [
	{ method: 'GET', path: '/api/admin/companies' },
	{ method: 'POST', path: '/api/admin/companies' },
	{ method: 'GET', path: '/api/admin/companies/probe-id' },
	{ method: 'PUT', path: '/api/admin/companies/probe-id' },
	{ method: 'PATCH', path: '/api/admin/companies/probe-id' },
	{ method: 'DELETE', path: '/api/admin/companies/probe-id' }
];

test.describe('Admin companies deeper rejection', () => {
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
