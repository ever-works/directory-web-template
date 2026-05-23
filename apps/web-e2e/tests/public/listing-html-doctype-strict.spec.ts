import { test, expect } from '@playwright/test';

/**
 * Every public page should serve HTML5 with the exact doctype
 * `<!doctype html>` (case-insensitive). Any other doctype (XHTML 1.0,
 * HTML 4.01, doctype with public/system IDs) puts the browser in a
 * non-standard mode and triggers compatibility quirks.
 */

const PUBLIC_PAGES = [
	'/',
	'/discover',
	'/categories',
	'/tags',
	'/collections',
	'/about',
	'/help',
	'/pricing',
	'/legal',
];

const DOCTYPE_RE = /^\s*<!doctype html\s*>/i;

test.describe('Public HTML: strict HTML5 doctype', () => {
	for (const path of PUBLIC_PAGES) {
		test(`${path} starts with HTML5 doctype`, async ({ page }) => {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response, path).not.toBeNull();
			if (response!.status() >= 400) return;
			const ct = response!.headers()['content-type'] || '';
			if (!ct.includes('text/html')) return;
			const html = await page.content();
			expect(html.slice(0, 200), `doctype on ${path}`).toMatch(DOCTYPE_RE);
		});
	}
});
