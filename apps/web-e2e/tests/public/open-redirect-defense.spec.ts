import { test, expect } from '@playwright/test';

// Auth callbackUrl, redirect query params, and other open-redirect vectors
// must NOT redirect the user to an external host. Either the link is
// ignored or it's normalized to an internal path.

const REDIRECT_PROBES = [
	'/auth/signin?callbackUrl=http://evil.example.com/',
	'/auth/signin?callbackUrl=//evil.example.com/',
	'/auth/signin?callbackUrl=' + encodeURIComponent('https://evil.example.com/'),
	'/auth/signin?callbackUrl=' + encodeURIComponent('javascript:alert(1)'),
	'/auth/signin?callbackUrl=' + encodeURIComponent('data:text/html,abc'),
	'/auth/register?callbackUrl=http://evil.example.com/',
	'/auth/register?callbackUrl=//evil.example.com/'
];

test.describe('Open-redirect defense', () => {
	for (const path of REDIRECT_PROBES) {
		test(`${path} keeps user on this origin`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			// After load (no signin yet), URL host should still be ours.
			const u = new URL(page.url());
			expect(u.hostname).not.toContain('evil.example.com');
		});
	}
});
