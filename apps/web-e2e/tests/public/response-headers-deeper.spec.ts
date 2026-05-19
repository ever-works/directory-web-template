import { test, expect } from '@playwright/test';

// Response header hygiene per common route. We check that:
// - X-Powered-By is not exposed
// - Server header is not too revealing (no version numbers)
// - X-Frame-Options OR CSP frame-ancestors is set on auth pages

const ANYWHERE = ['/', '/about', '/auth/signin', '/discover/1'];

test.describe('Response header hygiene', () => {
	for (const path of ANYWHERE) {
		test(`${path} does not expose X-Powered-By`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status()).toBeLessThan(500);
			const xp = resp.headers()['x-powered-by'];
			// We tolerate "Next.js" but reject any version suffix that leaks the
			// exact version (security through obscurity, ok-fine).
			if (xp) {
				expect(xp).not.toMatch(/\d+\.\d+/);
			}
		});

		test(`${path} server header not over-detailed`, async ({ request }) => {
			const resp = await request.get(path);
			const sv = resp.headers()['server'] || '';
			// Vercel sets `Vercel` which is fine. Apache/2.4.7 (Win64) would be bad.
			expect(sv).not.toMatch(/apache/i);
			expect(sv).not.toMatch(/nginx\/\d/i);
		});
	}

	test('auth pages have frame protection', async ({ request }) => {
		const resp = await request.get('/auth/signin');
		const xfo = (resp.headers()['x-frame-options'] || '').toLowerCase();
		const csp = (resp.headers()['content-security-policy'] || '').toLowerCase();
		const frameAncestors = csp.includes('frame-ancestors');
		// Acceptable: X-Frame-Options or CSP frame-ancestors. Either is fine.
		expect(
			xfo === 'deny' || xfo === 'sameorigin' || frameAncestors,
			`auth/signin needs frame protection. xfo=${xfo}, csp-frame-ancestors=${frameAncestors}`
		).toBeTruthy();
	});
});
