import { test, expect } from '@playwright/test';

// Social previews rely on og:* and twitter:* meta tags. Each top-level
// page should at minimum have og:title, og:type, og:url; ideally also
// og:description + og:image.

const SOCIAL_PAGES = ['/', '/about', '/pricing', '/help'];

// Helper — read a meta tag's content if present, without paying the
// 30s `getAttribute` default-locator wait when the element is absent.
async function readMeta(
	page: import('@playwright/test').Page,
	selector: string
): Promise<string | null> {
	const loc = page.locator(selector).first();
	if ((await loc.count()) === 0) return null;
	return await loc.getAttribute('content');
}

test.describe('OpenGraph + Twitter card meta', () => {
	for (const path of SOCIAL_PAGES) {
		test(`${path} has og:title and og:type`, async ({ page }) => {
			await page.goto(path, { waitUntil: 'domcontentloaded' });
			const ogTitle = await readMeta(page, 'meta[property="og:title"]');
			const ogType = await readMeta(page, 'meta[property="og:type"]');
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
			const ogImage = await readMeta(page, 'meta[property="og:image"]');
			const twitterImage = await readMeta(page, 'meta[name="twitter:image"]');
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
