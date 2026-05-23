import { test, expect } from '@playwright/test';

// /api/client/* covers the per-user submission workflow. All endpoints
// must reject anonymous (read or write).

const CLIENT_GET_ENDPOINTS = [
	'/api/client/items',
	'/api/client/items/stats',
	'/api/client/items/coordinates',
	'/api/client/dashboard/stats',
	'/api/client/geo-stats',
	'/api/client/items/probe-id',
	'/api/client/items/import/sample'
];

const CLIENT_MUTATING = [
	{ method: 'POST', path: '/api/client/items', name: 'create client item' },
	{ method: 'PATCH', path: '/api/client/items/probe', name: 'patch client item' },
	{ method: 'DELETE', path: '/api/client/items/probe', name: 'delete client item' },
	{ method: 'POST', path: '/api/client/items/probe/restore', name: 'restore item' },
	{ method: 'POST', path: '/api/client/items/import', name: 'import client items' },
	{ method: 'POST', path: '/api/client/items/import/validate', name: 'validate import' }
];

test.describe('Client items GET endpoints reject anonymous', () => {
	for (const path of CLIENT_GET_ENDPOINTS) {
		test(`GET ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.get(path);
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
			expect([400, 401, 403, 404]).toContain(status);
		});
	}
});

test.describe('Client items mutating endpoints reject anonymous', () => {
	for (const { method, path, name } of CLIENT_MUTATING) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method, data: { probe: true } });
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
			expect([400, 401, 403, 404, 405]).toContain(status);
		});
	}
});
