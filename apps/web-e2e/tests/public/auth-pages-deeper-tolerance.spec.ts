import { test, expect } from '@playwright/test';

// Auth pages exposed to anonymous users. Each must respond non-5xx with
// unusual query parameters and edge inputs.

const AUTH_DEEP_PROBES = [
	'/auth/signin',
	'/auth/signin?callbackUrl=' + encodeURIComponent('/dashboard'),
	'/auth/signin?error=Configuration',
	'/auth/signin?error=AccessDenied',
	'/auth/signin?error=Verification',
	'/auth/signin?error=' + encodeURIComponent('Something Weird'),
	'/auth/signin?callbackUrl=' + encodeURIComponent('http://external.example.com/'),
	'/auth/register',
	'/auth/register?callbackUrl=' + encodeURIComponent('/client/dashboard'),
	'/auth/register?ref=invite',
	'/auth/register?invite_code=abc123',
	'/auth/forgot-password',
	'/auth/forgot-password?email=' + encodeURIComponent('a@example.com'),
	'/auth/new-password',
	'/auth/new-password?token=fake',
	'/auth/new-password?token=' + 'a'.repeat(512),
	'/auth/new-verification',
	'/auth/new-verification?token=fake',
	'/auth/new-verification?token=' + 'a'.repeat(512)
];

test.describe('Auth pages deeper input tolerance', () => {
	for (const path of AUTH_DEEP_PROBES) {
		test(`${path} does not 5xx`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status(), `${path}`).toBeLessThan(500);
		});
	}
});
