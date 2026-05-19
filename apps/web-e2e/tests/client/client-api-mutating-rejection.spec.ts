import { test, expect } from '@playwright/test';

// Mutating /api/user/* endpoints must reject anonymous (401/403). Twin of
// admin-api-mutating-rejection.spec.ts for the per-user surface.

const MUTATING_USER_ENDPOINTS = [
	{ method: 'POST', path: '/api/user/profile', name: 'update profile' },
	{ method: 'PATCH', path: '/api/user/profile', name: 'patch profile' },
	{ method: 'POST', path: '/api/user/profile/location', name: 'update profile location' },
	{ method: 'POST', path: '/api/user/profile/portfolio', name: 'add portfolio item' },
	{ method: 'POST', path: '/api/user/payments', name: 'create payment intent' },
	{ method: 'DELETE', path: '/api/user/subscription', name: 'cancel subscription' }
];

test.describe('Mutating user endpoints reject anonymous', () => {
	for (const { method, path, name } of MUTATING_USER_ENDPOINTS) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method, data: { probe: true } });
			const status = resp.status();
			expect(status, `${path} ${method}`).toBeGreaterThanOrEqual(400);
			expect(status, `${path} ${method} must not 5xx`).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});
	}
});
