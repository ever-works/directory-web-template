import { test, expect } from '@playwright/test';

// Anonymous signout flow — GET /api/auth/signout typically returns a
// confirm page. Must non-5xx.

test.describe('Anonymous signout flow shape', () => {
	test('GET /api/auth/signout non-5xx', async ({ request }) => {
		const resp = await request.get('/api/auth/signout');
		expect(resp.status()).toBeLessThan(500);
	});

	test('POST /api/auth/signout without csrf non-5xx', async ({ request }) => {
		const resp = await request.post('/api/auth/signout', {
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			data: ''
		});
		expect(resp.status()).toBeLessThan(500);
	});

	test('POST /api/auth/signout with csrf non-5xx', async ({ request }) => {
		const csrf = await request.get('/api/auth/csrf');
		const body = (await csrf.json().catch(() => null)) as { csrfToken?: string } | null;
		const token = body?.csrfToken;
		if (!token) test.skip();
		const form = new URLSearchParams({ csrfToken: token! }).toString();
		const resp = await request.post('/api/auth/signout', {
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			data: form
		});
		expect(resp.status()).toBeLessThan(500);
	});
});
