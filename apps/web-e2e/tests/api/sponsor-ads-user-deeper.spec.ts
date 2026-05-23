import { test, expect } from '@playwright/test';

// Sponsor-ads (user-facing) — anonymous must be 4xx.

const SPONSOR_USER_PROBES = [
	{ method: 'GET', path: '/api/sponsor-ads/user' },
	{ method: 'POST', path: '/api/sponsor-ads/user' },
	{ method: 'GET', path: '/api/sponsor-ads/user/stats' },
	{ method: 'GET', path: '/api/sponsor-ads/user/probe-id' },
	{ method: 'PUT', path: '/api/sponsor-ads/user/probe-id' },
	{ method: 'DELETE', path: '/api/sponsor-ads/user/probe-id' },
	{ method: 'POST', path: '/api/sponsor-ads/user/probe-id/cancel' },
	{ method: 'POST', path: '/api/sponsor-ads/user/probe-id/renew' },
	{ method: 'POST', path: '/api/sponsor-ads/checkout' }
];

test.describe('Sponsor-ads user API rejection (deeper)', () => {
	for (const { method, path } of SPONSOR_USER_PROBES) {
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
