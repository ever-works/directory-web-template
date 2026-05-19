import { test, expect } from '@playwright/test';

const PROBES = [
	{ method: 'GET', path: '/api/admin/notifications' },
	{ method: 'POST', path: '/api/admin/notifications' },
	{ method: 'POST', path: '/api/admin/notifications/mark-all-read' },
	{ method: 'GET', path: '/api/admin/notifications/probe-id/read' },
	{ method: 'POST', path: '/api/admin/notifications/probe-id/read' },
	{ method: 'PUT', path: '/api/admin/notifications/probe-id/read' }
];

test.describe('Admin notifications deeper', () => {
	for (const { method, path } of PROBES) {
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
