import { test, expect } from '@playwright/test';

// Wrong CSRF token on /api/auth/callback/credentials should return a 4xx
// or redirect with error param — never 200 with session set.

test.describe('Credentials callback CSRF guard', () => {
	test('POST credentials with wrong csrf does not set session', async ({ request }) => {
		const resp = await request.post('/api/auth/callback/credentials', {
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			data: 'csrfToken=wrong&email=fake@example.com&password=wrong',
			maxRedirects: 0
		});
		const setCookies = resp.headersArray()
			.filter((h) => h.name.toLowerCase() === 'set-cookie')
			.map((h) => h.value.toLowerCase());
		const sessionSet = setCookies.some(
			(c) => c.includes('session-token') && !c.includes('expires=thu, 01 jan 1970')
		);
		expect(sessionSet, 'wrong-csrf POST should not set session').toBe(false);
		expect(resp.status()).toBeLessThan(500);
	});
});
