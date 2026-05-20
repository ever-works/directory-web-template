import { test, expect } from '@playwright/test';

// Any Set-Cookie sent by the app should declare HttpOnly + Secure +
// SameSite. We don't strictly enforce HttpOnly on csrf cookies (some
// frameworks need them readable) but session-token cookies MUST be
// HttpOnly.

const PROBES = ['/', '/auth/signin', '/api/auth/session', '/api/auth/csrf'];

test.describe('Set-Cookie hygiene', () => {
	for (const path of PROBES) {
		test(`${path} session-like cookies are HttpOnly`, async ({ request }) => {
			const resp = await request.get(path);
			const setCookies = resp.headersArray()
				.filter((h) => h.name.toLowerCase() === 'set-cookie')
				.map((h) => h.value);
			for (const sc of setCookies) {
				const lower = sc.toLowerCase();
				// session-token / refresh-token MUST be HttpOnly.
				if (lower.includes('session-token') || lower.includes('refresh-token')) {
					expect(lower, `${path} session cookie: ${sc}`).toContain('httponly');
				}
			}
		});

		test(`${path} cookies on https declare Secure`, async ({ request, baseURL }) => {
			if (!baseURL || !baseURL.startsWith('https://')) {
				test.skip();
				return;
			}
			const resp = await request.get(path);
			const setCookies = resp.headersArray()
				.filter((h) => h.name.toLowerCase() === 'set-cookie')
				.map((h) => h.value);
			for (const sc of setCookies) {
				const lower = sc.toLowerCase();
				if (lower.includes('session-token') || lower.includes('refresh-token')) {
					expect(lower, `${path} session cookie missing Secure: ${sc}`).toContain('secure');
				}
			}
		});
	}
});
