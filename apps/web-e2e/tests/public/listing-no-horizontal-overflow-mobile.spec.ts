import { test, expect } from '@playwright/test';

// On a mobile viewport, listing-style pages should not produce horizontal
// scroll. Document scrollWidth should be <= clientWidth + a small slack.

const MOBILE_PAGES = [
	'/',
	'/discover',
	'/categories',
	'/tags',
	'/collections',
	'/about',
	'/pricing',
];

const SLACK_PX = 2;

test.describe('Mobile viewport: no horizontal overflow', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	for (const path of MOBILE_PAGES) {
		test(`${path} has no horizontal scroll on iPhone 12-class viewport`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			expect(response!.status(), path).toBeLessThan(500);
			if (response!.status() >= 400) return;

			const { scrollWidth, clientWidth } = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth,
			}));

			expect(scrollWidth, `${path} scrollWidth (${scrollWidth}) <= clientWidth (${clientWidth}) + slack`).toBeLessThanOrEqual(
				clientWidth + SLACK_PX,
			);
		});
	}
});
