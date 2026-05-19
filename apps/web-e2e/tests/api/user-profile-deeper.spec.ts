import { test, expect } from '@playwright/test';

// User profile / follow / portfolio endpoints — anonymous gets 4xx, never 5xx.

const USER_PROFILE_ENDPOINTS = [
	{ method: 'GET', path: '/api/user/profile' },
	{ method: 'PUT', path: '/api/user/profile' },
	{ method: 'PATCH', path: '/api/user/profile' },
	{ method: 'GET', path: '/api/user/profile/location' },
	{ method: 'POST', path: '/api/user/profile/location' },
	{ method: 'PUT', path: '/api/user/profile/location' },
	{ method: 'GET', path: '/api/user/profile/portfolio' },
	{ method: 'POST', path: '/api/user/profile/portfolio' },
	{ method: 'PUT', path: '/api/user/profile/portfolio/probe-id' },
	{ method: 'DELETE', path: '/api/user/profile/portfolio/probe-id' },
	{ method: 'POST', path: '/api/user/profile/follow/probe-username' },
	{ method: 'DELETE', path: '/api/user/profile/follow/probe-username' },
	{ method: 'GET', path: '/api/user/profile/follow/probe-username' },
	{ method: 'GET', path: '/api/user/payments' },
	{ method: 'GET', path: '/api/user/subscription' },
	{ method: 'GET', path: '/api/user/currency' },
	{ method: 'GET', path: '/api/user/plan-status' }
];

test.describe('User profile API anonymous rejection (deeper)', () => {
	for (const { method, path } of USER_PROFILE_ENDPOINTS) {
		test(`${method} ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'GET' || method === 'DELETE' ? undefined : { probe: true }
			});
			const status = resp.status();
			expect(status, `${method} ${path}`).toBeLessThan(500);
			expect(status).toBeGreaterThanOrEqual(400);
		});
	}
});
