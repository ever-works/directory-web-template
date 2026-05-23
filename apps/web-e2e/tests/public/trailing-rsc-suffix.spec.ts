import { test, expect } from '@playwright/test';

// Next.js's RSC prefetch requests append `?_rsc=<hash>` to URLs. If the
// page handler doesn't tolerate this, prefetches 5xx. Spec 027 showed
// this exact pattern in the network logs for the dashboard.

const RSC_TARGETS = [
	'/?_rsc=abc',
	'/about?_rsc=abc',
	'/auth/signin?_rsc=abc',
	'/auth/register?_rsc=abc',
	'/categories?_rsc=abc',
	'/help?_rsc=abc'
];

test.describe('RSC prefetch query tolerance', () => {
	for (const url of RSC_TARGETS) {
		test(`${url} does not 5xx`, async ({ request }) => {
			const resp = await request.get(url);
			expect(resp.status(), `${url}`).toBeLessThan(500);
		});
	}

	test('RSC suffix combined with locale prefix is tolerated', async ({ request }) => {
		const resp = await request.get('/en/about?_rsc=xyz');
		expect(resp.status()).toBeLessThan(500);
	});
});
