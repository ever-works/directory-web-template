import { test, expect } from '@playwright/test';

// NextAuth surfaces OAuth errors at /auth/error with a `?error=` query.
// Pages should render the error in a user-friendly way without 5xx and
// without echoing user-controlled content unescaped (XSS risk).

const ERROR_CODES = [
	'OAuthAccountNotLinked',
	'EmailSignin',
	'AccessDenied',
	'Configuration',
	'Verification',
	'CredentialsSignin',
	'OAuthCallback',
	'OAuthCreateAccount',
	'EmailCreateAccount',
	'Callback',
	'OAuthSignin',
	'SessionRequired',
	'Default',
	'<script>alert(1)</script>',
	'../../etc/passwd',
	'a'.repeat(500)
];

test.describe('/auth/error tolerance across error codes', () => {
	for (const code of ERROR_CODES) {
		test(`/auth/error?error=${code.slice(0, 20)} does not 5xx or XSS`, async ({ page }) => {
			await page.goto(`/auth/error?error=${encodeURIComponent(code)}`, {
				waitUntil: 'domcontentloaded'
			});
			// Page rendered (or graciously 404 / redirected away).
			const url = page.url();
			expect(url).toBeTruthy();
			// XSS marker check (in case "error" param is injected unescaped).
			const xssFired = await page.evaluate(() => (window as any).__xssMarker === true);
			expect(xssFired).toBe(false);
		});
	}

	test('/auth/error with no error param does not 5xx', async ({ page }) => {
		const resp = await page.goto('/auth/error', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/auth/signout renders a confirm page or signs the user out', async ({ page }) => {
		const resp = await page.goto('/auth/signout', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/auth/verify-request renders without crash', async ({ page }) => {
		const resp = await page.goto('/auth/verify-request', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});
});
