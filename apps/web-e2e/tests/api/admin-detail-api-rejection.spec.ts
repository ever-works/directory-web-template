import { test, expect } from '@playwright/test';

// Dynamic-segment admin GET endpoints (history, review status, etc.) also
// must reject anonymous. Mirrors admin-api-coverage-matrix but for the
// per-resource detail routes.

const ADMIN_DETAIL_ENDPOINTS = [
	{ method: 'GET', path: '/api/admin/items/probe/history', name: 'item history' },
	{ method: 'GET', path: '/api/admin/items/probe', name: 'item detail' },
	{ method: 'GET', path: '/api/admin/categories/probe', name: 'category detail' },
	{ method: 'GET', path: '/api/admin/clients/probe', name: 'client detail' },
	{ method: 'GET', path: '/api/admin/comments/probe', name: 'comment detail' },
	{ method: 'GET', path: '/api/admin/companies/probe', name: 'company detail' },
	{ method: 'GET', path: '/api/admin/collections/probe', name: 'collection detail' },
	{ method: 'GET', path: '/api/admin/collections/probe/items', name: 'collection items' },
	{ method: 'GET', path: '/api/admin/featured-items/probe', name: 'featured item detail' },
	{ method: 'GET', path: '/api/admin/reports/probe', name: 'report detail' }
];

test.describe('Admin detail API rejects anonymous', () => {
	for (const { method, path, name } of ADMIN_DETAIL_ENDPOINTS) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method });
			const status = resp.status();
			expect(status, `${path} ${method}`).toBeGreaterThanOrEqual(400);
			expect(status, `${path} ${method} must not 5xx`).toBeLessThan(500);
			expect([400, 401, 403, 404]).toContain(status);
		});
	}
});
