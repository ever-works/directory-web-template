import { test, expect } from '@playwright/test';

// Anything under /api/admin/ must NEVER be 200 to an anonymous client.
// We sweep across known admin endpoints with GET to verify this contract.

const ADMIN_GET_PROBES = [
	'/api/admin/items',
	'/api/admin/items/stats',
	'/api/admin/items/export',
	'/api/admin/items/export/sample',
	'/api/admin/categories',
	'/api/admin/categories/all',
	'/api/admin/categories/git',
	'/api/admin/collections',
	'/api/admin/comments',
	'/api/admin/companies',
	'/api/admin/featured-items',
	'/api/admin/reports',
	'/api/admin/reports/stats',
	'/api/admin/roles',
	'/api/admin/roles/active',
	'/api/admin/roles/stats',
	'/api/admin/sponsor-ads',
	'/api/admin/tags',
	'/api/admin/tags/all',
	'/api/admin/users',
	'/api/admin/users/stats',
	'/api/admin/dashboard/stats',
	'/api/admin/geo-analytics',
	'/api/admin/location-index',
	'/api/admin/navigation',
	'/api/admin/notifications',
	'/api/admin/settings',
	'/api/admin/settings/map-status',
	'/api/admin/twenty-crm/config',
	'/api/admin/clients',
	'/api/admin/clients/advanced-search',
	'/api/admin/clients/dashboard',
	'/api/admin/clients/stats'
];

test.describe('Admin API GETs all reject anonymous', () => {
	for (const path of ADMIN_GET_PROBES) {
		test(`GET ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), `GET ${path}`).toBeLessThan(500);
			expect(resp.status(), `GET ${path}`).toBeGreaterThanOrEqual(400);
		});
	}
});
