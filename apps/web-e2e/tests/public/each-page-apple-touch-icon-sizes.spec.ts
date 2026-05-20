import { test, expect } from '@playwright/test';

/**
 * If <link rel="apple-touch-icon"> declares a sizes attribute, it must
 * be in the form WxH (e.g. "180x180"). Apple's iOS uses sizes to pick
 * the right icon; a malformed value falls back to the smallest icon
 * available and looks blurry on the home screen.
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing', '/help'];

const SIZES_RE = /^\d+x\d+(\s+\d+x\d+)*$|^any$/;

test.describe('Public HTML: apple-touch-icon sizes attribute', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} apple-touch-icon sizes attribute is WxH if present`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const links = page.locator('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]');
			const count = await links.count();
			if (count === 0) return;
			for (let i = 0; i < count; i++) {
				const sizes = await links.nth(i).getAttribute('sizes');
				if (sizes === null) continue; // sizes attribute is optional
				expect(sizes.trim(), `sizes attr on ${path} link[${i}]`).not.toBe('');
				expect(
					SIZES_RE.test(sizes.trim()),
					`apple-touch-icon sizes="${sizes}" on ${path} should match WxH pattern`,
				).toBe(true);
			}
		});
	}
});
