import { test, expect } from '@playwright/test';

// Admin clients (separate from "users"): the client = end-customer of the
// directory; user = system identity. These endpoints expose customer
// account state and must reject anonymous.

const CLIENT_ENDPOINTS = [
	{ method: 'GET', path: '/api/admin/clients', name: 'list clients' },
	{ method: 'GET', path: '/api/admin/clients/stats', name: 'client stats' },
	{ method: 'GET', path: '/api/admin/clients/dashboard', name: 'client dashboard data' },
	{ method: 'GET', path: '/api/admin/clients/advanced-search', name: 'client advanced search' },
	{ method: 'GET', path: '/api/admin/clients/probe', name: 'client detail' },
	{ method: 'POST', path: '/api/admin/clients/bulk', name: 'bulk op' },
	{ method: 'POST', path: '/api/admin/clients/advanced-search', name: 'advanced search POST' }
];

test.describe('Admin clients API rejects anonymous', () => {
	for (const { method, path, name } of CLIENT_ENDPOINTS) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method !== 'GET' ? { probe: true } : undefined
			});
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});
	}
});

test.describe('Admin notifications rejects anonymous', () => {
	const NOTIF = [
		{ method: 'GET', path: '/api/admin/notifications', name: 'list' },
		{ method: 'POST', path: '/api/admin/notifications/probe/read', name: 'mark read' },
		{ method: 'POST', path: '/api/admin/notifications/mark-all-read', name: 'mark all read' }
	];
	for (const { method, path, name } of NOTIF) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method !== 'GET' ? { probe: true } : undefined
			});
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
		});
	}
});
