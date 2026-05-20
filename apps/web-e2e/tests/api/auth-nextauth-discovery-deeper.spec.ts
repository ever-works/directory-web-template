import { test, expect } from '@playwright/test';

// NextAuth catch-all under /api/auth/[...nextauth]/ exposes several
// discovery endpoints. None should ever 5xx anonymously.

const NEXTAUTH_PROBES = [
	'/api/auth/providers',
	'/api/auth/csrf',
	'/api/auth/session',
	'/api/auth/signin',
	'/api/auth/signout',
	'/api/auth/error',
	'/api/auth/callback/credentials'
];

test.describe('NextAuth discovery endpoints — deeper', () => {
	for (const path of NEXTAUTH_PROBES) {
		test(`GET ${path} non-5xx anonymous`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}

	test('GET /api/auth/session anonymous returns valid JSON shape', async ({ request }) => {
		const resp = await request.get('/api/auth/session');
		expect(resp.status()).toBe(200);
		// NextAuth v5 returns the literal `null` body for unauthenticated
		// sessions (not `{}`). Accept any of: null, {}, { user: null }.
		const text = await resp.text();
		expect(text.length).toBeGreaterThan(0);
		// Must parse — invalid JSON would have thrown.
		const body = JSON.parse(text);
		expect(body === null || typeof body === 'object').toBe(true);
	});

	test('GET /api/auth/csrf returns csrfToken-shaped JSON', async ({ request }) => {
		const resp = await request.get('/api/auth/csrf');
		expect(resp.status()).toBe(200);
		const body = await resp.json().catch(() => null);
		expect(body).toBeTruthy();
		expect(body).toHaveProperty('csrfToken');
		expect(typeof (body as { csrfToken: unknown }).csrfToken).toBe('string');
	});

	test('GET /api/auth/providers returns object', async ({ request }) => {
		const resp = await request.get('/api/auth/providers');
		expect(resp.status()).toBe(200);
		const body = await resp.json().catch(() => null);
		expect(body).toBeTruthy();
		expect(typeof body).toBe('object');
	});
});
