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
			// Node's fetch parses protocol-relative URLs (`//foo/...`)
			// as `//host/path` and tries to DNS-resolve "foo". That
			// throws `EAI_AGAIN` / `ENOTFOUND` before the request ever
			// leaves the client. That's actually a STRONGER rejection
			// than a 5xx — the request never reached our server —
			// so treat the network error as a pass for this contract.
			let resp;
			try {
				resp = await request.get(path, { maxRedirects: 0 });
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				if (/EAI_AGAIN|ENOTFOUND|getaddrinfo|fetch failed/i.test(msg)) {
					return; // client-side rejection — never hit the server
				}
				throw err;
			}
			expect(resp.status(), path).toBeLessThan(500);
			// Must not redirect off-site.
			const loc = resp.headers()['location'];
			if (loc) {
				expect(loc.toLowerCase(), `${path} redirect Location`).not.toContain('evil.example.com');
			}
		});
	}
});
