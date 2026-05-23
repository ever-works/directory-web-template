import { test, expect } from '@playwright/test';

// 404 HTML responses should still have text/html content-type and a body
// big enough to render an error page (not a one-liner).

const NOT_FOUND_PROBES = [
	'/this-route-does-not-exist-zzqxw',
	'/items/this-slug-does-not-exist-zzqxw',
	'/categories/this-cat-does-not-exist-zzqxw'
];

test.describe('404 responses have a rendered error page', () => {
	for (const path of NOT_FOUND_PROBES) {
		test(`${path} returns text/html and substantive body`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status()).toBe(404);
			const ct = (resp.headers()['content-type'] || '').toLowerCase();
			expect(ct).toContain('text/html');
			const body = await resp.text();
			expect(body.length, `${path} 404 body length: ${body.length}`).toBeGreaterThan(500);
			// Must NOT be a bare "Not found" plain text.
			expect(body).toContain('<');
		});
	}
});
