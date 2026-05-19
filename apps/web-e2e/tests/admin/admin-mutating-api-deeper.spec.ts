import { test, expect } from '@playwright/test';

// Deeper sweep of mutating admin endpoints beyond the round-2 matrix.
// Each must reject anonymous; admin happy-path stays in dedicated specs.

const ADMIN_MUTATING = [
	{ method: 'PATCH', path: '/api/admin/items/probe', name: 'patch item' },
	{ method: 'DELETE', path: '/api/admin/items/probe', name: 'delete item' },
	{ method: 'POST', path: '/api/admin/items/probe/review', name: 'review item' },
	{ method: 'POST', path: '/api/admin/items/export', name: 'export items' },
	{ method: 'POST', path: '/api/admin/items/import', name: 'import items' },
	{ method: 'POST', path: '/api/admin/items/import/validate', name: 'validate import' },
	{ method: 'PATCH', path: '/api/admin/categories/probe', name: 'patch category' },
	{ method: 'DELETE', path: '/api/admin/categories/probe', name: 'delete category' },
	{ method: 'PATCH', path: '/api/admin/clients/probe', name: 'patch client' },
	{ method: 'POST', path: '/api/admin/collections/probe/items', name: 'add items to collection' },
	{ method: 'PATCH', path: '/api/admin/collections/probe', name: 'patch collection' },
	{ method: 'DELETE', path: '/api/admin/collections/probe', name: 'delete collection' },
	{ method: 'DELETE', path: '/api/admin/comments/probe', name: 'delete comment' },
	{ method: 'PATCH', path: '/api/admin/companies/probe', name: 'patch company' },
	{ method: 'DELETE', path: '/api/admin/companies/probe', name: 'delete company' },
	{ method: 'DELETE', path: '/api/admin/featured-items/probe', name: 'delete featured item' },
	{ method: 'PATCH', path: '/api/admin/reports/probe', name: 'patch report' },
	{ method: 'POST', path: '/api/admin/notifications/probe/read', name: 'mark notification read' }
];

test.describe('Deeper admin mutating endpoints reject anonymous', () => {
	for (const { method, path, name } of ADMIN_MUTATING) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method, data: { probe: true } });
			const status = resp.status();
			expect(status, `${path} ${method}`).toBeGreaterThanOrEqual(400);
			expect(status, `${path} ${method} must not 5xx`).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});
	}
});
