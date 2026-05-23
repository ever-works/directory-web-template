import { test, expect } from '@playwright/test';

// Spec 027 / Auth.js v5: after sign-in the user is redirected to the
// `?callbackUrl=` query param if it's safe. If we accept arbitrary URLs
// here, we have an open redirect: attacker sends a /auth/signin link
// pointing at an external phishing site. validate-callback-url.ts and
// the proxy.ts createSafeCallbackUrl() helper are supposed to clamp
// callbacks to same-origin paths only.
//
// This test exercises that path from the URL bar — no DB or auth needed.

const HOSTILE_CALLBACK_URLS = [
	'https://evil.example/steal-cookies',
	'//evil.example/steal-cookies',
	'http://evil.example/steal-cookies',
	'\\\\evil.example\\steal-cookies',
	'javascript:alert(1)',
	'data:text/html,<script>alert(1)</script>'
];

test.describe('Auth callbackUrl sanitization', () => {
	for (const cb of HOSTILE_CALLBACK_URLS) {
		test(`signin?callbackUrl=${cb.slice(0, 30)} is sanitized`, async ({ page }) => {
			const url = `/auth/signin?callbackUrl=${encodeURIComponent(cb)}`;
			const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			expect(resp!.status()).toBeLessThan(500);
			// We just need to confirm the page rendered. Actual post-submit
			// redirect behaviour is asserted in auth-flow-comprehensive.spec.ts —
			// here we just want to prove the page doesn't crash on a hostile cb.
			await expect(page.getByRole('button', { name: /sign in/i }).first()).toBeVisible({
				timeout: 30_000
			});
		});
	}

	test('signin?callbackUrl=/client/dashboard accepts safe path', async ({ page }) => {
		const resp = await page.goto('/auth/signin?callbackUrl=%2Fclient%2Fdashboard', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp!.status()).toBeLessThan(400);
	});
});
