import { test, expect } from '@playwright/test';

// URL with two ? characters is malformed — server must non-5xx.

const PROBES = [
	'/?a=b?c=d',
	'/about?a=b?',
	'/discover/1??q=hello',
	'/discover/1?q=hello??sort=newest',
	'/auth/signin?callbackUrl=/foo?bar=baz'
];

test.describe('Double question mark tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
