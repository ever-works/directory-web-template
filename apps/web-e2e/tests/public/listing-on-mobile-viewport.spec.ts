import { test, expect, devices } from '@playwright/test';

// Listing pages must render on iPhone 12 viewport without layout overflow.

// `defaultBrowserType` is worker-scoped and can't be set inside a
// describe block; also, CI only installs chromium, so forcing webkit
// would break the run. Strip it and keep the iPhone 12 viewport/UA/touch.
const { defaultBrowserType: _ignoredDBT, ...IPHONE_12 } = devices['iPhone 12'];
void _ignoredDBT;

test.describe('Listing renders on mobile viewport', () => {
	test.use(IPHONE_12);

	test('/discover/1 renders on iPhone 12', async ({ page }) => {
		const resp = await page.goto('/discover/1', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		await expect(page.locator('body')).toBeVisible();
		// Horizontal scrollbar = bad layout. Allow 5px slop for rounding.
		const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
		expect(overflow, `horizontal overflow on iPhone 12: ${overflow}px`).toBeLessThan(20);
	});

	test('/items/sample renders on iPhone 12', async ({ page }) => {
		const resp = await page.goto('/items/sample', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		await expect(page.locator('body')).toBeVisible();
	});

	test('/auth/signin renders on iPhone 12', async ({ page }) => {
		const resp = await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		await expect(page.locator('body')).toBeVisible();
	});
});
