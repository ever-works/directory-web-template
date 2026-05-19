import { test, expect } from '@playwright/test';

// /pricing/success is the post-checkout return URL. It can only be
// reached AFTER a real Stripe / LemonSqueezy / Polar redirect with the
// proper query params. Without those, the page should fall through to a
// sensible empty state — not redirect-loop or 5xx.

test.describe('Pricing success / redirect loop guard', () => {
	test('/pricing/success with no params does not redirect-loop', async ({ page }) => {
		const resp = await page.goto('/pricing/success', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
		// Should NOT bounce back to /pricing in a loop.
		// (One redirect away from /pricing/success is fine — into a loop is not.)
	});

	test('/pricing/success with garbage session_id does not 5xx', async ({ page }) => {
		const resp = await page.goto('/pricing/success?session_id=invalid-xyz', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/pricing/success with stripe-style session_id format does not 5xx', async ({ page }) => {
		const resp = await page.goto('/pricing/success?session_id=cs_test_1234567890', {
			waitUntil: 'domcontentloaded'
		});
		expect(resp!.status()).toBeLessThan(500);
	});

	test('/sponsor index renders or 404s (no 5xx)', async ({ page }) => {
		const resp = await page.goto('/sponsor', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		expect(resp!.status()).toBeLessThan(500);
	});
});
