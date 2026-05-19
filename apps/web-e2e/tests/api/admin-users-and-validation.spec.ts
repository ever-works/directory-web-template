import { test, expect } from '@playwright/test';

// /api/admin/users/* covers user CRUD + email/username uniqueness probes.
// The probes (check-email, check-username) MUST reject anonymous —
// otherwise an attacker enumerates valid accounts.

const USERS_GET = [
	'/api/admin/users',
	'/api/admin/users/stats',
	'/api/admin/users/probe',
	'/api/admin/users/check-email?email=probe@example.test',
	'/api/admin/users/check-username?username=probe'
];

const USERS_MUTATING = [
	{ method: 'POST', path: '/api/admin/users', name: 'create user' },
	{ method: 'PATCH', path: '/api/admin/users/probe', name: 'edit user' },
	{ method: 'DELETE', path: '/api/admin/users/probe', name: 'delete user' }
];

test.describe('Admin users API rejects anonymous', () => {
	for (const path of USERS_GET) {
		test(`GET ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.get(path);
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
		});
	}

	for (const { method, path, name } of USERS_MUTATING) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method, data: { probe: true } });
			const status = resp.status();
			expect(status, `${path} ${method}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
		});
	}
});

test.describe('Account enumeration prevention', () => {
	test('check-email response does not leak existence to anonymous', async ({ request }) => {
		const a = await request.get('/api/admin/users/check-email?email=admin@e2e.local');
		const b = await request.get('/api/admin/users/check-email?email=nobody@nowhere.test');
		// Both should reject anonymously — same rejection status, no info leak.
		expect(a.status(), 'check-email a').toBeGreaterThanOrEqual(400);
		expect(b.status(), 'check-email b').toBeGreaterThanOrEqual(400);
		expect(a.status(), 'rejection codes should match').toBe(b.status());
	});

	test('check-username response does not leak existence to anonymous', async ({ request }) => {
		const a = await request.get('/api/admin/users/check-username?username=admin');
		const b = await request.get('/api/admin/users/check-username?username=zzz-fake-user-zzz');
		expect(a.status()).toBeGreaterThanOrEqual(400);
		expect(b.status()).toBeGreaterThanOrEqual(400);
		expect(a.status(), 'rejection codes should match').toBe(b.status());
	});
});
