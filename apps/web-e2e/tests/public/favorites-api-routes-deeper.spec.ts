import { test, expect } from '@playwright/test';

// /api/favorites — anonymous probes for all verbs.

const PROBES = [
	{ method: 'GET', path: '/api/favorites' },
	{ method: 'POST', path: '/api/favorites' },
	{ method: 'PUT', path: '/api/favorites' },
	{ method: 'DELETE', path: '/api/favorites' },
	{ method: 'POST', path: '/api/favorites/probe-slug' },
	{ method: 'DELETE', path: '/api/favorites/probe-slug' },
	{ method: 'GET', path: '/api/favorites/probe-slug' }
];

test.describe('Favorites API anonymous rejection', () => {
	for (const { method, path } of PROBES) {
		test(`${method} ${path} non-5xx + 4xx-ish for mutating`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'GET' || method === 'DELETE' ? undefined : { probe: true }
			});
			expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
			if (method !== 'GET') {
				expect(resp.status()).toBeGreaterThanOrEqual(400);
			}
		});
	}
});
