import { test, expect } from '@playwright/test';

// /api/auth/callback/<provider> tolerance — anonymous probes must not 5xx.

const CALLBACK_PROBES = [
	'/api/auth/callback/credentials',
	'/api/auth/callback/github',
	'/api/auth/callback/google',
	'/api/auth/callback/facebook',
	'/api/auth/callback/twitter',
	'/api/auth/callback/linkedin',
	'/api/auth/callback/' + encodeURIComponent('NOT-A-PROVIDER'),
	'/api/auth/callback/'
];

test.describe('NextAuth callback endpoint tolerance', () => {
	for (const path of CALLBACK_PROBES) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});

		test(`POST ${path} non-5xx`, async ({ request }) => {
			const resp = await request.post(path, { data: { probe: true } });
			expect(resp.status(), `POST ${path}`).toBeLessThan(500);
		});
	}
});
