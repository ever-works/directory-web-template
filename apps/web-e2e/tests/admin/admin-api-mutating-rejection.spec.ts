import { test, expect } from '@playwright/test';

// Mutating admin endpoints (POST/PATCH/PUT/DELETE) must reject anonymous
// and client-authenticated callers — not just GET. Without coverage, a
// developer adding a new mutating endpoint can forget the auth gate and
// nothing catches it.
//
// Authenticated POST/PUT tests would need CSRF + body fixtures per endpoint
// and live in their dedicated spec files. Here we just confirm the *negative*
// case (anonymous body request → 401/403/404, not 200, not 500).

const MUTATING_ADMIN_ENDPOINTS = [
	{ method: 'POST', path: '/api/admin/categories', name: 'create category' },
	{ method: 'POST', path: '/api/admin/collections', name: 'create collection' },
	{ method: 'POST', path: '/api/admin/companies', name: 'create company' },
	{ method: 'POST', path: '/api/admin/items', name: 'create item' },
	{ method: 'POST', path: '/api/admin/featured-items', name: 'create featured item' },
	{ method: 'POST', path: '/api/admin/items/bulk', name: 'bulk items op' },
	{ method: 'POST', path: '/api/admin/clients/bulk', name: 'bulk clients op' },
	{ method: 'POST', path: '/api/admin/categories/reorder', name: 'reorder categories' },
	{ method: 'POST', path: '/api/admin/notifications/mark-all-read', name: 'mark notifications read' }
];

test.describe('Mutating admin endpoints reject anonymous', () => {
	for (const { method, path, name } of MUTATING_ADMIN_ENDPOINTS) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method, data: { probe: true } });
			const status = resp.status();
			expect(status, `${path} ${method}`).toBeGreaterThanOrEqual(400);
			expect(status, `${path} ${method} must not 5xx`).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});
	}
});
