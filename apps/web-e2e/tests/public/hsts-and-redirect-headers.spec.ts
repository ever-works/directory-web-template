import { test, expect } from '@playwright/test';

// On HTTPS, Strict-Transport-Security should be present. We don't require
// preload, but max-age must be at least a few weeks for any meaningful
// protection.

test.describe('HSTS shape on HTTPS', () => {
	test('/ has HSTS or is on http', async ({ request, baseURL }) => {
		if (!baseURL || !baseURL.startsWith('https://')) {
			test.skip();
			return;
		}
		const resp = await request.get('/');
		expect(resp.status()).toBeLessThan(500);
		const hsts = (resp.headers()['strict-transport-security'] || '').toLowerCase();
		if (!hsts) {
			test.skip();
			return;
		}
		const m = hsts.match(/max-age=(\d+)/);
		if (!m) {
			test.skip();
			return;
		}
		const maxAge = parseInt(m[1], 10);
		// At least 30 days.
		expect(maxAge, `HSTS max-age: ${maxAge}`).toBeGreaterThanOrEqual(60 * 60 * 24 * 30);
	});
});
