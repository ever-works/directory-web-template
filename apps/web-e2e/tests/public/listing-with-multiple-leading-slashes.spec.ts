import { test, expect } from '@playwright/test';

// Multiple leading slashes are sometimes used to attempt SSRF / open
// redirect. Server must non-5xx and not treat // as a protocol-relative URL.

const PROBES = [
	'//about',
	'///about',
	'//discover/1',
	'/.//about',
	'/./about',
	'/..//about',
	'/about//',
	'//evil.example.com',
	'///evil.example.com'
];

test.describe('Leading slash variants tolerance', () => {
	for (const path of PROBES) {
		test(`${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path, { maxRedirects: 0 });
			expect(resp.status(), path).toBeLessThan(500);
			// Must not redirect off-site.
			const loc = resp.headers()['location'];
			if (loc) {
				expect(loc.toLowerCase(), `${path} redirect Location`).not.toContain('evil.example.com');
			}
		});
	}
});
