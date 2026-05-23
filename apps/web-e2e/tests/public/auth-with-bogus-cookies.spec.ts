import { test, expect } from '@playwright/test';

// Anonymous user with various flavors of bogus auth cookies. None should
// 5xx, none should leak data.

const BOGUS_COOKIES = [
	'__Secure-authjs.session-token=garbage',
	'authjs.session-token=garbage',
	'__Secure-authjs.csrf-token=garbage',
	'next-auth.session-token=garbage',
	'authjs.callback-url=' + encodeURIComponent('http://evil.example.com'),
	'authjs.pkce.code_verifier=garbage'
];

const TARGETS = [
	'/',
	'/auth/signin',
	'/api/auth/session',
	'/api/items.json',
	'/client/dashboard',
	'/admin'
];

test.describe('Bogus auth cookies tolerance', () => {
	for (const cookie of BOGUS_COOKIES) {
		for (const path of TARGETS) {
			test(`GET ${path} with ${cookie.split('=')[0]} non-5xx`, async ({ request }) => {
				const resp = await request.get(path, { headers: { cookie } });
				expect(resp.status(), `${path}+${cookie.split('=')[0]}`).toBeLessThan(500);
			});
		}
	}
});
