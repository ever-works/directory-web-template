import { test, expect } from '@playwright/test';

// Confirm response charset declaration on HTML pages. We accept any
// charset but require it to be announced.

const PROBES = ['/', '/about', '/discover/1', '/auth/signin'];

test.describe('HTML pages announce charset', () => {
	for (const path of PROBES) {
		test(`${path} Content-Type includes charset`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status()).toBeLessThan(500);
			if (resp.status() >= 400) {
				test.skip();
				return;
			}
			const ct = (resp.headers()['content-type'] || '').toLowerCase();
			// Either charset is declared in Content-Type, or a <meta charset> is
			// in the document. Servers usually send "text/html; charset=utf-8".
			if (ct.includes('text/html')) {
				const hasCharset = ct.includes('charset=');
				if (!hasCharset) {
					// fallback: check inline meta
					const body = (await resp.text()).toLowerCase();
					expect(body.includes('<meta charset'), `${path} no charset`).toBe(true);
				}
			}
		});
	}
});
