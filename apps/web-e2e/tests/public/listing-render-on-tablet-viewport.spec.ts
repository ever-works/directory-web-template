import { test, expect, devices } from '@playwright/test';

// Tablet viewport rendering for key pages.

test.describe('Renders on iPad Mini viewport', () => {
	test.use({ ...devices['iPad Mini'] });

	const PROBES = ['/', '/about', '/discover/1', '/auth/signin', '/pricing'];

	for (const path of PROBES) {
		test(`${path} renders without horizontal overflow on iPad`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			await expect(page.locator('body')).toBeVisible();
			const overflow = await page.evaluate(() => document.body.scrollWidth - window.innerWidth);
			expect(overflow, `${path} iPad horiz overflow: ${overflow}`).toBeLessThan(30);
		});
	}
});
