import { test, expect } from '@playwright/test';

// External links with target="_blank" must declare rel="noopener" or
// rel="noreferrer" — required to prevent reverse-tabnabbing.

const PROBES = ['/', '/about', '/discover/1'];

test.describe('External target=_blank links carry rel=noopener', () => {
	for (const path of PROBES) {
		test(`${path} all _blank links carry noopener/noreferrer`, async ({ page }) => {
			const resp = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(resp).toBeTruthy();
			if (resp!.status() >= 400) test.skip();
			const bad = await page.evaluate(() => {
				return Array.from(document.querySelectorAll('a[target="_blank"]'))
					.filter((a) => {
						const rel = (a.getAttribute('rel') || '').toLowerCase();
						return !rel.includes('noopener') && !rel.includes('noreferrer');
					})
					.map((a) => a.getAttribute('href') || '?');
			});
			expect(bad, `${path} _blank links missing rel: ${bad.join(', ')}`).toEqual([]);
		});
	}
});
