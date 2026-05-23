import { test, expect } from '@playwright/test';

// CSP `frame-src` allows specific third parties (Stripe, LemonSqueezy
// checkout iframes). Pages that embed these iframes should not crash if
// the third party is blocked / slow / offline.

test.describe('Third-party iframe embed tolerance', () => {
	test('home does not crash when third-party domains are blocked', async ({ browser }) => {
		const ctx = await browser.newContext();
		await ctx.route(/posthog|googletagmanager|stripe|lemonsqueezy|plausible|datafast|jitsu|segment|stats\.g\.doubleclick/i, (route) => {
			route.abort();
		});
		const page = await ctx.newPage();
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
		// Page should still render a heading.
		await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
		await ctx.close();
	});

	test('/pricing renders when Stripe is blocked', async ({ browser }) => {
		const ctx = await browser.newContext();
		await ctx.route(/stripe|js\.stripe\.com/i, (route) => route.abort());
		const page = await ctx.newPage();
		const resp = await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
		await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
		await ctx.close();
	});

	test('/auth/signin renders when reCAPTCHA is blocked', async ({ browser }) => {
		const ctx = await browser.newContext();
		await ctx.route(/recaptcha|google\.com\/recaptcha/i, (route) => route.abort());
		const page = await ctx.newPage();
		const resp = await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp!.status()).toBeLessThan(500);
		await expect(page.locator('#email')).toBeVisible({ timeout: 30_000 });
		await ctx.close();
	});
});
