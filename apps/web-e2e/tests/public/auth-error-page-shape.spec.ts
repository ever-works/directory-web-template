import { test, expect } from '@playwright/test';

// /api/auth/error returns an error page or JSON. Various error codes
// must non-5xx.

const ERROR_PROBES = [
	'/api/auth/error?error=Configuration',
	'/api/auth/error?error=AccessDenied',
	'/api/auth/error?error=Verification',
	'/api/auth/error?error=Default',
	'/api/auth/error?error=CredentialsSignin',
	'/api/auth/error?error=' + encodeURIComponent('NotARealError'),
	'/api/auth/error?error=' + 'a'.repeat(500),
	'/api/auth/error'
];

test.describe('NextAuth error endpoint tolerance', () => {
	for (const path of ERROR_PROBES) {
		test(`GET ${path} non-5xx`, async ({ request }) => {
			const resp = await request.get(path);
			expect(resp.status(), path).toBeLessThan(500);
		});
	}
});
