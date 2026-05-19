import { test, expect } from '@playwright/test';

// Burst of RSC prefetches against several routes — server tolerates them
// without 5xx.

const ROUTES = ['/', '/about', '/discover/1', '/categories', '/tags', '/pricing'];

test.describe('Concurrent RSC prefetch tolerance', () => {
	test('parallel RSC prefetches across routes non-5xx', async ({ request }) => {
		const promises = ROUTES.flatMap((r) => [
			request.get(r + '?_rsc=abc'),
			request.get(r, { headers: { RSC: '1' } }),
			request.get(r, { headers: { purpose: 'prefetch' } })
		]);
		const results = await Promise.all(promises);
		const over5 = results.map((r) => r.status()).filter((s) => s >= 500);
		expect(over5, `5xx among prefetch burst: ${over5.length}`).toEqual([]);
	});
});
