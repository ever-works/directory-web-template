import { test, expect } from '@playwright/test';

// On HTTPS pages, every script/style/image src should be HTTPS or relative —
// never plain http:// (mixed content blocked by browsers).
// We tolerate localhost overrides in dev.

const HTTPS_PROBE = ['/', '/about', '/discover/1'];

test.describe('Mixed-content audit', () => {
	for (const path of HTTPS_PROBE) {
		test(`${path} has no plain http:// asset src`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) {
				test.skip();
				return;
			}
			// Only care if WE are on HTTPS — otherwise nothing to mix.
			if (!page.url().startsWith('https://')) {
				test.skip();
				return;
			}

			const bad = await page.evaluate(() => {
				const collect = (sel: string, attr: string) =>
					Array.from(document.querySelectorAll(sel))
						.map((el) => el.getAttribute(attr) || '')
						.filter((u) => u.startsWith('http://'));
				return {
					scripts: collect('script[src]', 'src'),
					styles: collect('link[rel="stylesheet"][href]', 'href'),
					images: collect('img[src]', 'src')
				};
			});
			expect(bad.scripts, `${path} http:// scripts`).toEqual([]);
			expect(bad.styles, `${path} http:// stylesheets`).toEqual([]);
			expect(bad.images, `${path} http:// images`).toEqual([]);
		});
	}
});
