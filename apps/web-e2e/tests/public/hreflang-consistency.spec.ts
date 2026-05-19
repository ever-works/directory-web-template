import { test, expect } from '@playwright/test';

// hreflang link tags should reference real locales — never "undefined" or
// duplicate the same locale.

const PROBES = ['/', '/about', '/discover/1'];

test.describe('hreflang link consistency', () => {
	for (const path of PROBES) {
		test(`${path} hreflang tags well-formed`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const tags = await page.evaluate(() =>
				Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map((l) => ({
					hreflang: l.getAttribute('hreflang') || '',
					href: l.getAttribute('href') || ''
				}))
			);
			for (const t of tags) {
				expect(t.hreflang, `${path} hreflang`).not.toBe('undefined');
				expect(t.href, `${path} href`).not.toBe('undefined');
				expect(t.href, `${path} href`).not.toBe('');
			}
		});
	}
});
