import { test, expect } from '@playwright/test';

/**
 * Smoke for `/pricing/success`. This page is the post-checkout
 * landing target for Stripe / LemonSqueezy / Polar / Solidgate. It
 * is a static client component that renders a "submission received"
 * confirmation regardless of query params, so a clean GET should
 * always return non-5xx and a visible body.
 */
test.describe('Public: /pricing/success', () => {
	test('loads without query params', async ({ page }) => {
		const response = await page.goto('/pricing/success', {
			waitUntil: 'domcontentloaded',
		});

		expect(response?.status()).toBeLessThan(500);
		await expect(page.locator('body')).toBeVisible();
	});

	test('loads with arbitrary checkout query params', async ({ page }) => {
		const response = await page.goto(
			'/pricing/success?session_id=cs_test_smoke&provider=stripe',
			{ waitUntil: 'domcontentloaded' },
		);

		expect(response?.status()).toBeLessThan(500);
		await expect(page.locator('body')).toBeVisible();
	});
});
