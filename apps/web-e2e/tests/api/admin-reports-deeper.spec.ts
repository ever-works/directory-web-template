import { test, expect } from '@playwright/test';

const PROBES = [
	{ method: 'GET', path: '/api/admin/reports' },
	{ method: 'POST', path: '/api/admin/reports' },
	{ method: 'GET', path: '/api/admin/reports/stats' },
	{ method: 'GET', path: '/api/admin/reports/probe-id' },
	{ method: 'PUT', path: '/api/admin/reports/probe-id' },
	{ method: 'DELETE', path: '/api/admin/reports/probe-id' },
	{ method: 'PATCH', path: '/api/admin/reports/probe-id' }
];

test.describe('Admin reports deeper', () => {
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
