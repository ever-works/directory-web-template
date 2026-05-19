import { test, expect } from '@playwright/test';

// %2F in path segments should not crash routing.

const PROBES = [
	'/items/foo%2Fbar',
	'/categories/foo%2Fbar',
	'/tags/foo%2Fbar',
	'/items/foo%2Fbar%2Fbaz',
	'/categories/category/a%2Fb',
	'/tags/tag/a%2Fb%2Fc'
];

test.describe('%2F in segment tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
