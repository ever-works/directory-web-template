import { test, expect } from '@playwright/test';

// Trailing slashes — Next.js typically canonicalizes. Either /about and
// /about/ both 200, or one 308s to the other. Never 5xx.

const PROBES = ['/about', '/about/', '/discover/1', '/discover/1/', '/categories', '/categories/'];

test.describe('Trailing slash canonicalization', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
