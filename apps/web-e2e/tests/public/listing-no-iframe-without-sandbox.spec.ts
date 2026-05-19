import { test, expect } from '@playwright/test';

// Iframes embedded in the page must declare sandbox= attribute or be
// from a trusted domain. We can't know "trusted" — we DO flag iframes
// with NO sandbox AND src starting with http.

const PROBES = ['/', '/about', '/discover/1'];

test.describe('Iframe sandbox advisory', () => {
	for (const path of PROBES) {
		test(`${path} third-party iframes carry sandbox`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const bad = await page.evaluate(() => {
				const origin = new URL(window.location.href).origin;
				return Array.from(document.querySelectorAll('iframe'))
					.filter((f) => {
						const src = f.getAttribute('src') || '';
						const sandbox = f.getAttribute('sandbox');
						if (!src.startsWith('http')) return false;
						if (src.startsWith(origin)) return false;
						return sandbox === null;
					})
					.map((f) => f.getAttribute('src') || '?');
			});
			expect(bad, `${path} 3p iframes missing sandbox: ${bad.join(', ')}`).toEqual([]);
		});
	}
});
