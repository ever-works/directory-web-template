import { test, expect } from '@playwright/test';

// Admin users endpoints + check-email/username — deeper rejection probes.

const PROBES = [
	{ method: 'GET', path: '/api/admin/users' },
	{ method: 'POST', path: '/api/admin/users' },
	{ method: 'GET', path: '/api/admin/users/stats' },
	{ method: 'POST', path: '/api/admin/users/check-email' },
	{ method: 'POST', path: '/api/admin/users/check-username' },
	{ method: 'GET', path: '/api/admin/users/probe-id' },
	{ method: 'PUT', path: '/api/admin/users/probe-id' },
	{ method: 'PATCH', path: '/api/admin/users/probe-id' },
	{ method: 'DELETE', path: '/api/admin/users/probe-id' }
];

test.describe('Admin users deeper rejection', () => {
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
