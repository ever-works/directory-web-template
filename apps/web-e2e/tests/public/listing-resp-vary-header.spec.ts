import { test, expect } from '@playwright/test';

// Public HTML responses should declare Vary on Accept-Language / Cookie
// where appropriate. We DO NOT enforce; we DO verify it's well-formed.

const PROBES = ['/', '/about', '/discover/1'];

test.describe('Vary header well-formed (advisory)', () => {
	for (const path of PROBES) {
		test(`${path} Vary header parseable if present`, async ({ request }) => {
			const resp = await request.get(path);
			if (resp.status() >= 400) {
				test.skip();
				return;
			}
			const vary = resp.headers()['vary'] || '';
			if (!vary) {
				test.skip();
				return;
			}
			const tokens = vary.split(',').map((s) => s.trim()).filter(Boolean);
			for (const t of tokens) {
				expect(t, `${path} Vary token: ${t}`).toMatch(/^[A-Za-z0-9-]+$/);
			}
		});
	}
});
