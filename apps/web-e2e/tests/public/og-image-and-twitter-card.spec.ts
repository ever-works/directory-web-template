import { test, expect } from '@playwright/test';

// Open Graph and Twitter Card meta presence per shared route. These drive
// link previews in social channels; missing them is a marketing bug.

const SHARED_PAGES = ['/', '/about', '/discover/1', '/categories', '/tags', '/pricing'];

test.describe('Open Graph and Twitter Card presence', () => {
	for (const path of SHARED_PAGES) {
		test(`${path} has og:title + og:description`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			const og_title = await page.locator('meta[property="og:title"]').first().getAttribute('content').catch(() => null);
			const og_desc = await page.locator('meta[property="og:description"]').first().getAttribute('content').catch(() => null);
			expect(og_title, `${path} og:title`).toBeTruthy();
			expect(og_desc, `${path} og:description`).toBeTruthy();
		});

		test(`${path} has twitter:card`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			const tw_card = await page.locator('meta[name="twitter:card"]').first().getAttribute('content').catch(() => null);
			expect(tw_card, `${path} twitter:card`).toBeTruthy();
		});
	}
});
