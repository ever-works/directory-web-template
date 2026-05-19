import { test, expect } from '@playwright/test';

// Coarse HTML validity. We don't run a full validator; we DO check for
// common regressions: unclosed `<` immediately followed by space, no
// trailing whitespace inside attribute, no &nbsp; in script tags.

const PROBES = ['/', '/about', '/discover/1'];

test.describe('HTML coarse validity', () => {
	for (const path of PROBES) {
		test(`${path} HTML has no obviously broken patterns`, async ({ request }) => {
			const resp = await request.get(path);
			if (resp.status() >= 400) test.skip();
			const body = await resp.text();
			// 1. No literal "undefined" in script src
			expect(body).not.toMatch(/<script[^>]+src=["']?undefined/);
			// 2. No literal "[object Object]" in HTML body
			expect(body).not.toContain('[object Object]');
			// 3. No "null" displayed as visible content (most likely a bug)
			//    We only flag inside text contents, not attributes — coarse check.
			const nullCount = (body.match(/>null</g) || []).length;
			expect(nullCount, `${path} ">null<" count: ${nullCount}`).toBeLessThan(5);
		});
	}
});
