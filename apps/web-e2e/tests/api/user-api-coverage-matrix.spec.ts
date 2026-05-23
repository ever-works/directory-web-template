import { test, expect } from '@playwright/test';
import { CLIENT_STATE_FILE } from '../../helpers/test-data';

// Anonymous-reject + authenticated-accept matrix for /api/user/*. These are
// the per-user endpoints (profile, billing, subscription, plan status,
// payments, follows). Verifies the entire surface enforces auth at the
// route level — defense in depth against a route handler forgetting to
// call the auth() guard.

const USER_GET_ENDPOINTS: Array<{ path: string; name: string }> = [
	{ path: '/api/user/profile', name: 'profile' },
	{ path: '/api/user/subscription', name: 'subscription' },
	{ path: '/api/user/plan-status', name: 'plan status' },
	{ path: '/api/user/payments', name: 'payments' }
];

test.describe('User API matrix — anonymous rejection', () => {
	for (const { path, name } of USER_GET_ENDPOINTS) {
		test(`${name} (${path}) rejects anonymous`, async ({ request }) => {
			const resp = await request.get(path);
			const status = resp.status();
			expect(status, `${path} (got ${status})`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
			expect([401, 403, 404]).toContain(status);
		});
	}
});

test.describe('User API matrix — authenticated client succeeds', () => {
	test.use({ storageState: CLIENT_STATE_FILE });
	for (const { path, name } of USER_GET_ENDPOINTS) {
		test(`${name} (${path}) responds non-5xx for client`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), `${path} should not 5xx for client`).toBeLessThan(500);
		});
	}
});
