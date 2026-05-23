import { test, expect } from '@playwright/test';

// Anonymous probes for admin detail endpoints — must reject with 4xx,
// never 5xx, and must NOT leak data.

const ADMIN_DETAIL_PROBES = [
	{ method: 'GET', path: '/api/admin/items/probe-id' },
	{ method: 'PUT', path: '/api/admin/items/probe-id' },
	{ method: 'DELETE', path: '/api/admin/items/probe-id' },
	{ method: 'GET', path: '/api/admin/items/probe-id/history' },
	{ method: 'POST', path: '/api/admin/items/probe-id/review' },
	{ method: 'GET', path: '/api/admin/categories/probe-id' },
	{ method: 'PUT', path: '/api/admin/categories/probe-id' },
	{ method: 'DELETE', path: '/api/admin/categories/probe-id' },
	{ method: 'GET', path: '/api/admin/collections/probe-id' },
	{ method: 'PUT', path: '/api/admin/collections/probe-id' },
	{ method: 'DELETE', path: '/api/admin/collections/probe-id' },
	{ method: 'GET', path: '/api/admin/collections/probe-id/items' },
	{ method: 'POST', path: '/api/admin/collections/probe-id/items' },
	{ method: 'GET', path: '/api/admin/companies/probe-id' },
	{ method: 'GET', path: '/api/admin/comments/probe-id' },
	{ method: 'GET', path: '/api/admin/featured-items/probe-id' },
	{ method: 'GET', path: '/api/admin/reports/probe-id' },
	{ method: 'GET', path: '/api/admin/roles/probe-id' },
	{ method: 'POST', path: '/api/admin/roles/probe-id/permissions' },
	{ method: 'GET', path: '/api/admin/sponsor-ads/probe-id' },
	{ method: 'POST', path: '/api/admin/sponsor-ads/probe-id/approve' },
	{ method: 'POST', path: '/api/admin/sponsor-ads/probe-id/reject' },
	{ method: 'POST', path: '/api/admin/sponsor-ads/probe-id/cancel' },
	{ method: 'GET', path: '/api/admin/tags/probe-id' },
	{ method: 'GET', path: '/api/admin/users/probe-id' },
	{ method: 'GET', path: '/api/admin/notifications/probe-id/read' },
	{ method: 'POST', path: '/api/admin/notifications/probe-id/read' },
	{ method: 'POST', path: '/api/admin/notifications/mark-all-read' },
	{ method: 'GET', path: '/api/admin/clients/probe-id' }
];

test.describe('Admin detail endpoints — anonymous (deeper)', () => {
	for (const { method, path } of ADMIN_DETAIL_PROBES) {
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
