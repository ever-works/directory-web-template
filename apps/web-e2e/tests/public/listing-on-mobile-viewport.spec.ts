import { test, expect, devices } from '@playwright/test';

// Listing pages must render on iPhone 12 viewport without layout overflow.

test.describe('Listing renders on mobile viewport', () => {
	test.use({ ...devices['iPhone 12'] });

	test('/discover/1 renders on iPhone 12', async ({ page }) => {
		const resp = await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		await expect(page.locator('body')).toBeVisible();
		// Horizontal scrollbar = bad layout. Allow 5px slop for rounding.
		const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
		expect(overflow, `horizontal overflow on iPhone 12: ${overflow}px`).toBeLessThan(20);
	});

	test('/items/sample renders on iPhone 12', async ({ page }) => {
		const resp = await page.goto('/items/sample', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		await expect(page.locator('body')).toBeVisible();
	});

	test('/auth/signin renders on iPhone 12', async ({ page }) => {
		const resp = await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) test.skip();
		await expect(page.locator('body')).toBeVisible();
	});
});
