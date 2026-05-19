import { test, expect } from '@playwright/test';

// Payment / current-user / health endpoints anonymous behaviors. Health
// is allowed to be 200 (probes need it); current-user mirrors the
// NextAuth `/api/auth/session` contract (200 with `null` body for
// anonymous, NOT 4xx).

const PROBES = [
	{ method: 'GET', path: '/api/current-user', expectGated: false },
	{ method: 'GET', path: '/api/health', expectGated: false },
	{ method: 'GET', path: '/api/health/database', expectGated: false },
	{ method: 'POST', path: '/api/payment/account' },
	{ method: 'GET', path: '/api/payment/account' },
	{ method: 'GET', path: '/api/payment/account/probe-userid' },
	{ method: 'GET', path: '/api/payment/probe-subid' },
	{ method: 'GET', path: '/api/platform/activity-feed', expectGated: false }
];

test.describe('Payment / current-user / health (deeper)', () => {
	for (const probe of PROBES) {
		const { method, path } = probe;
		test(`${method} ${path} non-5xx`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				data: method === 'GET' ? undefined : { probe: true }
			});
			expect(resp.status(), `${method} ${path}`).toBeLessThan(500);
			if (probe.expectGated) {
				expect(resp.status(), `${method} ${path}`).toBeGreaterThanOrEqual(400);
			}
		});
	}
});
