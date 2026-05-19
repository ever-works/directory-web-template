import { test, expect } from '@playwright/test';

// Admin tags + items-export endpoints.

const TAGS_GET = [
	'/api/admin/tags',
	'/api/admin/tags/all',
	'/api/admin/tags/probe'
];

const TAGS_MUTATING = [
	{ method: 'POST', path: '/api/admin/tags', name: 'create tag' },
	{ method: 'PATCH', path: '/api/admin/tags/probe', name: 'edit tag' },
	{ method: 'DELETE', path: '/api/admin/tags/probe', name: 'delete tag' }
];

const EXPORT = [
	{ method: 'GET', path: '/api/admin/items/export', name: 'export items' },
	{ method: 'GET', path: '/api/admin/items/export/sample', name: 'export sample' },
	{ method: 'POST', path: '/api/admin/items/import', name: 'import items' },
	{ method: 'POST', path: '/api/admin/items/import/validate', name: 'validate import' }
];

test.describe('Admin tags API rejects anonymous', () => {
	for (const path of TAGS_GET) {
		test(`GET ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
			expect(resp.status()).toBeLessThan(500);
		});
	}
	for (const { method, path, name } of TAGS_MUTATING) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method, data: { probe: true } });
			expect(resp.status()).toBeGreaterThanOrEqual(400);
			expect(resp.status()).toBeLessThan(500);
		});
	}
});

test.describe('Admin items export/import rejects anonymous', () => {
	for (const { method, path, name } of EXPORT) {
		test(`${method} ${path} (${name}) rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'POST' ? { probe: true } : undefined
			});
			const status = resp.status();
			expect(status, `${path}`).toBeGreaterThanOrEqual(400);
			expect(status).toBeLessThan(500);
		});
	}
});
