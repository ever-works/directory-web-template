import { test, expect } from '@playwright/test';

// No href= or src= using dangerous protocols on key pages.

const DANGEROUS = ['javascript:', 'data:text/html', 'vbscript:', 'file:'];

const PROBES = ['/', '/about', '/discover/1', '/items/sample'];

test.describe('No dangerous protocols on key pages', () => {
	for (const path of PROBES) {
		test(`${path} no javascript:/data:html/vbscript: hrefs`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const bad = await page.evaluate(
				(proto) => {
					const sels = ['a[href]', 'script[src]', 'iframe[src]', 'img[src]'];
					const out: string[] = [];
					for (const sel of sels) {
						for (const el of Array.from(document.querySelectorAll(sel))) {
							const v = (el.getAttribute('href') || el.getAttribute('src') || '').toLowerCase();
							for (const p of proto) {
								if (v.startsWith(p)) out.push(`${sel}: ${v}`);
							}
						}
					}
					return out;
				},
				DANGEROUS
			);
			expect(bad, `${path} dangerous protocols: ${bad.join(' | ')}`).toEqual([]);
		});
	}
});
