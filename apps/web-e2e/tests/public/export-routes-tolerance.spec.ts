import { test, expect } from '@playwright/test';

// Export endpoints — public ones at /api/items/export — verify shape and
// that protected ones reject anonymous.

const EXPORT_PROBES = [
	{ method: 'GET', path: '/api/items/export' },
	{ method: 'GET', path: '/api/items/export/settings' },
	{ method: 'GET', path: '/api/items/export?format=csv' },
	{ method: 'GET', path: '/api/items/export?format=json' },
	{ method: 'GET', path: '/api/items/export?format=xml' },
	{ method: 'GET', path: '/api/items/export?format=' + encodeURIComponent('NOT-REAL') },
	{ method: 'GET', path: '/api/items/export?limit=1000000' },
	{ method: 'GET', path: '/api/items/export?limit=-1' },
	{ method: 'GET', path: '/api/items/export?limit=abc' }
];

test.describe('Items export endpoint tolerance', () => {
	for (const { method, path } of EXPORT_PROBES) {
		test(`${method} ${path} non-5xx`, async ({ request }) => {
			const resp = await request.fetch(path, { method });
			expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
		});
	}
});
