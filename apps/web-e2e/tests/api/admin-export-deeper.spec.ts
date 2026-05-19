import { test, expect } from '@playwright/test';

const PROBES = [
	{ method: 'GET', path: '/api/admin/items/export?format=csv' },
	{ method: 'GET', path: '/api/admin/items/export?format=json' },
	{ method: 'GET', path: '/api/admin/items/export?format=xml' },
	{ method: 'GET', path: '/api/admin/items/export?format=NOT-REAL' },
	{ method: 'GET', path: '/api/admin/items/export?limit=10' },
	{ method: 'GET', path: '/api/admin/items/export?limit=999999' },
	{ method: 'GET', path: '/api/admin/items/export?limit=-1' },
	{ method: 'GET', path: '/api/admin/items/export/sample' }
];

test.describe('Admin items export deeper rejection', () => {
	for (const { method, path } of PROBES) {
		test(`${method} ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, { method });
			expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});
	}
});
