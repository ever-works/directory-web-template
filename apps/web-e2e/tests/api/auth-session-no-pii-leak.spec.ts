import { test, expect } from '@playwright/test';

// Anonymous /api/auth/session must NOT leak any PII. Returned body should
// be `{}` or `{ user: null }` or similar — never contain hashes, tokens,
// or user emails.

const FORBIDDEN = ['$2a$', '$2b$', '$2y$', '$argon2', 'jwt:', 'bearer ', 'sk_live_', 'sk_test_'];

test.describe('Anonymous /api/auth/session no PII leak', () => {
	test('GET /api/auth/session body has no hashes/tokens', async ({ request }) => {
		const resp = await request.get('/api/auth/session');
		expect(resp.status()).toBe(200);
		const txt = await resp.text();
		for (const needle of FORBIDDEN) {
			expect(txt.toLowerCase().includes(needle.toLowerCase()), `leaks ${needle}`).toBe(false);
		}
	});

	test('GET /api/auth/csrf body is small', async ({ request }) => {
		const resp = await request.get('/api/auth/csrf');
		expect(resp.status()).toBe(200);
		const txt = await resp.text();
		// csrfToken JSON is always tiny. >2KB would be suspicious.
		expect(txt.length, `csrf body size: ${txt.length}`).toBeLessThan(2048);
	});
});
