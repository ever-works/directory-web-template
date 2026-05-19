import { test, expect } from '@playwright/test';

// Admin bulk/import/export endpoints: anonymous must reject. Mutating
// endpoints can change a lot of data quickly, so the contract is strict.

const ADMIN_BULK_IMPORT = [
	{ method: 'POST', path: '/api/admin/items/bulk' },
	{ method: 'POST', path: '/api/admin/items/import' },
	{ method: 'POST', path: '/api/admin/items/import/validate' },
	{ method: 'GET', path: '/api/admin/items/import/validate' },
	{ method: 'GET', path: '/api/admin/items/export' },
	{ method: 'GET', path: '/api/admin/items/export/sample' },
	{ method: 'POST', path: '/api/admin/clients/bulk' },
	{ method: 'GET', path: '/api/admin/clients/advanced-search' },
	{ method: 'GET', path: '/api/admin/clients/dashboard' },
	{ method: 'GET', path: '/api/admin/clients/stats' },
	{ method: 'POST', path: '/api/admin/categories/reorder' },
	{ method: 'GET', path: '/api/admin/dashboard/stats' },
	{ method: 'GET', path: '/api/admin/geo-analytics' },
	{ method: 'GET', path: '/api/admin/location-index' },
	{ method: 'POST', path: '/api/admin/location-index' },
	{ method: 'GET', path: '/api/admin/navigation' },
	{ method: 'POST', path: '/api/admin/navigation' },
	{ method: 'GET', path: '/api/admin/settings' },
	{ method: 'PUT', path: '/api/admin/settings' },
	{ method: 'GET', path: '/api/admin/settings/map-status' },
	{ method: 'GET', path: '/api/admin/twenty-crm/config' },
	{ method: 'PUT', path: '/api/admin/twenty-crm/config' },
	{ method: 'POST', path: '/api/admin/twenty-crm/test-connection' },
	{ method: 'POST', path: '/api/admin/users/check-email' },
	{ method: 'POST', path: '/api/admin/users/check-username' },
	{ method: 'GET', path: '/api/admin/users/stats' },
	{ method: 'GET', path: '/api/admin/categories/all' },
	{ method: 'GET', path: '/api/admin/tags/all' },
	{ method: 'GET', path: '/api/admin/roles/active' },
	{ method: 'GET', path: '/api/admin/roles/stats' },
	{ method: 'GET', path: '/api/admin/items/stats' },
	{ method: 'GET', path: '/api/admin/reports/stats' },
	{ method: 'GET', path: '/api/admin/notifications' }
];

test.describe('Admin bulk/import/export anonymous rejection', () => {
	for (const { method, path } of ADMIN_BULK_IMPORT) {
		test(`${method} ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'GET' ? undefined : { probe: true }
			});
			expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});
	}
});
