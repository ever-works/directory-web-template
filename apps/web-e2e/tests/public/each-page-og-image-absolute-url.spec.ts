import { test, expect } from '@playwright/test';

/**
 * og:image content must be an absolute URL — Facebook, Twitter, LinkedIn,
 * and other consumers reject relative paths. The OpenGraph spec
 * (https://ogp.me) explicitly requires absolute URLs.
 */

const PUBLIC_PAGES = ['/', '/discover', '/categories', '/tags', '/about', '/pricing', '/help'];

const ABSOLUTE_URL_RE = /^https?:\/\/[^\s/]+/i;

test.describe('Public HTML: og:image is an absolute URL', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} og:image content is an absolute URL if present`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			// Probe for existence before reading the attribute —
			// `locator.getAttribute()` waits for the element by default
			// and would time out at 30s on pages that legitimately don't
			// emit og:image.
			const ogLocator = page.locator('meta[property="og:image"]').first();
			if ((await ogLocator.count()) === 0) return;
			const ogImage = await ogLocator.getAttribute('content');
			if (ogImage === null) return;
			const trimmed = ogImage.trim();
			expect(trimmed, `og:image non-empty on ${path}`).not.toBe('');
			expect(
				ABSOLUTE_URL_RE.test(trimmed),
				`og:image "${trimmed}" on ${path} must be absolute (https?://...)`,
			).toBe(true);
		});
	}
});
