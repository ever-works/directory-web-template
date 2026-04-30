import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for cron entry points used by Vercel cron / external
 * schedulers. Without `CRON_SECRET` (or with a wrong secret) every cron
 * route must surface a structured 4xx — not crash with a 5xx.
 *
 * In development mode some routes intentionally bypass the secret
 * check; in either case the contract is "no 5xx, ever".
 *
 * `/api/cron/sync` is already covered in `method-guards.spec.ts`; this
 * spec adds the remaining cron jobs.
 */
const CRON_ENDPOINTS = [
	'/api/cron/subscription-expiration',
	'/api/cron/subscription-reminders',
] as const;

test.describe('API: Cron job entry points', () => {
	for (const path of CRON_ENDPOINTS) {
		test(`GET ${path} without secret does not 5xx`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});

		test(`GET ${path} with wrong secret does not 5xx`, async ({ request }) => {
			const response = await request.get(path, {
				headers: { authorization: 'Bearer not-the-real-secret' },
			});

			expect(response.status()).toBeLessThan(500);
		});
	}
});
