import { test, expect } from '@playwright/test';

// Content-Security-Policy hygiene. We don't mandate it, but if it's there
// it should NOT contain 'unsafe-inline' for script-src without a nonce.

test.describe('CSP shape audit', () => {
	test('/ CSP (if present) does not allow unsafe-inline scripts without nonce', async ({
		request
	}) => {
		const resp = await request.get('/');
		const csp = (resp.headers()['content-security-policy'] || '').toLowerCase();
		if (!csp) {
			test.skip();
			return;
		}
		const m = csp.match(/script-src[^;]+/);
		if (!m) {
			test.skip();
			return;
		}
		const scriptSrc = m[0];
		const allowsUnsafe = scriptSrc.includes("'unsafe-inline'");
		const hasNonce = /nonce-/.test(scriptSrc);
		if (allowsUnsafe) {
			expect(hasNonce, "unsafe-inline must be paired with nonce-").toBe(true);
		}
	});

	test('signin CSP if present forbids unsafe-eval', async ({ request }) => {
		const resp = await request.get('/auth/signin');
		const csp = (resp.headers()['content-security-policy'] || '').toLowerCase();
		if (!csp) {
			test.skip();
			return;
		}
		expect(csp.includes("'unsafe-eval'"), "auth signin CSP should not allow 'unsafe-eval'").toBe(
			false
		);
	});
});
