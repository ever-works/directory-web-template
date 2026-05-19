import { test, expect } from '@playwright/test';

// /api/user/profile/* mutating endpoints govern profile edits. They MUST
// reject anonymous; authenticated happy-paths are owned by their dedicated
// specs.

const PROFILE_MUTATING_ENDPOINTS = [
	{ method: 'POST', path: '/api/user/profile/location', name: 'set location' },
	{ method: 'PATCH', path: '/api/user/profile/location', name: 'patch location' },
	{ method: 'POST', path: '/api/user/profile/portfolio', name: 'add portfolio item' },
	{ method: 'POST', path: '/api/user/profile/portfolio/probe', name: 'update portfolio item' },
	{ method: 'DELETE', path: '/api/user/profile/portfolio/probe', name: 'delete portfolio item' },
	{ method: 'POST', path: '/api/user/profile/follow/probe', name: 'follow user' },
	{ method: 'DELETE', path: '/api/user/profile/follow/probe', name: 'unfollow user' }
];

test.describe('User profile mutating endpoints reject anonymous', () => {
	for (const { method, path, name } of PROFILE_MUTATING_ENDPOINTS) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method, data: { probe: true } });
			const status = resp.status();
			expect(status, `${path} ${method}`).toBeGreaterThanOrEqual(400);
			expect(status, `${path} ${method} must not 5xx`).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});
	}
});
