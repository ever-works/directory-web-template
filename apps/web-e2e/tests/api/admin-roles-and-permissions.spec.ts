import { test, expect } from '@playwright/test';

// Admin roles + permissions endpoints govern RBAC. They MUST reject
// anonymous (and ideally client-only) callers because they expose the
// permission graph itself.

const ROLES_GET = [
	'/api/admin/roles',
	'/api/admin/roles/active',
	'/api/admin/roles/stats',
	'/api/admin/roles/probe',
	'/api/admin/roles/probe/permissions'
];

const ROLES_MUTATING = [
	{ method: 'POST', path: '/api/admin/roles', name: 'create role' },
	{ method: 'PATCH', path: '/api/admin/roles/probe', name: 'edit role' },
	{ method: 'DELETE', path: '/api/admin/roles/probe', name: 'delete role' },
	{ method: 'PATCH', path: '/api/admin/roles/probe/permissions', name: 'edit permissions' }
];

test.describe('Admin roles API rejects anonymous', () => {
	for (const path of ROLES_GET) {
		test(`GET ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.get(path);
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
		});
	}

	for (const { method, path, name } of ROLES_MUTATING) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method, data: { probe: true } });
			const status = resp.status();
			expect(status, `${path} ${method}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});
	}
});
