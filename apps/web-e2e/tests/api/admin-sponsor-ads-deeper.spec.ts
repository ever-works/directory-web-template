import { test, expect } from '@playwright/test';

const PROBES = [
	{ method: 'GET', path: '/api/admin/sponsor-ads' },
	{ method: 'POST', path: '/api/admin/sponsor-ads' },
	{ method: 'GET', path: '/api/admin/sponsor-ads/probe-id' },
	{ method: 'PUT', path: '/api/admin/sponsor-ads/probe-id' },
	{ method: 'DELETE', path: '/api/admin/sponsor-ads/probe-id' },
	{ method: 'POST', path: '/api/admin/sponsor-ads/probe-id/approve' },
	{ method: 'POST', path: '/api/admin/sponsor-ads/probe-id/reject' },
	{ method: 'POST', path: '/api/admin/sponsor-ads/probe-id/cancel' },
	{ method: 'PATCH', path: '/api/admin/sponsor-ads/probe-id' }
];

test.describe('Admin sponsor-ads deeper', () => {
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
