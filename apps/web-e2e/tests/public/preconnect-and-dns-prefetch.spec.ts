import { test, expect } from '@playwright/test';

// preconnect / dns-prefetch links speed up third-party loads. If we
// declare them, the href should be a real domain — not "undefined".

test.describe('Preconnect / dns-prefetch shape', () => {
	test('/ preconnect hrefs are well-formed', async ({ page }) => {
		const resp = await page.goto('/', { waitUntil: 'domcontentloaded' });
		expect(resp).toBeTruthy();
		if (resp!.status() >= 400) {
			test.skip();
			return;
		}
		const hrefs = await page.evaluate(() =>
			Array.from(document.querySelectorAll('link[rel="preconnect"],link[rel="dns-prefetch"]'))
				.map((el) => el.getAttribute('href') || '')
				.filter((h) => h.length > 0)
		);
		for (const h of hrefs) {
			expect(h, `preconnect href: ${h}`).not.toBe('undefined');
			expect(h, `preconnect href: ${h}`).not.toBe('null');
			// http(s):// or //host
			expect(/^(https?:)?\/\//.test(h) || h.startsWith('/'), `preconnect href shape: ${h}`).toBe(
				true
			);
		}
	});
});
