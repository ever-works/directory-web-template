import { test, expect } from '@playwright/test';

// next.config.ts ships a `headers()` block that applies a set of security
// headers to every route (X-Content-Type-Options, X-Frame-Options,
// Referrer-Policy, HSTS, CSP). Regressions here are silent but
// security-sensitive — drop this matrix in to catch them.

const PAGES = ['/', '/about', '/auth/signin', '/api/version', '/api/auth/session'];

test.describe('Security headers', () => {
	for (const path of PAGES) {
		test(`${path} has X-Content-Type-Options: nosniff`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status()).toBeLessThan(500);
			const h = resp.headers();
			expect(h['x-content-type-options']).toBe('nosniff');
		});

		test(`${path} has X-Frame-Options: DENY`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.headers()['x-frame-options']).toBe('DENY');
		});

		test(`${path} has Referrer-Policy`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.headers()['referrer-policy']).toBeTruthy();
		});

		test(`${path} has Strict-Transport-Security`, async ({ request }) => {
			const resp = await request.get(path);
			const hsts = resp.headers()['strict-transport-security'];
			expect(hsts).toBeTruthy();
			expect(hsts!.toLowerCase()).toContain('max-age');
		});

		test(`${path} has Content-Security-Policy`, async ({ request }) => {
			const resp = await request.get(path);
			const csp = resp.headers()['content-security-policy'];
			expect(csp).toBeTruthy();
			expect(csp!.toLowerCase()).toContain("default-src 'self'");
		});
	}

	test('powered-by header is suppressed', async ({ request }) => {
		const resp = await request.get('/');
		expect(resp.headers()['x-powered-by']).toBeFalsy();
	});
});
