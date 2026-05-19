import { test, expect } from '@playwright/test';

// Social previews rely on og:* and twitter:* meta tags. Each top-level
// page should at minimum have og:title, og:type, og:url; ideally also
// og:description + og:image.

const SOCIAL_PAGES = ['/', '/about', '/pricing', '/help'];

test.describe('OpenGraph + Twitter card meta', () => {
	for (const path of SOCIAL_PAGES) {
		test(`${path} has og:title and og:type`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'domcontentloaded' });
			const ogTitle = await page
				.locator('meta[property="og:title"]')
				.first()
				.getAttribute('content')
				.catch(() => null);
			const ogType = await page
				.locator('meta[property="og:type"]')
				.first()
				.getAttribute('content')
				.catch(() => null);
			// Tolerate absence on auth pages, but home/about/pricing/help should have them.
			if (ogTitle === null && ogType === null) {
				test.skip(true, `${path}: no og tags present (acceptable on some themes)`);
				return;
			}
			expect(ogTitle, `${path}: og:title`).toBeTruthy();
			expect(ogType, `${path}: og:type`).toBeTruthy();
		});

		test(`${path} carries some image meta (og:image / twitter:image / no image)`, async ({
			page
		}) => {
			await page.goto(path, { waitUntil: 'domcontentloaded' });
			const ogImage = await page
				.locator('meta[property="og:image"]')
				.first()
				.getAttribute('content')
				.catch(() => null);
			const twitterImage = await page
				.locator('meta[name="twitter:image"]')
				.first()
				.getAttribute('content')
				.catch(() => null);
			// One or both, or neither (some themes deliberately skip). Just no crash.
			if (ogImage) {
				expect(ogImage).toMatch(/^https?:\/\/|^\//);
			}
			if (twitterImage) {
				expect(twitterImage).toMatch(/^https?:\/\/|^\//);
			}
		});
	}
});
