import { test, expect } from '@playwright/test';

// /api/cron/* routes are scheduled background jobs. They MUST require a
// cron secret. Anonymous GET/POST must not actually trigger work.
// Acceptable responses: 401, 403, 404. Never 200 with the actual job
// running, and never 5xx.

const CRON_PROBES = [
	{ method: 'GET', path: '/api/cron/subscription-expiration' },
	{ method: 'POST', path: '/api/cron/subscription-expiration' },
	{ method: 'GET', path: '/api/cron/subscription-reminders' },
	{ method: 'POST', path: '/api/cron/subscription-reminders' }
];

test.describe('Cron route security', () => {
	for (const { method, path } of CRON_PROBES) {
		test(`${method} ${path} requires auth`, async ({ request }) => {
			const resp = await request.fetch(path, { method });
			const status = resp.status();
			expect(status, `${method} ${path}`).toBeLessThan(500);
			expect(status, `${method} ${path}`).not.toBe(200);
		});

		test(`${method} ${path} with bogus bearer is rejected`, async ({ request }) => {
			const resp = await request.fetch(path, {
				method,
				headers: { authorization: 'Bearer not-the-real-secret' }
			});
			expect(resp.status()).toBeLessThan(500);
			expect(resp.status()).not.toBe(200);
		});
	}
});
