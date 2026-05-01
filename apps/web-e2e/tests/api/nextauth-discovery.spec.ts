import { test, expect } from '@playwright/test';

/**
 * Smoke coverage for the NextAuth catch-all surface served by
 * `apps/web/app/api/auth/[...nextauth]/route.ts`.
 *
 * NextAuth registers a fixed set of public discovery / state endpoints
 * (`providers`, `csrf`, `session`, `_log`) plus signin / signout /
 * callback routes used by the auth UI. They are public — anonymous
 * callers must always get a non-server-error response, regardless of
 * whether the underlying provider is configured.
 *
 * The `change-password` endpoint (a custom helper that lives at
 * `/api/auth/change-password`) is exercised separately in
 * `auth-change-password.spec.ts`.
 *
 * Per the rest of the API smoke layer, we only assert the no-5xx
 * contract — the response shape is provider-dependent and must not
 * couple this template's tests to a specific provider configuration.
 */

const PUBLIC_GET_ENDPOINTS = [
	'/api/auth/providers',
	'/api/auth/csrf',
	'/api/auth/session',
	'/api/auth/signin',
	'/api/auth/signout',
	'/api/auth/error',
] as const;

test.describe('API: NextAuth catch-all discovery surface', () => {
	for (const path of PUBLIC_GET_ENDPOINTS) {
		test(`GET ${path} does not 5xx`, async ({ request }) => {
			const response = await request.get(path);

			expect(response.status()).toBeLessThan(500);
		});
	}

	test('POST /api/auth/signout without a CSRF token does not 5xx', async ({ request }) => {
		// NextAuth requires a valid CSRF token for POST /signout. Without
		// one the framework returns a 4xx (often a 302 redirect to the
		// signout page) — never a 5xx.
		const response = await request.post('/api/auth/signout', {
			data: {},
			maxRedirects: 0,
		});

		expect(response.status()).toBeLessThan(500);
	});

	test('POST /api/auth/callback/credentials with empty body does not 5xx', async ({ request }) => {
		// Hitting the credentials callback with no body should be rejected
		// gracefully (4xx / redirect) — must never 5xx, even when the
		// credentials provider is not configured.
		const response = await request.post('/api/auth/callback/credentials', {
			data: {},
			maxRedirects: 0,
		});

		expect(response.status()).toBeLessThan(500);
	});

	test('GET /api/auth/callback/unknown-provider does not 5xx', async ({ request }) => {
		// Any unknown provider id must be rejected (404 / redirect) and
		// never produce a server error.
		const response = await request.get('/api/auth/callback/__not-a-real-provider__', {
			maxRedirects: 0,
		});

		expect(response.status()).toBeLessThan(500);
	});
});
