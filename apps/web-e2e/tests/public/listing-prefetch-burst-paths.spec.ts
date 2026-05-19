import { test, expect } from '@playwright/test';

// Burst of GET requests across many routes — server tolerates without 5xx.

const PATHS = [
	'/',
	'/about',
	'/discover/1',
	'/discover/2',
	'/categories',
	'/tags',
	'/collections',
	'/comparisons',
	'/pricing',
	'/sponsor',
	'/help',
	'/docs',
	'/auth/signin',
	'/auth/register',
	'/api/version',
	'/api/tenant',
	'/api/items.json',
	'/sitemap.xml',
	'/robots.txt'
];

test.describe('Burst across known routes', () => {
	test('parallel GET burst non-5xx', async ({ request }) => {
		test.setTimeout(60_000);
		const promises = PATHS.flatMap((p) => [request.get(p), request.get(p), request.get(p)]);
		const results = await Promise.all(promises);
		const status5xx = results.map((r) => r.status()).filter((s) => s >= 500);
		expect(status5xx, `5xx among burst: ${status5xx.length}`).toEqual([]);
	});
});
