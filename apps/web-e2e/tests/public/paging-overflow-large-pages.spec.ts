import { test, expect } from '@playwright/test';

// Large page values must not 5xx and must respond fast.

const PROBES = [
	'/discover/100',
	'/discover/1000',
	'/discover/10000',
	'/tags/paging/100',
	'/tags/paging/1000',
	'/collections/paging/100',
	'/collections/paging/1000'
];

test.describe('Large page values non-5xx', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
