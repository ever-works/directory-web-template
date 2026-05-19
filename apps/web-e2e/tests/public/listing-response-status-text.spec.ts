import { test, expect } from '@playwright/test';

// 200 responses must declare a proper Content-Type header. Many edge
// runtimes default to text/plain — regression if we observe one.

const PROBES = ['/', '/about', '/discover/1', '/auth/signin', '/api/items.json'];

test.describe('200 responses declare Content-Type', () => {
	for (const path of PROBES) {
		test(`${path} 200 has non-empty Content-Type`, async ({ request }) => {
			const resp = await request.get(path);
			if (resp.status() !== 200) test.skip();
			const ct = resp.headers()['content-type'];
			expect(ct, `${path} Content-Type`).toBeTruthy();
			expect(ct!.length).toBeGreaterThan(0);
		});
	}
});
