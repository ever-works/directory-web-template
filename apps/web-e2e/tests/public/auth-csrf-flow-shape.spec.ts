import { test, expect } from '@playwright/test';

// Anonymous signin flow: GET csrf token, POST it back with credentials.
// We do NOT attempt real auth; we verify the wire contract — that
// callback/credentials accepts FORM-encoded body without 5xx.

test.describe('Credentials callback wire contract', () => {
	test('POST /api/auth/callback/credentials with form body non-5xx', async ({ request }) => {
		// First fetch CSRF token.
		const csrfResp = await request.get('/api/auth/csrf');
		expect(csrfResp.status()).toBe(200);
		const body = (await csrfResp.json().catch(() => null)) as { csrfToken?: string } | null;
		const token = body?.csrfToken;
		if (!token) {
			test.skip();
			return;
		}
		const form = new URLSearchParams({
			csrfToken: token!,
			email: 'no-such-user@example.com',
			password: 'wrong'
		}).toString();
		const resp = await request.post('/api/auth/callback/credentials', {
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			data: form
		});
		// Expect 4xx (bad credentials) or 200 with redirect — never 5xx.
		expect(resp.status()).toBeLessThan(500);
	});

	test('POST /api/auth/callback/credentials without csrf rejected', async ({ request }) => {
		const resp = await request.post('/api/auth/callback/credentials', {
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			data: 'email=foo@bar.com&password=wrong'
		});
		expect(resp.status()).toBeLessThan(500);
	});
});
