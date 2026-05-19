import { test, expect } from '@playwright/test';

// Rate-limit shape on AUTH endpoints: many rapid POSTs to /api/verify-recaptcha
// and /auth/signin should never 5xx; if rate-limiting is in place, return 429.

test.describe('Auth-adjacent rate-limit shape', () => {
	test('20 rapid POSTs to /api/verify-recaptcha non-5xx', async ({ request }) => {
		test.setTimeout(60_000);
		const statuses: number[] = [];
		for (let i = 0; i < 20; i++) {
			const r = await request.post('/api/verify-recaptcha', {
				data: { token: `probe-${i}`, action: 'submit' }
			});
			statuses.push(r.status());
		}
		const over5 = statuses.filter((s) => s >= 500);
		expect(over5, `5xx among rapid verify-recaptcha: ${over5.length}`).toEqual([]);
	});

	test('20 parallel /api/auth/session reads non-5xx', async ({ request }) => {
		const promises = Array.from({ length: 20 }, () => request.get('/api/auth/session'));
		const results = await Promise.all(promises);
		const statuses = results.map((r) => r.status());
		const over5 = statuses.filter((s) => s >= 500);
		expect(over5, `5xx among parallel session reads: ${over5.length}`).toEqual([]);
	});
});
