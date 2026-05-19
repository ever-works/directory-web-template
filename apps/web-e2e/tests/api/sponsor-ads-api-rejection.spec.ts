import { test, expect } from '@playwright/test';

// Sponsor-ads user API governs paid placement state and must reject
// anonymous read + mutation. Admin-side endpoints are covered separately
// in admin-api-coverage-matrix.spec.ts.

const SPONSOR_USER_ENDPOINTS = [
	{ method: 'GET', path: '/api/sponsor-ads/user', name: 'list user sponsor ads' },
	{ method: 'GET', path: '/api/sponsor-ads/user/stats', name: 'user sponsor ad stats' },
	{ method: 'GET', path: '/api/sponsor-ads/user/probe', name: 'sponsor ad detail' },
	{ method: 'POST', path: '/api/sponsor-ads/user', name: 'create sponsor ad' },
	{ method: 'POST', path: '/api/sponsor-ads/user/probe/cancel', name: 'cancel sponsor ad' },
	{ method: 'POST', path: '/api/sponsor-ads/user/probe/renew', name: 'renew sponsor ad' }
];

test.describe('Sponsor-ads user API rejection (anonymous)', () => {
	for (const { method, path, name } of SPONSOR_USER_ENDPOINTS) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'POST' ? { probe: true } : undefined
			});
			const status = resp.status();
			expect(status, `${path} ${method}`).toBeGreaterThanOrEqual(400);
			expect(status, `${path} ${method} must not 5xx`).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});
	}
});
