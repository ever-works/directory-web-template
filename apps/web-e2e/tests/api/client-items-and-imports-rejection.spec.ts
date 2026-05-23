import { test, expect } from '@playwright/test';

// Client area item endpoints — anonymous must always reject. These are
// the "let users manage their own items" surface.

const CLIENT_ITEM_PROBES = [
	{ method: 'GET', path: '/api/client/items' },
	{ method: 'POST', path: '/api/client/items' },
	{ method: 'GET', path: '/api/client/items/stats' },
	{ method: 'GET', path: '/api/client/items/coordinates' },
	{ method: 'POST', path: '/api/client/items/import' },
	{ method: 'POST', path: '/api/client/items/import/validate' },
	{ method: 'GET', path: '/api/client/items/import/sample' },
	{ method: 'GET', path: '/api/client/items/probe-id' },
	{ method: 'PUT', path: '/api/client/items/probe-id' },
	{ method: 'DELETE', path: '/api/client/items/probe-id' },
	{ method: 'POST', path: '/api/client/items/probe-id/restore' },
	{ method: 'GET', path: '/api/client/dashboard/stats' },
	{ method: 'GET', path: '/api/client/geo-stats' }
];

test.describe('Client items anonymous rejection (deeper)', () => {
	for (const { method, path } of CLIENT_ITEM_PROBES) {
		test(`${method} ${path} rejects anonymous`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'GET' || method === 'DELETE' ? undefined : { probe: true }
			});
			expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
			expect(resp.status()).toBeGreaterThanOrEqual(400);
		});
	}
});
